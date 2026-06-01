function renderSearchResults() {
  const container = document.getElementById('results');
  const program = document.getElementById('program-select').value;
  const selectedHPs = [...state.selectedCourses];

  if (selectedHPs.length === 0) {
    container.innerHTML = '<div class="muted">Chưa chọn học phần nào.</div>';
    container.hidden = false;
    return;
  }

  const found = [];
  const notFound = [];

  selectedHPs.forEach(maHP => {
    const course = state.courseMap[maHP];
    if (!course) { notFound.push(maHP); return; }
    const classes = Object.values(course.classes).filter(cl => !program || cl.maQL === program);
    if (classes.length === 0) notFound.push(`${maHP}: ${course.tenHP}`);
    else found.push({ maHP, tenHP: course.tenHP });
  });

  let html = '';

  if (notFound.length > 0) {
    html += `
      <div class="hp-not-found">
        <span class="hp-not-found-label">Các mã học phần không có lớp: </span>
        ${notFound.map(c => `<span class="hp-not-found-item">${escHtml(c)}</span>`).join('. ')}
      </div>`;
  }

  if (found.length > 0) {
    html += `<div class="hp-found-list">`;
    found.forEach(c => {
      const picked = formatSelectedTypesLabel(c.maHP);
      const active = state.editingCourse === c.maHP ||
        (state.timetableCourses.has(c.maHP) && hasSelectedClasses(c.maHP));
      const editing = state.editingCourse === c.maHP;
      html += `
        <span class="hp-item ${active ? 'hp-active' : ''} ${editing ? 'hp-editing' : ''}"
              draggable="true"
              data-mahp="${escHtml(c.maHP)}"
              title="Click để chọn / chọn thêm lớp trên bảng TKB">
          <span class="hp-item-title"><b>${escHtml(c.maHP)}</b>: ${escHtml(c.tenHP)}</span>
          ${picked ? `<span class="hp-picked-note">Đã chọn: ${escHtml(picked)}</span>` : ''}
        </span>`;
    });
    html += `</div>`;

    html += renderAIPanelHTML();
  }

  html += `
    <div class="hp-hint">
      ⚠ Bạn có thể kéo thả các học phần vào bảng thời khóa biểu bên dưới
      <span class="hp-hint-sub">(Hoặc click cũng được)</span>
    </div>
    <div class="slider-control-group">
      <label for="height-slider" class="slider-label">Chiều cao bảng</label>
      <input type="range" id="height-slider" min="30" max="120" value="${state.timetableRowHeight || 60}" step="5" class="height-range-slider">
      <span id="height-val" class="slider-value-balloon">${state.timetableRowHeight || 60}px</span>
    </div>
    <div class="timetable-section">
      <div id="timetable-grid-container"></div>
    </div>`;

  container.innerHTML = html;
  container.hidden = false;

  // Toggle courses on timetable by clicking
  container.querySelectorAll('.hp-item').forEach(el => {
    el.addEventListener('click', () => {
      const maHP = el.dataset.mahp;
      if (state.editingCourse === maHP) {
        stopEditingCourse();
      } else {
        startEditingCourse(maHP);
      }
      refreshHpItemUI();
      renderTimetableGrid();
    });

    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', el.dataset.mahp);
      el.classList.add('hp-dragging');
    });
    el.addEventListener('dragend', () => el.classList.remove('hp-dragging'));
  });

  // Slider updates the CSS variable on .tt-wrap without re-rendering
  const slider   = document.getElementById('height-slider');
  const valLabel = document.getElementById('height-val');
  if (slider) {
    slider.addEventListener('input', e => {
      const val = parseInt(e.target.value);
      state.timetableRowHeight = val;
      if (valLabel) valLabel.textContent = val + 'px';
      const ttWrap = document.querySelector('.tt-wrap');
      if (ttWrap) ttWrap.style.setProperty('--tt-height', (val * 10) + 'px');
    });
  }

  if (typeof refreshTopChipsUI === 'function') refreshTopChipsUI();
  if (found.length > 0 && typeof initAIPanel === 'function') initAIPanel();
  renderTimetableGrid();
}

function updateChipStyles() {
  refreshHpItemUI();
}

function refreshHpItemUI() {
  document.querySelectorAll('.hp-item').forEach(el => {
    const maHP = el.dataset.mahp;
    if (!maHP) return;

    const picked = formatSelectedTypesLabel(maHP);
    let note = el.querySelector('.hp-picked-note');
    if (picked) {
      if (!note) {
        note = document.createElement('span');
        note.className = 'hp-picked-note';
        el.appendChild(note);
      }
      note.textContent = `Đã chọn: ${picked}`;
    } else if (note) {
      note.remove();
    }

    const active = state.editingCourse === maHP ||
      (state.timetableCourses.has(maHP) && hasSelectedClasses(maHP));
    el.classList.toggle('hp-active', active);
    el.classList.toggle('hp-editing', state.editingCourse === maHP);
  });
}

function pickClass(maHP, maLop) {
  const course = state.courseMap?.[maHP];
  const cls = course?.classes?.[maLop];
  setSelectedClass(maHP, cls?.loaiLop || '', maLop);
  onClassPicked(maHP);
  alert(`Đã chọn lớp ${maLop} cho học phần ${maHP}`);
  refreshSelectionUI();
}
