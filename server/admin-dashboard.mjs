import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { requireAdminCapability } from './admin-users.mjs';

const { Pool } = pg;
const databaseUrl = String(process.env.DATABASE_URL || process.env.PROGRESS_DATABASE_URL || '').trim();
const allowedOrigins = String(process.env.FRONTEND_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  max: Math.max(2, Math.min(6, Number(process.env.ADMIN_PG_POOL_MAX || 3))),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
}) : null;

const subjects = ['tahsili-math', 'tahsili-physics', 'tahsili-chemistry', 'tahsili-biology', 'qudurat-verbal', 'qudurat-quant'];
const subjectTitles = {
  'tahsili-math':'رياضيات التحصيلي', 'tahsili-physics':'فيزياء التحصيلي', 'tahsili-chemistry':'كيمياء التحصيلي',
  'tahsili-biology':'أحياء التحصيلي', 'qudurat-verbal':'القدرات اللفظية', 'qudurat-quant':'القدرات الكمية'
};
let schemaPromise;
const baseBankCache = new Map();
let manifestCache = null;
let duplicateCache = { key:'', expiresAt:0, rows:[] };

function json(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Content-Length':Buffer.byteLength(body), 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...headers });
  res.end(body);
}

function corsHeaders(req) {
  const origin = String(req.headers.origin || '');
  if (!origin) return {};
  const sameOrigin = (() => {
    try { return new URL(origin).host === String(req.headers['x-forwarded-host'] || req.headers.host || ''); }
    catch { return false; }
  })();
  if (!sameOrigin && !allowedOrigins.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin':origin, 'Access-Control-Allow-Credentials':'true',
    'Access-Control-Allow-Headers':'Authorization, Content-Type', 'Access-Control-Allow-Methods':'GET, POST, PUT, DELETE, OPTIONS', Vary:'Origin'
  };
}

function cleanText(value, max = 5000) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function cleanId(value, max = 220) { return String(value ?? '').trim().slice(0, max); }
function cleanStatus(value) { return ['published','needs-review','hidden'].includes(value) ? value : 'published'; }
function safeOptions(value) { return Array.isArray(value) ? value.slice(0,8).map(option => cleanText(option,1200)).filter(Boolean) : []; }

