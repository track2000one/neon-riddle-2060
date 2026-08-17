const lastOrders = new Map();

function questionKey(container) {
  const runner = container.closest('#examRunner');
  const text = runner?.querySelector('.exam-question')?.textContent || '';
  return text.replace(/\s+/g, ' ').trim();
}

function rotate(values) {
  if (values.length < 2) return values;
  return [...values.slice(1), values[0]];
}

function randomizeOptions(container) {
  if (!container || container.dataset.optionOrderRandomized === 'true') return;
  const buttons = [...container.querySelectorAll(':scope > [data-answer]')];
  if (buttons.length < 2) return;

  const sourceSignature = buttons.map(button => button.dataset.answer).join(',');
  let randomized = [...buttons];
  for (let index = randomized.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [randomized[index], randomized[swap]] = [randomized[swap], randomized[index]];
  }

  const key = questionKey(container);
  const previousSignature = lastOrders.get(key);
  let signature = randomized.map(button => button.dataset.answer).join(',');

  // Do not leave the answers in their source order, and do not repeat the
  // immediately previous order when the same question is presented again.
  if (signature === sourceSignature || (previousSignature && signature === previousSignature)) {
    randomized = rotate(randomized);
    signature = randomized.map(button => button.dataset.answer).join(',');
  }
  if (previousSignature && signature === previousSignature) {
    randomized = rotate(randomized);
    signature = randomized.map(button => button.dataset.answer).join(',');
  }

  randomized.forEach(button => container.appendChild(button));
  container.dataset.optionOrderRandomized = 'true';
  if (key) lastOrders.set(key, signature);
}

function randomizeCurrentQuestion() {
  const container = document.querySelector('#examRunner .exam-options');
  if (container) randomizeOptions(container);
}

function repairAnswerHighlight(clickedOriginalIndex) {
  const runner = document.getElementById('examRunner');
  const buttons = [...(runner?.querySelectorAll('.exam-options [data-answer]') || [])];
  if (!buttons.length) return;

  // exams.js historically marks the correct answer by DOM position. Once the
  // buttons are randomized, that position still reveals the original answer
  // index. Translate it back to the button carrying that original index.
  const markedCorrect = buttons.find(button => button.classList.contains('correct'));
  if (!markedCorrect) return;
  const originalCorrectIndex = buttons.indexOf(markedCorrect);
  const feedback = runner.querySelector('.exam-feedback');
  const wasCorrect = feedback?.classList.contains('is-correct') === true;

  buttons.forEach(button => button.classList.remove('correct', 'wrong'));
  buttons.find(button => Number(button.dataset.answer) === originalCorrectIndex)?.classList.add('correct');
  if (!wasCorrect) {
    buttons.find(button => Number(button.dataset.answer) === clickedOriginalIndex)?.classList.add('wrong');
  }
}

const runner = document.getElementById('examRunner');
if (runner) {
  const observer = new MutationObserver(() => queueMicrotask(randomizeCurrentQuestion));
  observer.observe(runner, { childList: true, subtree: true });
  randomizeCurrentQuestion();
}

document.addEventListener('click', event => {
  const answer = event.target.closest('[data-answer]');
  if (!answer || !answer.closest('#examRunner')) return;
  const clickedOriginalIndex = Number(answer.dataset.answer);
  setTimeout(() => repairAnswerHighlight(clickedOriginalIndex), 0);
});
