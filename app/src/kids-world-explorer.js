import './kids-world-explorer.css';

const CONTINENTS = [
  {
    id: 'north-america',
    name: 'أمريكا الشمالية',
    icon: '🌎',
    countries: 'كندا • الولايات المتحدة • المكسيك',
    fact: 'تقع شمال أمريكا الجنوبية، وبين المحيطين الأطلسي والهادئ.'
  },
  {
    id: 'south-america',
    name: 'أمريكا الجنوبية',
    icon: '🦜',
    countries: 'البرازيل • الأرجنتين • تشيلي • بيرو',
    fact: 'تضم غابات الأمازون وتمتد جنوب أمريكا الشمالية.'
  },
  {
    id: 'europe',
    name: 'أوروبا',
    icon: '🏰',
    countries: 'فرنسا • إيطاليا • إسبانيا • ألمانيا',
    fact: 'تقع شمال أفريقيا وغرب آسيا، وتضم دولًا كثيرة متقاربة.'
  },
  {
    id: 'africa',
    name: 'أفريقيا',
    icon: '🦒',
    countries: 'المغرب • كينيا • نيجيريا • جنوب أفريقيا',
    fact: 'يمر بها خط الاستواء وتضم الصحراء الكبرى.'
  },
  {
    id: 'asia',
    name: 'آسيا',
    icon: '🐼',
    countries: 'السعودية • اليابان • الهند • الصين',
    fact: 'أكبر قارات العالم مساحةً، وتوجد فيها المملكة العربية السعودية.'
  },
  {
    id: 'oceania',
    name: 'أوقيانوسيا',
    icon: '🦘',
    countries: 'أستراليا • نيوزيلندا • فيجي',
    fact: 'منطقة واسعة من الجزر في المحيط الهادئ، وتشمل أستراليا ونيوزيلندا.'
  },
  {
    id: 'antarctica',
    name: 'القارة القطبية الجنوبية',
    icon: '🐧',
    countries: 'لا توجد فيها دول مستقلة',
    fact: 'أبرد قارات العالم، وتحيط بالقطب الجنوبي وتغطيها طبقات جليدية واسعة.'
  }
];

const QUESTIONS = [
  {
    prompt: 'في أي قارة تقع المملكة العربية السعودية؟',
    choices: ['آسيا', 'أفريقيا', 'أوروبا', 'أمريكا الجنوبية'],
    answer: 0,
    explain: 'تقع المملكة العربية السعودية في جنوب غرب قارة آسيا.',
    visual: '🇸🇦'
  },
  {
    prompt: 'في أي قارة يقع المغرب؟',
    choices: ['أفريقيا', 'أوروبا', 'آسيا', 'أمريكا الشمالية'],
    answer: 0,
    explain: 'يقع المغرب في شمال غرب قارة أفريقيا.',
    visual: '🇲🇦'
  },
  {
    prompt: 'البرازيل دولة كبيرة في أي قارة؟',
    choices: ['أمريكا الجنوبية', 'أمريكا الشمالية', 'أوروبا', 'أفريقيا'],
    answer: 0,
    explain: 'تقع البرازيل في قارة أمريكا الجنوبية.',
    visual: '🇧🇷'
  },
  {
    prompt: 'فرنسا تقع في أي قارة؟',
    choices: ['أوروبا', 'آسيا', 'أفريقيا', 'أوقيانوسيا'],
    answer: 0,
    explain: 'تقع فرنسا في قارة أوروبا.',
    visual: '🇫🇷'
  },
  {
    prompt: 'كندا تقع في...',
    choices: ['أمريكا الشمالية', 'أمريكا الجنوبية', 'أفريقيا', 'آسيا'],
    answer: 0,
    explain: 'تقع كندا في قارة أمريكا الشمالية.',
    visual: '🇨🇦'
  },
  {
    prompt: 'أستراليا تنتمي إلى منطقة...',
    choices: ['أوقيانوسيا', 'أوروبا', 'أفريقيا', 'أمريكا الجنوبية'],
    answer: 0,
    explain: 'أستراليا أكبر دولة في منطقة أوقيانوسيا.',
    visual: '🇦🇺'
  },
  {
    prompt: 'ما عاصمة المملكة العربية السعودية؟',
    choices: ['الرياض', 'جدة', 'الدمام', 'أبها'],
    answer: 0,
    explain: 'الرياض هي عاصمة المملكة العربية السعودية.',
    visual: '🏙️🇸🇦'
  },
  {
    prompt: 'ما عاصمة اليابان؟',
    choices: ['طوكيو', 'سيول', 'بكين', 'بانكوك'],
    answer: 0,
    explain: 'طوكيو هي عاصمة اليابان.',
    visual: '🗼🇯🇵'
  },
  {
    prompt: 'ما عاصمة فرنسا؟',
    choices: ['باريس', 'روما', 'مدريد', 'برلين'],
    answer: 0,
    explain: 'باريس هي عاصمة فرنسا.',
    visual: '🗼🇫🇷'
  },
  {
    prompt: 'هذا العلم لأي دولة؟',
    choices: ['اليابان', 'الصين', 'كوريا الجنوبية', 'تايلاند'],
    answer: 0,
    explain: 'العلم ذو الدائرة الحمراء على الخلفية البيضاء هو علم اليابان.',
    visual: '🇯🇵'
  },
  {
    prompt: 'هذا العلم لأي دولة؟',
    choices: ['السعودية', 'الإمارات', 'مصر', 'المغرب'],
    answer: 0,
    explain: 'هذا علم المملكة العربية السعودية.',
    visual: '🇸🇦'
  },
  {
    prompt: 'أي دولة من الآتي تقع في أفريقيا؟',
    choices: ['كينيا', 'الهند', 'إيطاليا', 'المكسيك'],
    answer: 0,
    explain: 'تقع كينيا في شرق قارة أفريقيا.',
    visual: '🌍🦒'
  }
];

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function randomizeQuestion(item) {
  const mixedChoices = shuffle(item.choices.map((choice, index) => ({ choice, correct: index === item.answer })));
  return {
    ...item,
    choices: mixedChoices.map(entry => entry.choice),
    answer: mixedChoices.findIndex(entry => entry.correct)
  };
}

