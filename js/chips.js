function addChip(maHP) {
  if (state.selectedCourses.has(maHP)) return;
  state.selectedCourses.add(maHP);
  renderChips();
}

function removeChip(maHP) {
  state.selectedCourses.delete(maHP);
  delete state.selectedClasses[maHP];
  state.timetableCourses.delete(maHP);
  renderChips();
  
  const resultsEl = document.getElementById('results');
  if (resultsEl && !resultsEl.hidden) {
    renderSearchResults();
  }
}

function renderChips() {
  const el = document.getElementById('chip-list');
  if (state.selectedCourses.size === 0) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = [...state.selectedCourses].map(maHP => {
    const course = state.courseMap?.[maHP];
    const label  = course ? `${escHtml(maHP)} - ${escHtml(course.tenHP)}` : escHtml(maHP);
    return `<span class="chip">${label} <span class="chip-x" data-mahp="${escHtml(maHP)}">✕</span></span>`;
  }).join('');

  el.querySelectorAll('.chip-x').forEach(btn => {
    btn.addEventListener('click', () => removeChip(btn.dataset.mahp));
  });
}
