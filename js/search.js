function renderDropdown(query, program) {
  const dropdown = document.getElementById('search-dropdown');

  if (!query) {
    dropdown.hidden = true;
    return;
  }

  const matches = Object.values(state.courseMap).filter(c => {
    const hitQuery = c.maHP.toLowerCase().includes(query) || c.tenHP.toLowerCase().includes(query);
    const hitProg  = !program || Object.values(c.classes).some(cl => cl.maQL === program);
    return hitQuery && hitProg;
  }).slice(0, 40);

  if (matches.length === 0) {
    dropdown.innerHTML = '<div class="dropdown-empty">Không tìm thấy học phần nào.</div>';
    dropdown.hidden = false;
    return;
  }

  dropdown.innerHTML = matches.map(c => {
    const picked = state.selectedCourses.has(c.maHP) ? ' is-picked' : '';
    return `<div class="dropdown-item${picked}" data-mahp="${escHtml(c.maHP)}">
      <span class="dropdown-code">${escHtml(c.maHP)}</span>
      <span class="dropdown-name">${escHtml(c.tenHP)}</span>
    </div>`;
  }).join('');

  dropdown.hidden = false;

  dropdown.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('mousedown', e => {
      e.preventDefault();
      addChip(item.dataset.mahp);
      document.getElementById('search-input').value = '';
      closeDropdown();
    });
  });
}

function closeDropdown() {
  document.getElementById('search-dropdown').hidden = true;
}

function initSearch() {
  const input    = document.getElementById('search-input');
  const program  = document.getElementById('program-select');

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    renderDropdown(q, program.value);
  });

  input.addEventListener('focus', () => {
    const q = input.value.trim().toLowerCase();
    if (q) renderDropdown(q, program.value);
  });

  input.addEventListener('blur', closeDropdown);

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDropdown();
  });

  program.addEventListener('change', () => {
    const q = input.value.trim().toLowerCase();
    if (q) renderDropdown(q, program.value);
  });
}
