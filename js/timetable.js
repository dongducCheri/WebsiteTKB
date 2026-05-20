function collectCourseBlocks() {
  const blocks = [];
  const program = document.getElementById('program-select').value;

  state.timetableCourses.forEach(maHP => {
    const course = state.courseMap[maHP];
    if (!course) return;

    const selectedLop = state.selectedClasses[maHP] || null;
    let classesArray = Object.values(course.classes).filter(cl => !program || cl.maQL === program);
    // If a class is already selected, only render that class's blocks
    if (selectedLop) classesArray = classesArray.filter(cl => cl.maLop === selectedLop);

    const isPending = !selectedLop;

    classesArray.forEach(cl => {
      cl.sessions.forEach(ss => {
        let thu = ss.thu;
        if (typeof thu === 'string') {
          thu = thu.replace(/Thứ\s*/i, '');
          if (/^(cn|chủ\s*nhật)$/i.test(thu.trim())) thu = 8;
          else thu = parseInt(thu);
        }
        if (!thu || thu < 2 || thu > 7) return;

        const timeRange = parseSessionTime(ss.thoiGian);
        if (!timeRange) return;

        const topPct    = minutesToPct(timeRange.startMin);
        const heightPct = minutesToPct(timeRange.endMin) - topPct;

        const existing = blocks.find(b =>
          b.maHP === maHP && b.maLop === cl.maLop && b.thu === thu && b.topPct === topPct
        );

        if (existing) {
          existing.subSessions.push({ phong: ss.phong || '', tuan: ss.tuan || '', rawRow: ss.rawRow || null });
        } else {
          blocks.push({
            maHP, tenHP: course.tenHP,
            maLop: cl.maLop, maLopKem: cl.maLopKem || '',
            loaiLop: cl.loaiLop || '', thu,
            topPct, heightPct,
            thoiGian: ss.thoiGian || '',
            isPending,
            subSessions: [{ phong: ss.phong || '', tuan: ss.tuan || '', rawRow: ss.rawRow || null }]
          });
        }
      });
    });
  });

  return blocks;
}

function renderTimetableGrid() {
  const gridContainer = document.getElementById('timetable-grid-container');
  if (!gridContainer) return;

  const totalHeight = (parseInt(state.timetableRowHeight) || 60) * 10;
  const dayNames = ['', '', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

  const timeLabels = [];
  for (let min = TT_START_MIN; min <= TT_END_MIN; min += 30) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    timeLabels.push({
      label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      pct: minutesToPct(min)
    });
  }

  let html = `<div class="tt-wrap" style="--tt-height:${totalHeight}px">`;

  html += `<div class="tt-head"><div class="tt-corner"></div>`;
  for (let d = 2; d <= 7; d++) html += `<div class="tt-dh">${dayNames[d]}</div>`;
  html += `</div>`;

  html += `<div class="tt-body">`;

  html += `<div class="tt-time-col">`;
  timeLabels.forEach(({ label, pct }) => {
    html += `<div class="tt-lbl" style="top:${pct.toFixed(2)}%">${label}</div>`;
  });
  html += `</div>`;

  const blocks = collectCourseBlocks();

  for (let d = 2; d <= 7; d++) {
    html += `<div class="tt-day-col" data-thu="${d}">`;
    timeLabels.forEach(({ label, pct }) => {
      const cls = label.endsWith(':00') ? ' tt-gl-hour' : '';
      html += `<div class="tt-gridline${cls}" style="top:${pct.toFixed(2)}%"></div>`;
    });

    blocks.filter(b => b.thu === d).forEach(block => {
      const rooms = [...new Set(block.subSessions.map(s => s.phong).filter(Boolean))].join(', ');
      const pendingCls = block.isPending ? ' cb-pending' : '';
      html += `<div class="course-block${pendingCls}"
        style="top:${block.topPct.toFixed(2)}%;height:${block.heightPct.toFixed(2)}%"
        data-mahp="${escHtml(block.maHP)}"
        title="${escHtml(block.maHP)} — ${escHtml(block.maLop)}\nPhòng: ${escHtml(rooms)}">`;
      if (block.loaiLop) html += `<span class="cb-type-badge">${escHtml(block.loaiLop)}</span>`;
      html += `<span class="cb-name">${escHtml(block.tenHP)}</span>`;
      if (rooms) html += `<span class="cb-details">${escHtml(rooms)}</span>`;
      html += `</div>`;
    });

    html += `</div>`;
  }

  html += `</div></div>`;

  // domBlocks must match querySelector('.course-block') order (day-by-day)
  const domBlocks = [];
  for (let d = 2; d <= 7; d++) domBlocks.push(...blocks.filter(b => b.thu === d));

  gridContainer.innerHTML = html;
  setupBlockInteractions(gridContainer, domBlocks);
  setupTimetableDrop(gridContainer);
}

function setupBlockInteractions(gridContainer, domBlocks) {
  gridContainer.querySelectorAll('.course-block').forEach((el, index) => {
    const block = domBlocks[index];
    if (!block) return;

    el.addEventListener('click', e => {
      e.stopPropagation();

      if (block.isPending) {
        // Find all pending blocks of the same course at the same (thu, topPct)
        const conflicts = domBlocks.filter(b =>
          b.maHP === block.maHP && b.isPending &&
          b.thu === block.thu && Math.abs(b.topPct - block.topPct) < 0.001
        );

        if (conflicts.length <= 1) {
          state.selectedClasses[block.maHP] = block.maLop;
          renderTimetableGrid();
        } else {
          showConflictModal(conflicts);
        }
        return;
      }

      // Selected block → show detail popup
      showBlockDetailModal(block);
    });
  });
}