async function ensureSchema() {
  if (!pool) throw Object.assign(new Error('DATABASE_NOT_CONFIGURED'), { statusCode:503 });
  if (!schemaPromise) {
    schemaPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS neon_question_reports (
        id BIGSERIAL PRIMARY KEY, firebase_uid TEXT NOT NULL, question_id TEXT NOT NULL DEFAULT '', subject_id TEXT NOT NULL DEFAULT '',
        reason TEXT NOT NULL DEFAULT 'other', note TEXT NOT NULL DEFAULT '', question_text TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'new', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS neon_question_overrides (
        subject_id TEXT NOT NULL, question_id TEXT NOT NULL, patch JSONB NOT NULL DEFAULT '{}'::jsonb, review_status TEXT NOT NULL DEFAULT 'published',
        updated_by TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (subject_id, question_id)
      );
      CREATE TABLE IF NOT EXISTS neon_admin_audit (
        id BIGSERIAL PRIMARY KEY, firebase_uid TEXT NOT NULL, admin_email TEXT NOT NULL DEFAULT '', action TEXT NOT NULL, entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL, before_state JSONB NOT NULL DEFAULT '{}'::jsonb, after_state JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE neon_question_reports ADD COLUMN IF NOT EXISTS admin_note TEXT NOT NULL DEFAULT '';
      ALTER TABLE neon_question_reports ADD COLUMN IF NOT EXISTS resolved_by TEXT NOT NULL DEFAULT '';
      ALTER TABLE neon_question_reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS neon_question_reports_status_idx ON neon_question_reports(status, created_at DESC);
      CREATE INDEX IF NOT EXISTS neon_question_overrides_status_idx ON neon_question_overrides(review_status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS neon_admin_audit_created_idx ON neon_admin_audit(created_at DESC);
      CREATE INDEX IF NOT EXISTS neon_admin_audit_entity_idx ON neon_admin_audit(entity_type, entity_id, created_at DESC);
    `).catch(error => { schemaPromise = null; throw error; });
  }
  return schemaPromise;
}

async function loadJsonFile(relativePath) {
  const candidates = [resolve(process.cwd(),'dist',relativePath), resolve(process.cwd(),'generated',relativePath.replace(/^data\//,''))];
  let lastError;
  for (const path of candidates) {
    try { return JSON.parse(await readFile(path,'utf8')); }
    catch (error) { lastError = error; }
  }
  throw lastError || new Error(`FILE_NOT_FOUND:${relativePath}`);
}
async function loadManifest() { if (!manifestCache) manifestCache = await loadJsonFile('data/exams/manifest.json'); return manifestCache; }
async function loadBaseBank(subjectId) {
  if (!subjects.includes(subjectId)) throw Object.assign(new Error('INVALID_SUBJECT'), { statusCode:400 });
  if (baseBankCache.has(subjectId)) return baseBankCache.get(subjectId);
  const manifest = await loadManifest();
  const rows = await loadJsonFile(`data/exams/${manifest.subjects?.[subjectId]?.file || `${subjectId}.json`}`);
  const normalized = Array.isArray(rows) ? rows : [];
  baseBankCache.set(subjectId, normalized);
  return normalized;
}
async function overrideRows(subjectId='') {
  if (!pool) return [];
  await ensureSchema();
  const result = subjectId ? await pool.query('SELECT * FROM neon_question_overrides WHERE subject_id=$1',[subjectId]) : await pool.query('SELECT * FROM neon_question_overrides');
  return result.rows;
}
function applyOverride(question, override) {
  if (!override) return { ...question, adminStatus:'published', adminEdited:false };
  const patch = override.patch && typeof override.patch === 'object' ? override.patch : {};
  const merged = { ...question, ...patch, adminStatus:cleanStatus(override.review_status), adminEdited:true, adminUpdatedAt:override.updated_at || null };
  if (merged.adminStatus === 'hidden') merged.active = false;
  return merged;
}
async function effectiveBank(subjectId, { includeHidden=false }={}) {
  const base = await loadBaseBank(subjectId);
  const overrides = new Map((await overrideRows(subjectId)).map(row => [String(row.question_id),row]));
  return base.map(question => applyOverride(question, overrides.get(String(question.id)))).filter(question => includeHidden || question.active !== false);
}
async function revisionToken() {
  if (!pool) return 'base';
  await ensureSchema();
  const result = await pool.query(`SELECT COALESCE(MAX(EXTRACT(EPOCH FROM updated_at)::bigint),0)::text AS revision FROM neon_question_overrides`);
  return result.rows[0]?.revision || '0';
}
function publicQuestion(question) { const { adminStatus, adminEdited, adminUpdatedAt, ...safe } = question; return safe; }

async function serveQuestionData(req,res,requestPath) {
  if (req.method !== 'GET') return false;
  if (requestPath === '/data/exams/manifest.json') {
    const base = await loadManifest();
    const revision = await revisionToken();
    if (revision === 'base' || revision === '0') return false;
    const updated = structuredClone(base);
    let total = 0;
    for (const subjectId of subjects) {
      if (!updated.subjects?.[subjectId]) continue;
      const count = (await effectiveBank(subjectId)).length;
      updated.subjects[subjectId].count = count;
      total += count;
    }
    updated.totalQuestions = total;
    updated.adminRevision = revision;
    updated.version = `${base.version || 'questions'}-admin-${revision}`;
    return sendExamJson(req,res,updated);
  }
  const match = requestPath.match(/^\/data\/exams\/([a-z0-9-]+)\.json$/);
  if (!match || !subjects.includes(match[1])) return false;
  const revision = await revisionToken();
  if (revision === 'base' || revision === '0') return false;
  return sendExamJson(req,res,(await effectiveBank(match[1])).map(publicQuestion));
}
function sendExamJson(req,res,payload) {
  const body = JSON.stringify(payload);
  const etag = `\"${createHash('sha1').update(body).digest('hex')}\"`;
  if (req.headers['if-none-match'] === etag) { res.writeHead(304,{ETag:etag,'Cache-Control':'no-cache'}); res.end(); return true; }
  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-cache',ETag:etag,'X-Content-Type-Options':'nosniff'});
  res.end(body); return true;
}

function normalizeArabic(value) {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g,'')
    .replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[٠-٩]/g,digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
}
function trigrams(value) { const text=`  ${normalizeArabic(value)}  `; const set=new Set(); for(let i=0;i<text.length-2;i+=1)set.add(text.slice(i,i+3)); return set; }
function dice(left,right) { const a=trigrams(left),b=trigrams(right); if(!a.size||!b.size)return 0; let common=0; for(const value of a)if(b.has(value))common+=1; return (2*common)/(a.size+b.size); }
function numberSignature(value) { return [...normalizeArabic(value).matchAll(/\d+(?:\.\d+)?/g)].map(match => match[0]).join('|'); }
async function potentialDuplicates() {
  const revision = await revisionToken();
  if (duplicateCache.key === String(revision) && duplicateCache.expiresAt > Date.now()) return duplicateCache.rows;
  const pairs=[];
  for (const subjectId of subjects) {
    const rows = await effectiveBank(subjectId,{includeHidden:true});
    for (let i=0;i<rows.length;i+=1) {
      const left=rows[i],leftText=normalizeArabic(left.q); if(leftText.length<18)continue;
      for (let j=i+1;j<rows.length;j+=1) {
        const right=rows[j],rightText=normalizeArabic(right.q);
        if(Math.min(leftText.length,rightText.length)/Math.max(leftText.length,rightText.length)<0.72)continue;
        if(numberSignature(left.q)!==numberSignature(right.q))continue;
        const similarity=dice(left.q,right.q); if(similarity<0.88)continue;
        pairs.push({subjectId,subjectTitle:subjectTitles[subjectId],similarity:Math.round(similarity*1000)/10,left:{id:String(left.id),q:left.q,status:left.adminStatus||'published'},right:{id:String(right.id),q:right.q,status:right.adminStatus||'published'}});
      }
    }
  }
  pairs.sort((a,b)=>b.similarity-a.similarity);
  duplicateCache={key:String(revision),expiresAt:Date.now()+300000,rows:pairs.slice(0,300)};
  return duplicateCache.rows;
}

async function audit(identity,action,entityType,entityId,beforeState={},afterState={}) {
  await pool.query(`INSERT INTO neon_admin_audit (firebase_uid,admin_email,action,entity_type,entity_id,before_state,after_state) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`,
    [identity.uid,identity.email||'',action,entityType,entityId,JSON.stringify(beforeState||{}),JSON.stringify(afterState||{})]);
}

async function dashboard() {
  await ensureSchema();
  let total=0,active=0,hidden=0,needsReview=0; const bySubject=[];
  for(const subjectId of subjects){
    const rows=await effectiveBank(subjectId,{includeHidden:true}); const visible=rows.filter(row=>row.active!==false).length; const hiddenCount=rows.length-visible; const reviewCount=rows.filter(row=>row.adminStatus==='needs-review').length;
    total+=rows.length; active+=visible; hidden+=hiddenCount; needsReview+=reviewCount;
    bySubject.push({subjectId,title:subjectTitles[subjectId],total:rows.length,active:visible,hidden:hiddenCount,needsReview:reviewCount});
  }
  const reportResult=await pool.query(`SELECT status,COUNT(*)::int AS count FROM neon_question_reports GROUP BY status`);
  const reportCounts=Object.fromEntries(reportResult.rows.map(row=>[row.status,Number(row.count||0)]));
  const duplicates=await potentialDuplicates();
  return {ok:true,totals:{total,active,hidden,needsReview,openReports:Number(reportCounts.new||0)+Number(reportCounts.reviewing||0),potentialDuplicates:duplicates.length},reportCounts,bySubject,revision:await revisionToken()};
}

async function listQuestions(url) {
  const subjectFilter=url.searchParams.get('subject')||'all', search=normalizeArabic(url.searchParams.get('q')||''), status=url.searchParams.get('status')||'all';
  const page=Math.max(1,Math.trunc(Number(url.searchParams.get('page')||1))),pageSize=Math.max(10,Math.min(100,Math.trunc(Number(url.searchParams.get('pageSize')||40))));
  const selected=subjectFilter==='all'?subjects:subjects.includes(subjectFilter)?[subjectFilter]:[];
  const reportResult=await pool.query(`SELECT subject_id,question_id,COUNT(*) FILTER (WHERE status IN ('new','reviewing'))::int AS open_reports FROM neon_question_reports GROUP BY subject_id,question_id`);
  const reportMap=new Map(reportResult.rows.map(row=>[`${row.subject_id}|${row.question_id}`,Number(row.open_reports||0)]));
  let rows=[];
  for(const subjectId of selected)rows.push(...(await effectiveBank(subjectId,{includeHidden:true})).map(question=>({...question,subjectId,subjectTitle:subjectTitles[subjectId]})));
  rows=rows.filter(question=>(status==='all'||(question.adminStatus||'published')===status)&&(!search||normalizeArabic(`${question.id} ${question.q} ${question.category||''} ${question.explain||''}`).includes(search)));
  rows.sort((a,b)=>Number(reportMap.get(`${b.subjectId}|${b.id}`)||0)-Number(reportMap.get(`${a.subjectId}|${a.id}`)||0)||String(a.id).localeCompare(String(b.id)));
  const total=rows.length,start=(page-1)*pageSize;
  const items=rows.slice(start,start+pageSize).map(question=>({...question,openReports:reportMap.get(`${question.subjectId}|${question.id}`)||0}));
  return {ok:true,page,pageSize,total,pages:Math.max(1,Math.ceil(total/pageSize)),items};
}

async function updateQuestion(identity,body) {
  await ensureSchema();
  const subjectId=cleanId(body?.subjectId,100),questionId=cleanId(body?.questionId,220);
  if(!subjects.includes(subjectId)||!questionId)throw Object.assign(new Error('INVALID_QUESTION_ID'),{statusCode:400});
  const base=(await loadBaseBank(subjectId)).find(row=>String(row.id)===questionId); if(!base)throw Object.assign(new Error('QUESTION_NOT_FOUND'),{statusCode:404});
  const existingResult=await pool.query('SELECT * FROM neon_question_overrides WHERE subject_id=$1 AND question_id=$2',[subjectId,questionId]); const existing=existingResult.rows[0]||null; const before=applyOverride(base,existing);
  const incoming=body?.patch&&typeof body.patch==='object'?body.patch:{}; const options=safeOptions(incoming.options??before.options); const answer=Math.trunc(Number(incoming.answer??before.answer));
  if(options.length<2||!Number.isInteger(answer)||answer<0||answer>=options.length)throw Object.assign(new Error('INVALID_ANSWER'),{statusCode:400});
  const patch={q:cleanText(incoming.q??before.q,5000),passage:cleanText(incoming.passage??before.passage,8000),options,answer,explain:cleanText(incoming.explain??before.explain,8000),category:cleanText(incoming.category??before.category,180),level:cleanText(incoming.level??before.level,80),active:incoming.active!==undefined?Boolean(incoming.active):before.active!==false};
  if(!patch.q)throw Object.assign(new Error('QUESTION_TEXT_REQUIRED'),{statusCode:400});
  const reviewStatus=cleanStatus(body?.reviewStatus||existing?.review_status||'published'); if(reviewStatus==='hidden')patch.active=false;
  const result=await pool.query(`INSERT INTO neon_question_overrides (subject_id,question_id,patch,review_status,updated_by,updated_at) VALUES ($1,$2,$3::jsonb,$4,$5,NOW()) ON CONFLICT (subject_id,question_id) DO UPDATE SET patch=EXCLUDED.patch,review_status=EXCLUDED.review_status,updated_by=EXCLUDED.updated_by,updated_at=NOW() RETURNING *`,[subjectId,questionId,JSON.stringify(patch),reviewStatus,identity.uid]);
  const after=applyOverride(base,result.rows[0]); await audit(identity,'question.update','question',`${subjectId}:${questionId}`,before,after); duplicateCache.expiresAt=0;
  return {ok:true,question:{...after,subjectId,subjectTitle:subjectTitles[subjectId]}};
}

async function resetQuestion(identity,body) {
  await ensureSchema(); const subjectId=cleanId(body?.subjectId,100),questionId=cleanId(body?.questionId,220);
  if(!subjects.includes(subjectId)||!questionId)throw Object.assign(new Error('INVALID_QUESTION_ID'),{statusCode:400});
  const base=(await loadBaseBank(subjectId)).find(row=>String(row.id)===questionId); if(!base)throw Object.assign(new Error('QUESTION_NOT_FOUND'),{statusCode:404});
  const existing=await pool.query('SELECT * FROM neon_question_overrides WHERE subject_id=$1 AND question_id=$2',[subjectId,questionId]); const before=applyOverride(base,existing.rows[0]);
  await pool.query('DELETE FROM neon_question_overrides WHERE subject_id=$1 AND question_id=$2',[subjectId,questionId]); await audit(identity,'question.reset','question',`${subjectId}:${questionId}`,before,base); duplicateCache.expiresAt=0;
  return {ok:true,question:{...base,subjectId,subjectTitle:subjectTitles[subjectId],adminStatus:'published',adminEdited:false}};
}

async function listReports(url) {
  await ensureSchema(); const status=url.searchParams.get('status')||'open',subject=url.searchParams.get('subject')||'all'; const page=Math.max(1,Math.trunc(Number(url.searchParams.get('page')||1))),pageSize=Math.max(10,Math.min(100,Math.trunc(Number(url.searchParams.get('pageSize')||40))));
  const conditions=[],values=[]; if(status==='open')conditions.push(`status IN ('new','reviewing')`); else if(status!=='all'){values.push(status);conditions.push(`status=$${values.length}`);} if(subject!=='all'){values.push(subject);conditions.push(`subject_id=$${values.length}`);} const where=conditions.length?`WHERE ${conditions.join(' AND ')}`:'';
  const countResult=await pool.query(`SELECT COUNT(*)::int AS count FROM neon_question_reports ${where}`,values); const queryValues=[...values,pageSize,(page-1)*pageSize];
  const result=await pool.query(`SELECT id,firebase_uid,question_id,subject_id,reason,note,question_text,status,admin_note,resolved_by,resolved_at,created_at FROM neon_question_reports ${where} ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END,created_at DESC LIMIT $${queryValues.length-1} OFFSET $${queryValues.length}`,queryValues);
  const total=Number(countResult.rows[0]?.count||0); return {ok:true,page,pageSize,total,pages:Math.max(1,Math.ceil(total/pageSize)),items:result.rows};
}
async function updateReport(identity,body) {
  await ensureSchema(); const id=Math.trunc(Number(body?.id)),status=['new','reviewing','resolved','dismissed'].includes(body?.status)?body.status:'reviewing'; if(!Number.isInteger(id)||id<=0)throw Object.assign(new Error('INVALID_REPORT_ID'),{statusCode:400});
  const beforeResult=await pool.query('SELECT * FROM neon_question_reports WHERE id=$1',[id]); if(!beforeResult.rows[0])throw Object.assign(new Error('REPORT_NOT_FOUND'),{statusCode:404});
  const resolved=['resolved','dismissed'].includes(status); const result=await pool.query(`UPDATE neon_question_reports SET status=$2,admin_note=$3,resolved_by=$4,resolved_at=CASE WHEN $5 THEN NOW() ELSE NULL END WHERE id=$1 RETURNING *`,[id,status,cleanText(body?.adminNote,1500),identity.uid,resolved]);
  await audit(identity,'report.update','question-report',String(id),beforeResult.rows[0],result.rows[0]); return {ok:true,report:result.rows[0]};
}
async function listAudit(url) { await ensureSchema(); const limit=Math.max(10,Math.min(200,Math.trunc(Number(url.searchParams.get('limit')||80)))); const result=await pool.query(`SELECT id,firebase_uid,admin_email,action,entity_type,entity_id,before_state,after_state,created_at FROM neon_admin_audit ORDER BY created_at DESC LIMIT $1`,[limit]); return {ok:true,items:result.rows}; }

function publicError(error) {
  const code=String(error?.message||'ADMIN_ERROR');
  if(code==='AUTH_REQUIRED'||code.startsWith('INVALID_AUTH')||code==='AUTH_TOKEN_EXPIRED'||code==='UNKNOWN_AUTH_KEY')return {status:401,code,message:'يلزم تسجيل الدخول.'};
  if(code==='ADMIN_REQUIRED')return {status:403,code,message:'هذا الحساب لا يملك صلاحية إدارة المنصة.'};
  if(code==='CAPABILITY_REQUIRED')return {status:403,code,message:'الدور الحالي لا يملك صلاحية تنفيذ هذا الإجراء.'};
  if(code==='ACCOUNT_SUSPENDED')return {status:403,code,message:'الحساب موقوف على مستوى المنصة.'};
  if(code==='DATABASE_NOT_CONFIGURED')return {status:503,code,message:'قاعدة البيانات غير مهيأة للوحة الإدارة.'};
  if(error?.statusCode)return {status:error.statusCode,code,message:'تعذر تنفيذ طلب الإدارة.'};
  return {status:500,code:'ADMIN_ERROR',message:'تعذر تنفيذ طلب الإدارة مؤقتًا.'};
}

function capabilityFor(requestPath,method) {
  if(requestPath==='/api/admin/status'||requestPath==='/api/admin/dashboard')return 'dashboard.read';
  if(requestPath==='/api/admin/questions')return 'content.read';
  if(requestPath==='/api/admin/question'||requestPath==='/api/admin/question/reset')return 'content.manage';
  if(requestPath==='/api/admin/reports'||requestPath==='/api/admin/report')return 'reports.manage';
  if(requestPath==='/api/admin/duplicates')return 'duplicates.read';
  if(requestPath==='/api/admin/audit')return 'audit.read';
  return 'dashboard.read';
}

export async function handleAdminDashboardApi(req,res,requestPath,readJsonBody) {
  try { if(await serveQuestionData(req,res,requestPath))return true; }
  catch(error){ console.error('Question data overlay error:',error?.message||error); return false; }
  if(!requestPath.startsWith('/api/admin'))return false;
  const cors=corsHeaders(req); if(req.method==='OPTIONS'){res.writeHead(204,cors);res.end();return true;}
  try {
    const identity=await requireAdminCapability(req,capabilityFor(requestPath,req.method));
    if(requestPath==='/api/admin/status'&&req.method==='GET'){
      json(res,200,{ok:true,configured:Boolean(pool),authorized:true,role:identity.role,capabilities:identity.capabilities,identity:{uid:identity.uid,email:identity.email,name:identity.name},features:['questions','reports','duplicates','audit','users','rbac','live-overrides']},cors); return true;
    }
    await ensureSchema(); const url=new URL(req.url||'/','http://localhost');
    if(requestPath==='/api/admin/dashboard'&&req.method==='GET')json(res,200,await dashboard(),cors);
    else if(requestPath==='/api/admin/questions'&&req.method==='GET')json(res,200,await listQuestions(url),cors);
    else if(requestPath==='/api/admin/question'&&req.method==='PUT')json(res,200,await updateQuestion(identity,await readJsonBody(req)),cors);
    else if(requestPath==='/api/admin/question/reset'&&req.method==='POST')json(res,200,await resetQuestion(identity,await readJsonBody(req)),cors);
    else if(requestPath==='/api/admin/reports'&&req.method==='GET')json(res,200,await listReports(url),cors);
    else if(requestPath==='/api/admin/report'&&req.method==='PUT')json(res,200,await updateReport(identity,await readJsonBody(req)),cors);
    else if(requestPath==='/api/admin/duplicates'&&req.method==='GET')json(res,200,{ok:true,items:await potentialDuplicates()},cors);
    else if(requestPath==='/api/admin/audit'&&req.method==='GET')json(res,200,await listAudit(url),cors);
    else json(res,405,{error:'METHOD_NOT_ALLOWED'},{...cors,Allow:'GET, POST, PUT, OPTIONS'});
  } catch(error){ const failure=publicError(error); console.error('Admin dashboard API error:',failure.code,error?.message||error); json(res,failure.status,{error:failure.code,message:failure.message},cors); }
  return true;
}

export async function closeAdminDashboardDatabase(){ if(pool)await pool.end().catch(()=>{}); }
