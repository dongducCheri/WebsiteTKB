function addChip(maHP) {
  if (state.selectedCourses.has(maHP)) return;
  state.selectedCourses.add(maHP);
  renderChips();
}

function removeChip(maHP) {
  state.selectedCourses.delete(maHP);
  clearSelectedClasses(maHP);
  state.timetableCourses.delete(maHP);
  if (state.editingCourse === maHP) state.editingCourse = null;
  renderChips();
  
  const resultsEl = document.getElementById('results');
  if (resultsEl && !resultsEl.hidden) {
    renderSearchResults();
  }
}

function renderChips() {
  const el = document.getElementById('chip-list');
  if (!el) return;

  if (state.selectedCourses.size === 0) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = [...state.selectedCourses].map(maHP => {
    const course = state.courseMap?.[maHP];
    const title = course
      ? `<span class="chip-title">${escHtml(maHP)}: ${escHtml(course.tenHP)}</span>`
      : `<span class="chip-title">${escHtml(maHP)}</span>`;

    return `<span class="chip" data-mahp="${escHtml(maHP)}">${title}<span class="chip-x" data-mahp="${escHtml(maHP)}">✕</span></span>`;
  }).join('');

  el.querySelectorAll('.chip-x').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      removeChip(btn.dataset.mahp);
    });
  });
}

function refreshTopChipsUI() {
  renderChips();
}