function showConflictModal(conflictBlocks) {
  document.getElementById('conflict-modal')?.remove();

  const firstRaw = conflictBlocks[0].subSessions[0]?.rawRow;
  const headers = firstRaw ? Object.keys(firstRaw) :
    ['Mã_lớp', 'Mã_lớp_kèm', 'Tên_HP', 'Thứ', 'Thời_gian', 'Kíp', 'Phòng', 'Tuần'];

  const tableRows = conflictBlocks.map(b => {
    const raw = b.subSessions[0]?.rawRow;
    const cells = raw
      ? headers.map(h => `<td>${escHtml(raw[h] ?? '')}</td>`).join('')
      : `<td>${escHtml(b.maLop)}</td><td>${escHtml(b.maLopKem)}</td>
         <td>${escHtml(b.tenHP)}</td><td>${b.thu}</td>
         <td>${escHtml(b.thoiGian)}</td><td>${escHtml(b.loaiLop)}</td>
         <td>${escHtml(b.subSessions.map(s => s.phong).join(', '))}</td>
         <td>${escHtml(b.subSessions.map(s => s.tuan).join(', '))}</td>`;
    return `<tr class="conflict-row" data-malop="${escHtml(b.maLop)}" data-mahp="${escHtml(b.maHP)}">${cells}</tr>`;
  }).join('');

  const modal = document.createElement('div');
  modal.id = 'conflict-modal';
  modal.className = 'cmodal-overlay';
  modal.innerHTML = `
    <div class="cmodal-box">
      <button class="cmodal-close-x">✕</button>
      <h2 class="cmodal-title">Thời gian bạn chọn có lớp trùng, xin hãy chọn 1 trong các lớp dưới</h2>
      <div class="cmodal-table-wrap">
        <table class="cmodal-table">
          <thead><tr>${headers.map(h => `<th>${escHtml(h)}</th>`).join('')}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      <div class="cmodal-footer">
        <button class="btn btn-dark cmodal-close-btn">Close</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.cmodal-close-x').addEventListener('click', close);
  modal.querySelector('.cmodal-close-btn').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  modal.querySelectorAll('.conflict-row').forEach(row => {
    row.addEventListener('click', () => {
      state.selectedClasses[row.dataset.mahp] = row.dataset.malop;
      close();
      renderTimetableGrid();
    });
  });
}

function showBlockDetailModal(block) {
  document.getElementById('block-detail-modal')?.remove();

  const scheduleRows = block.subSessions.map(s => {
    let t = `<b>Phòng:</b> ${escHtml(s.phong || '—')}`;
    if (s.tuan) t += `&nbsp;&nbsp;<b>Tuần:</b> ${escHtml(s.tuan)}`;
    return `<div style="margin-bottom:3px">${t}</div>`;
  }).join('');

  const modal = document.createElement('div');
  modal.id = 'block-detail-modal';
  modal.className = 'cmodal-overlay';
  modal.innerHTML = `
    <div class="cmodal-box cmodal-box--light">
      <button class="cmodal-close-x">✕</button>
      <h2 class="cmodal-title cmodal-title--light">${escHtml(block.tenHP)}</h2>
      <table class="bdetail-table">
        <tr><td>Mã HP</td><td>${escHtml(block.maHP)}</td></tr>
        <tr><td>Mã lớp</td><td>${escHtml(block.maLop)}</td></tr>
        ${block.maLopKem ? `<tr><td>Mã lớp kèm</td><td>${escHtml(block.maLopKem)}</td></tr>` : ''}
        ${block.loaiLop ? `<tr><td>Loại lớp</td><td>${escHtml(block.loaiLop)}</td></tr>` : ''}
        <tr><td>Thời gian</td><td>${escHtml(block.thoiGian)}</td></tr>
        <tr><td>Lịch học</td><td>${scheduleRows}</td></tr>
      </table>
      <div class="cmodal-footer">
        <button class="btn bdetail-deselect-btn">Đổi lớp</button>
        <button class="btn btn-dark cmodal-close-btn">Đóng</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.cmodal-close-x').addEventListener('click', close);
  modal.querySelector('.cmodal-close-btn').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  modal.querySelector('.bdetail-deselect-btn').addEventListener('click', () => {
    delete state.selectedClasses[block.maHP];
    close();
    renderTimetableGrid();
  });
}

function setupTimetableDrop(gridContainer) {
  const ttWrap = gridContainer.querySelector('.tt-wrap');
  if (!ttWrap) return;

  ttWrap.addEventListener('dragover', e => {
    e.preventDefault();
    ttWrap.classList.add('tt-drag-over');
  });

  ttWrap.addEventListener('dragleave', e => {
    if (!ttWrap.contains(e.relatedTarget)) ttWrap.classList.remove('tt-drag-over');
  });

  ttWrap.addEventListener('drop', e => {
    e.preventDefault();
    ttWrap.classList.remove('tt-drag-over');
    const maHP = e.dataTransfer.getData('text/plain');
    if (maHP && state.courseMap[maHP] && !state.timetableCourses.has(maHP)) {
      state.timetableCourses.add(maHP);
      updateChipStyles();
      renderTimetableGrid();
    }
  });
}
