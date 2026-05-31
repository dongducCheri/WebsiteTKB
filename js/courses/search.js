let searchMatches = [];
let searchActiveIndex = -1;

function getMatchScore(c, query) {
  const maHP = c.maHP.toLowerCase();
  const tenHP = c.tenHP.toLowerCase();
  
  if (maHP.startsWith(query)) return 1;
  if (maHP.includes(query))    return 2;
  if (tenHP.startsWith(query)) return 3;
  if (tenHP.includes(query))    return 4;
  
  return Infinity;
}

function getSearchMatches(query, program) {
  if (!query || !state.courseMap) return [];

  const matches = Object.values(state.courseMap)
    .map(c => {
      const hitProg = !program || Object.values(c.classes).some(cl => cl.maQL === program);
      if (!hitProg) return null;
      
      const score = getMatchScore(c, query);
      if (score === Infinity) return null;
      
      return { course: c, score };
    })
    .filter(Boolean);

  // Sort by priority score (ascending), then alphabetically by maHP
  matches.sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score;
    }
    return a.course.maHP.localeCompare(b.course.maHP);
  });

  return matches.slice(0, 40).map(m => m.course);
}

function selectSearchCourse(maHP) {
  if (!maHP || !state.courseMap?.[maHP]) return;
  addChip(maHP);
  const input = document.getElementById('search-input');
  input.value = '';
  closeDropdown();
  input.focus();
}

function updateSearchHighlight() {
  const dropdown = document.getElementById('search-dropdown');
  const items = dropdown.querySelectorAll('.dropdown-item[data-mahp]');
  items.forEach((item, i) => {
    const active = i === searchActiveIndex;
    item.classList.toggle('is-active', active);
    if (active) item.scrollIntoView({ block: 'nearest' });
  });
}

function renderDropdown(query, program) {
  const dropdown = document.getElementById('search-dropdown');

  if (!query) {
    searchMatches = [];
    searchActiveIndex = -1;
    dropdown.hidden = true;
    return;
  }

  searchMatches = getSearchMatches(query, program);

  if (searchMatches.length === 0) {
    searchActiveIndex = -1;
    dropdown.innerHTML = '<div class="dropdown-empty">Không tìm thấy học phần nào.</div>';
    dropdown.hidden = false;
    return;
  }

  searchActiveIndex = 0;

  dropdown.innerHTML = searchMatches.map(c => {
    const picked = state.selectedCourses.has(c.maHP) ? ' is-picked' : '';
    return `<div class="dropdown-item${picked}" data-mahp="${escHtml(c.maHP)}" role="option">
      <span class="dropdown-code">${escHtml(c.maHP)}</span>
      <span class="dropdown-name">${escHtml(c.tenHP)}</span>
    </div>`;
  }).join('');

  dropdown.hidden = false;
  updateSearchHighlight();

  dropdown.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('mousedown', e => {
      e.preventDefault();
      selectSearchCourse(item.dataset.mahp);
    });
  });
}

function closeDropdown() {
  const dropdown = document.getElementById('search-dropdown');
  dropdown.hidden = true;
  searchMatches = [];
  searchActiveIndex = -1;
}

function initSearch() {
  const input    = document.getElementById('search-input');
  const program  = document.getElementById('program-select');
  const dropdown = document.getElementById('search-dropdown');
  let blurCloseTimer = null;

  const refreshDropdown = () => {
    const q = input.value.trim().toLowerCase();
    renderDropdown(q, program.value);
  };

  input.addEventListener('input', refreshDropdown);

  input.addEventListener('focus', () => {
    clearTimeout(blurCloseTimer);
    const q = input.value.trim().toLowerCase();
    if (q) renderDropdown(q, program.value);
  });

  input.addEventListener('blur', () => {
    blurCloseTimer = setTimeout(closeDropdown, 160);
  });

  dropdown.addEventListener('mousedown', e => {
    if (e.target.closest('.dropdown-item')) e.preventDefault();
  });

  input.addEventListener('keydown', e => {
    const q = input.value.trim().toLowerCase();

    if (e.key === 'Escape') {
      closeDropdown();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!q) return;

      if (dropdown.hidden || !searchMatches.length) {
        renderDropdown(q, program.value);
      }
      if (!searchMatches.length) return;

      e.preventDefault();
      if (e.key === 'ArrowDown') {
        searchActiveIndex = (searchActiveIndex + 1) % searchMatches.length;
      } else {
        searchActiveIndex = (searchActiveIndex - 1 + searchMatches.length) % searchMatches.length;
      }
      updateSearchHighlight();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (!dropdown.hidden && searchMatches.length) {
        const idx = searchActiveIndex >= 0 ? searchActiveIndex : 0;
        selectSearchCourse(searchMatches[idx].maHP);
        return;
      }
      const exact = input.value.trim().toUpperCase();
      if (exact && state.courseMap?.[exact]) {
        selectSearchCourse(exact);
      }
    }
  });

  program.addEventListener('change', refreshDropdown);
}
