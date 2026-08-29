(()=>{
'use strict';

const target=window.NEON_STEP_MASTERY_QUESTIONS||=([]);
const source='فيديو مرفوع من المستخدم — الاستعداد الأمثل لاختبار STEP مع أ. ياسر آل ثنيان';
const rows=[
  {
    id:'upvid-step-yaser-001',skill:'reading',topic:'vocabulary-context',level:'foundation',
    q:'The word “nocturnal” probably means __________.',
    options:['active at night','active at day','bats','difficult to sleep'],answer:0,
    explain:'The passage says nocturnal animals sleep during the day and wake up when the sun goes down, so nocturnal means active at night.',
    passage:'Most animals sleep at night, but some animals are nocturnal. Nocturnal animals like bats sleep during day. They wake up when the sun goes down.',
    sourceTime:'18:20'
  },
  {
    id:'upvid-step-yaser-002',skill:'reading',topic:'main-idea',level:'practice',
    q:'What could be the possible title of the reading passage?',
    options:['Air Pollution','Different Types of Pollution','Global Warming','Particles, Liquids and Gases'],answer:1,
    explain:'The passage defines pollution and then lists several kinds of pollution, so “Different Types of Pollution” is the broadest title.',
    passage:'Thick black smoke curling out of smokestacks, horrible-tasting chemicals in your drinking water, pesticides in your food — these are examples of pollution. Pollution is any contamination of the environment which causes harm to the environment or the inhabitants of the environment. There are many kinds of pollution, and there are many pollutants. Some obvious kinds of pollution are pollution of the air, soil, and water. Some less obvious, or less salient, kinds of pollution are radioactive, noise, light pollution, and green-house gasses.',
    sourceTime:'20:35'
  },
  {
    id:'upvid-step-yaser-003',skill:'listening',topic:'situation',level:'foundation',
    q:'Where does the conversation probably take place?',
    options:['In a classroom','In a bookstore','In a library','In a manager office'],answer:2,
    explain:'Checking books out and asking how long they may be kept are typical library activities.',
    audio:'MAN: Would you like to check these books out? WOMAN: Yes, please. And, how long can I keep them. MAN: Don’t worry. We’ve got a lot of options.',
    sourceTime:'26:40'
  },
  {
    id:'upvid-step-yaser-004',skill:'grammar',topic:'prepositions',level:'foundation',
    q:'My mother was born __________ November 13, 1982.',
    options:['at','since','in','on'],answer:3,
    explain:'Use “on” with a specific date: on November 13, 1982.',
    sourceTime:'30:50'
  },
  {
    id:'upvid-step-yaser-005',skill:'grammar',topic:'past-simple',level:'foundation',
    q:'When I __________ him, he was sleeping.',
    options:['calling','called','calls','call'],answer:1,
    explain:'The short completed action that happened while he was sleeping takes the past simple: called.',
    sourceTime:'33:00'
  },
  {
    id:'upvid-step-yaser-006',skill:'grammar',topic:'present-perfect',level:'practice',
    q:'We have __________ each other since childhood.',
    options:['know','known','knowing','are known'],answer:1,
    explain:'Present perfect uses have + past participle; the past participle of know is known.',
    sourceTime:'35:40'
  },
  {
    id:'upvid-step-yaser-007',skill:'grammar',topic:'conditionals',level:'practice',
    q:'If I had the money, I __________ the poor.',
    options:['give','gave','would have given','would give'],answer:3,
    explain:'This is a second conditional: if + past simple, then would + base verb.',
    sourceTime:'38:15'
  },
  {
    id:'upvid-step-yaser-008',skill:'analysis',topic:'capitalization',level:'foundation',
    q:'Which sentence is capitalized correctly?',
    options:['do you like German food?','do you like German Food?','Do you like German food?','Do you like german Food?'],answer:2,
    explain:'The first word of the sentence and the nationality adjective German are capitalized; the common noun food is not.',
    sourceTime:'42:45'
  },
  {
    id:'upvid-step-yaser-009',skill:'analysis',topic:'error-analysis',level:'practice',
    q:'Which one of the underlined words is incorrect? Ahmed and Ali are on way to home and their mother is calling them. They has already finished shopping.',
    options:['are','way','their','has'],answer:3,
    explain:'The subject “They” takes “have,” not “has”; therefore the underlined word has is the target error.',
    sourceTime:'45:25'
  },
  {
    id:'upvid-step-yaser-010',skill:'analysis',topic:'questions',level:'foundation',
    q:'Which sentence is put in correct order?',
    options:['Where did john last week go?','Where John did go last week?','Where did go John last week?','Where did John go last week?'],answer:3,
    explain:'After “Where did,” use subject + base verb: Where did John go last week?',
    sourceTime:'48:00'
  }
];

const normalize=value=>String(value||'')
  .normalize('NFKC')
  .toLowerCase()
  .replace(/[“”‘’]/g,"'")
  .replace(/[_\s]+/g,' ')
  .replace(/[^a-z0-9\u0600-\u06ff]+/g,' ')
  .replace(/\s+/g,' ')
  .trim();
const key=item=>normalize(item?.q||item?.question||'');
const ids=new Set(target.map(item=>item?.id).filter(Boolean));
const keys=new Set(target.map(key).filter(Boolean));
const sourceKeys=new Set();
let repeatedInVideo=0;
let skippedAgainstCurrentBank=0;
let added=0;

for(const row of rows){
  const questionKey=key(row);
  if(sourceKeys.has(questionKey)){
    repeatedInVideo++;
    continue;
  }
  sourceKeys.add(questionKey);
  if(ids.has(row.id)||keys.has(questionKey)){
    skippedAgainstCurrentBank++;
    continue;
  }
  target.push({...row,source,sourceType:'uploaded-video'});
  ids.add(row.id);
  keys.add(questionKey);
  added++;
}

window.NEON_STEP_UPLOADED_VIDEO_YASER_20260829_REPORT={
  extractedUnique:rows.length,
  repeatedInVideo,
  skippedAgainstCurrentBank,
  added,
  sourceType:'uploaded-video'
};
})();
