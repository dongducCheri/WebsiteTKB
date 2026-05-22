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
      const active = state.timetableCourses.has(c.maHP);
      html += `
        <span class="hp-item ${active ? 'hp-active' : ''}"
              draggable="true"
              data-mahp="${escHtml(c.maHP)}"
              title="Click hoặc kéo thả vào bảng TKB">
          <b>${escHtml(c.maHP)}</b>: ${escHtml(c.tenHP)}
        </span>`;
    });
    html += `</div>`;
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
      if (state.timetableCourses.has(maHP)) {
        // Toggle off — bỏ chọn học phần đang active
        state.timetableCourses.delete(maHP);
        delete state.selectedClasses[maHP];
      } else {
        // Xóa các học phần đang pending (chưa chọn lớp) để chỉ 1 học phần pending tại 1 thời điểm.
        // Các học phần đã chọn lớp rồi thì giữ nguyên.
        state.timetableCourses.forEach(hp => {
          if (!state.selectedClasses[hp]) state.timetableCourses.delete(hp);
        });
        state.timetableCourses.add(maHP);
      }
      updateChipStyles();
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

  renderTimetableGrid();
}

function updateChipStyles() {
  document.querySelectorAll('.hp-item').forEach(el => {
    el.classList.toggle('hp-active', state.timetableCourses.has(el.dataset.mahp));
  });
}

function pickClass(maHP, maLop) {
  state.selectedClasses[maHP] = maLop;
  alert(`Đã chọn lớp ${maLop} cho học phần ${maHP}`);
  renderTimetableGrid();
}
