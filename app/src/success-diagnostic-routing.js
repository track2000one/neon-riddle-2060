function profileForCurrentUser() {
  const uid = window.NEON_AUTH_SESSION?.user?.uid;
  if (!uid) return null;
  try {
    return JSON.parse(localStorage.getItem(`neonStudentGoalV1:${uid}`) || 'null');
  } catch { return null; }
}

document.addEventListener('click', event => {
  const task = event.target.closest?.('[data-plan-task="diagnostic"]');
  if (!task) return;
  const profile = profileForCurrentUser();
  const track = profile?.examTrack;
  if (track === 'tahsili' || track === 'qudurat') {
    event.preventDefault();
    location.assign(`/exams?diagnostic=${track}`);
  } else if (track === 'step') {
    event.preventDefault();
    location.assign('/step#diagnostic');
  }
});