function runtimeShell(game) {
  return `
    <section class="kids-game-runtime world-runtime" style="--game-a:${game.colors[0]};--game-b:${game.colors[1]}">
      <header class="runtime-header">
        <div class="runtime-game-id"><span>${game.icon}</span><div><small>${game.subject}</small><h2>${game.ar}</h2><b lang="en">${game.en}</b></div></div>
        <div class="runtime-score"><span>النتيجة</span><strong id="runtimeScore">0</strong></div>
      </header>
      <div class="runtime-progress"><div><span id="runtimeStep">استكشف القارات</span><b id="runtimePercent">0%</b></div><div class="progress-track"><i id="runtimeProgressBar"></i></div></div>
      <div id="runtimeStage" class="runtime-stage"></div>
    </section>`;
}

export function launchWorldExplorer({ game, mount, onProgress }) {
  let destroyed = false;
  let score = 0;
  const visited = new Set();

  mount.classList.add('game-active');
  mount.innerHTML = runtimeShell(game);

  const stage = mount.querySelector('#runtimeStage');
  const scoreNode = mount.querySelector('#runtimeScore');
  const stepNode = mount.querySelector('#runtimeStep');
  const percentNode = mount.querySelector('#runtimePercent');
  const barNode = mount.querySelector('#runtimeProgressBar');

  const setProgress = (percent, label, currentScore = score, total = QUESTIONS.length, completed = false) => {
    const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
    barNode.style.width = `${safePercent}%`;
    percentNode.textContent = `${safePercent}%`;
    stepNode.textContent = label;
    scoreNode.textContent = Number(currentScore).toLocaleString('ar-SA');
    onProgress?.({ percent: safePercent, score: currentScore, total, completed });
  };

  const renderComplete = () => {
    const ratio = score / QUESTIONS.length;
    const stars = ratio >= 0.85 ? '⭐⭐⭐' : ratio >= 0.55 ? '⭐⭐' : '⭐';
    setProgress(100, 'اكتملت رحلة العالم', score, QUESTIONS.length, true);
    stage.innerHTML = `
      <div class="runtime-complete world-complete">
        <div class="complete-burst">🌍</div>
        <span class="complete-stars">${stars}</span>
        <h3>رائع يا مستكشف العالم!</h3>
        <p>أجبت إجابة صحيحة عن ${score.toLocaleString('ar-SA')} من ${QUESTIONS.length.toLocaleString('ar-SA')}، وأصبحت تعرف أكثر عن القارات والدول والأعلام والعواصم.</p>
        <div class="world-badges" aria-label="شارات الإنجاز"><span>🧭 مستكشف القارات</span><span>🏳️ خبير الأعلام</span><span>🏙️ صديق العواصم</span></div>
        <div class="complete-actions"><button type="button" data-world-restart>جولة جديدة</button><button type="button" data-runtime-finish>العودة إلى الألعاب</button></div>
      </div>`;
    stage.querySelector('[data-world-restart]')?.addEventListener('click', () => {
      score = 0;
      visited.clear();
      renderMap();
    });
    stage.querySelector('[data-runtime-finish]')?.addEventListener('click', () => document.querySelector('.modal-close')?.click());
  };

  const runQuiz = () => {
    const questions = shuffle(QUESTIONS).map(randomizeQuestion);
    score = 0;
    let index = 0;

    const renderQuestion = () => {
      if (destroyed) return;
      const item = questions[index];
      const percent = 35 + Math.round((index / questions.length) * 65);
      setProgress(percent, `تحدي الدول ${index + 1} من ${questions.length}`, score, questions.length);
      stage.innerHTML = `
        <div class="runtime-question-card world-question-card">
          <div class="runtime-visual">${item.visual}</div>
          <span class="runtime-kicker">دول • قارات • أعلام • عواصم</span>
          <h3>${item.prompt}</h3>
          <div class="runtime-options">${item.choices.map((choice, choiceIndex) => `<button type="button" data-world-answer="${choiceIndex}">${choice}</button>`).join('')}</div>
          <div class="runtime-feedback" aria-live="polite"></div>
          <p class="world-question-map">تذكّر موقع القارة الذي شاهدته في الخريطة التعليمية.</p>
          <button class="runtime-next" type="button" hidden>التالي</button>
        </div>`;

      const options = [...stage.querySelectorAll('[data-world-answer]')];
      const feedback = stage.querySelector('.runtime-feedback');
      const next = stage.querySelector('.runtime-next');
      let answered = false;

      options.forEach(button => button.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const selected = Number(button.dataset.worldAnswer);
        const correct = selected === item.answer;
        if (correct) score += 1;
        options.forEach((candidate, candidateIndex) => {
          candidate.disabled = true;
          if (candidateIndex === item.answer) candidate.classList.add('correct');
          else if (candidate === button) candidate.classList.add('wrong');
        });
        feedback.className = `runtime-feedback ${correct ? 'success' : 'error'}`;
        feedback.textContent = `${correct ? '✓ ممتاز! ' : 'قريب! '}${item.explain}`;
        next.hidden = false;
        setProgress(35 + Math.round(((index + 1) / questions.length) * 65), `تحدي الدول ${index + 1} من ${questions.length}`, score, questions.length);
      }));

      next.addEventListener('click', () => {
        index += 1;
        if (index >= questions.length) renderComplete();
        else renderQuestion();
      });
    };

    renderQuestion();
  };

  function renderMap() {
    if (destroyed) return;
    const exploredPercent = Math.round((visited.size / CONTINENTS.length) * 35);
    setProgress(exploredPercent, 'استكشف القارات', 0, QUESTIONS.length);
    stage.innerHTML = `
      <section class="world-explorer" aria-labelledby="worldExploreTitle">
        <div class="world-explorer-intro">
          <span class="runtime-kicker">المرحلة الأولى • خريطة القارات</span>
          <h3 id="worldExploreTitle">اكتشف أين تقع قارات العالم</h3>
          <p>اضغط على القارات وتعرّف على أمثلة من دولها. استكشف أربع قارات على الأقل لفتح تحدي الدول.</p>
          <span class="world-map-note">خريطة تعليمية مبسطة للمواقع النسبية — ليست مرسومة بمقياس جغرافي دقيق.</span>
        </div>
        <div class="world-map-board" role="group" aria-label="خريطة تعليمية مبسطة للقارات">
          ${CONTINENTS.map(continent => `
            <button type="button" class="continent-chip ${visited.has(continent.id) ? 'visited' : ''}" data-continent="${continent.id}" aria-pressed="${visited.has(continent.id)}">
              <span>${continent.icon}</span>${continent.name}<small>${visited.has(continent.id) ? 'تم الاستكشاف ✓' : 'اضغط للاستكشاف'}</small>
            </button>`).join('')}
        </div>
        <div class="world-info-card" id="worldInfoCard" aria-live="polite">
          <h4>🧭 اختر قارة من الخريطة</h4>
          <p>سنخبرك بأمثلة من دولها ومعلومة جغرافية قصيرة عنها.</p>
        </div>
        <div class="world-explorer-actions">
          <span class="world-explorer-count">استكشفت <b id="worldVisitedCount">${visited.size.toLocaleString('ar-SA')}</b> من ${CONTINENTS.length.toLocaleString('ar-SA')} قارات</span>
          <button type="button" data-start-world-quiz ${visited.size < 4 ? 'disabled' : ''}>ابدأ تحدي الدول والأعلام ←</button>
        </div>
      </section>`;

    const info = stage.querySelector('#worldInfoCard');
    const count = stage.querySelector('#worldVisitedCount');
    const quizButton = stage.querySelector('[data-start-world-quiz]');

    stage.querySelectorAll('[data-continent]').forEach(button => button.addEventListener('click', () => {
      const continent = CONTINENTS.find(item => item.id === button.dataset.continent);
      if (!continent) return;
      visited.add(continent.id);
      button.classList.add('visited');
      button.setAttribute('aria-pressed', 'true');
      button.querySelector('small').textContent = 'تم الاستكشاف ✓';
      count.textContent = visited.size.toLocaleString('ar-SA');
      info.innerHTML = `<h4>${continent.icon} ${continent.name}</h4><p><b>أمثلة:</b> ${continent.countries}</p><p>${continent.fact}</p>`;
      quizButton.disabled = visited.size < 4;
      setProgress(Math.round((visited.size / CONTINENTS.length) * 35), `استكشفت ${visited.size} من ${CONTINENTS.length} قارات`, 0, QUESTIONS.length);
    }));

    quizButton.addEventListener('click', runQuiz);
  }

  renderMap();

  return () => {
    destroyed = true;
    mount.classList.remove('game-active');
  };
}
