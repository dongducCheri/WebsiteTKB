// Union-Find để tìm các nhóm block chồng nhau trong 1 ngày
function findOverlapGroups(dayBlocks) {
  const n = dayBlocks.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i) {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = dayBlocks[i], b = dayBlocks[j];
      if (a.topPct < b.botPct && b.topPct < a.botPct) {
        parent[find(i)] = find(j);
      }
    }
  }

  const map = new Map();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!map.has(root)) map.set(root, []);
    map.get(root).push(i);
  }

  return [...map.values()].filter(g => g.length > 1);
}

function collectCourseBlocks() {
  const blocks = [];
  const program = document.getElementById('program-select').value;

  state.timetableCourses.forEach(maHP => {
    const course = state.courseMap[maHP];
    if (!course) return;

    const selectedLop = state.selectedClasses[maHP] || null;
    let classesArray = Object.values(course.classes).filter(cl => !program || cl.maQL === program);
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

        const kip = getKip(timeRange.startMin);
        if (kip === null) return;

        const topPct = minutesToPct(timeRange.startMin);
        const botPct = minutesToPct(timeRange.endMin);
        const session = { phong: ss.phong || '', tuan: ss.tuan || '', rawRow: ss.rawRow || null };

        const block = blocks.find(b => b.maHP === maHP && b.thu === thu && b.kip === kip);

        if (block) {
          if (topPct < block.topPct) block.topPct = topPct;
          if (botPct > block.botPct) block.botPct = botPct;
          block.heightPct = block.botPct - block.topPct;

          const sub = block.subClasses.find(sc => sc.maLop === cl.maLop);
          if (sub) sub.subSessions.push(session);
          else block.subClasses.push({
            maLop: cl.maLop, maLopKem: cl.maLopKem || '',
            loaiLop: cl.loaiLop || '', thoiGian: ss.thoiGian || '',
            subSessions: [session]
          });
        } else {
          blocks.push({
            maHP, tenHP: course.tenHP,
            thu, kip, topPct, botPct,
            heightPct: botPct - topPct,
            isPending,
            subClasses: [{
              maLop: cl.maLop, maLopKem: cl.maLopKem || '',
              loaiLop: cl.loaiLop || '', thoiGian: ss.thoiGian || '',
              subSessions: [session]
            }]
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

  const blocks = collectCourseBlocks();

  // Annotate blocks với group info (các block chồng nhau trong cùng ngày)
  let gCounter = 0;
  for (let d = 2; d <= 7; d++) {
    const dayBlocks = blocks.filter(b => b.thu === d);
    findOverlapGroups(dayBlocks).forEach(group => {
      const gId = `g${gCounter++}`;
      group.forEach(localIdx => {
        dayBlocks[localIdx]._gId   = gId;
        dayBlocks[localIdx]._gSize = group.length;
      });
    });
  }

  let html = `<div class="tt-wrap" style="--tt-height:${totalHeight}px">`;
  html += `<div class="tt-head"><div class="tt-corner"></div>`;
  for (let d = 2; d <= 7; d++) html += `<div class="tt-dh">${dayNames[d]}</div>`;
  html += `</div><div class="tt-body">`;

  html += `<div class="tt-time-col">`;
  timeLabels.forEach(({ label, pct }) => {
    html += `<div class="tt-lbl" style="top:${pct.toFixed(2)}%">${label}</div>`;
  });
  html += `</div>`;

  for (let d = 2; d <= 7; d++) {
    html += `<div class="tt-day-col" data-thu="${d}">`;
    timeLabels.forEach(({ label, pct }) => {
      html += `<div class="tt-gridline${label.endsWith(':00') ? ' tt-gl-hour' : ''}" style="top:${pct.toFixed(2)}%"></div>`;
    });

    blocks.filter(b => b.thu === d).forEach(block => {
      const sc0 = block.subClasses[0];
      const pendingCls = block.isPending ? ' cb-pending' : '';

      // Label: "(LT, BT, TN) Tên môn" dạng 1 dòng
      let labelHtml = '';
      if (block.isPending) {
        const types = block.subClasses.map(sc => sc.loaiLop).filter(Boolean).join(', ');
        const prefix = types ? `(${escHtml(types)}) ` : '';
        const tip = `Có ${block.subClasses.length} lớp`;
        labelHtml = `<span class="cb-label" title="${escHtml(tip)}">${prefix}${escHtml(block.tenHP)}</span>`;
      } else if (sc0) {
        const rooms = [...new Set(sc0.subSessions.map(s => s.phong).filter(Boolean))].join(', ');
        const prefix = sc0.loaiLop ? `(${escHtml(sc0.loaiLop)}) ` : '';
        labelHtml  = `<span class="cb-label">${prefix}${escHtml(block.tenHP)}</span>`;
        if (sc0.maLop) labelHtml += `<span class="cb-details">${escHtml(sc0.maLop)}</span>`;
        if (rooms)     labelHtml += `<span class="cb-details">${escHtml(rooms)}</span>`;
      }

      // Mũi tên điều hướng nếu block nằm trong nhóm chồng
      const navHtml = block._gId
        ? `<div class="cb-nav" data-gid="${escHtml(block._gId)}">
             <button class="cb-nav-btn cb-nav-up" title="Thẻ trên">▲</button>
             <button class="cb-nav-btn cb-nav-dn" title="Thẻ dưới">▼</button>
           </div>`
        : '';

      html += `<div class="course-block${pendingCls}"
        style="top:${block.topPct.toFixed(2)}%;height:${block.heightPct.toFixed(2)}%;z-index:${block.kip}"
        data-mahp="${escHtml(block.maHP)}"
        data-gid="${escHtml(block._gId || '')}">${navHtml}${labelHtml}</div>`;
    });

    html += `</div>`;
  }

  html += `</div></div>`;

  const domBlocks = [];
  for (let d = 2; d <= 7; d++) domBlocks.push(...blocks.filter(b => b.thu === d));

  gridContainer.innerHTML = html;
  setupBlockInteractions(gridContainer, domBlocks);
  setupTimetableDrop(gridContainer);
}

function setupBlockInteractions(gridContainer, domBlocks) {
  // Xây dựng map nhóm: gId -> [{el, block}] sắp xếp theo kíp
  const groupEls  = new Map();
  const groupActive = new Map(); // gId -> index hiện tại đang active (on top)

  gridContainer.querySelectorAll('.course-block').forEach((el, index) => {
    const block = domBlocks[index];
    if (!block) return;
    el._blockIdx = index;

    if (block._gId) {
      if (!groupEls.has(block._gId)) groupEls.set(block._gId, []);
      groupEls.get(block._gId).push({ el, block });
    }
  });

  // Sắp xếp từng nhóm theo kíp, active mặc định = kíp cao nhất (cuối mảng)
  groupEls.forEach((members, gId) => {
    members.sort((a, b) => a.block.kip - b.block.kip);
    groupActive.set(gId, members.length - 1);
  });

  const applyGroupZIndex = (gId) => {
    const members = groupEls.get(gId);
    const active  = groupActive.get(gId);
    members.forEach(({ el, block }, i) => {
      el.style.zIndex = (i === active) ? 20 : block.kip;
    });
  };

  groupEls.forEach((_, gId) => applyGroupZIndex(gId));

  // Gắn sự kiện cho từng block
  gridContainer.querySelectorAll('.course-block').forEach((el, index) => {
    const block = domBlocks[index];
    if (!block) return;

    // Nút mũi tên
    el.querySelector('.cb-nav-up')?.addEventListener('click', e => {
      e.stopPropagation();
      const gId = block._gId;
      const members = groupEls.get(gId);
      let curr = groupActive.get(gId);
      curr = (curr - 1 + members.length) % members.length;
      groupActive.set(gId, curr);
      applyGroupZIndex(gId);
    });

    el.querySelector('.cb-nav-dn')?.addEventListener('click', e => {
      e.stopPropagation();
      const gId = block._gId;
      const members = groupEls.get(gId);
      let curr = groupActive.get(gId);
      curr = (curr + 1) % members.length;
      groupActive.set(gId, curr);
      applyGroupZIndex(gId);
    });

    // Click vào block (chọn lớp / xem chi tiết)
    el.addEventListener('click', e => {
      e.stopPropagation();

      if (block.isPending) {
        if (block.subClasses.length === 1) {
          state.selectedClasses[block.maHP] = block.subClasses[0].maLop;
          renderTimetableGrid();
        } else {
          showConflictModal(block);
        }
        return;
      }

      showBlockDetailModal(block);
    });
  });
}

function showConflictModal(block) {
  document.getElementById('conflict-modal')?.remove();

  const firstRaw = block.subClasses.flatMap(sc => sc.subSessions).find(s => s.rawRow)?.rawRow;
  const headers = firstRaw ? Object.keys(firstRaw) :
    ['Mã_lớp', 'Mã_lớp_kèm', 'Tên_HP', 'Thứ', 'Thời_gian', 'Kíp', 'Phòng', 'Tuần'];

  const tableRows = block.subClasses.map(sc => {
    const raw = sc.subSessions[0]?.rawRow;
    const cells = raw
      ? headers.map(h => `<td>${escHtml(raw[h] ?? '')}</td>`).join('')
      : `<td>${escHtml(sc.maLop)}</td><td>${escHtml(sc.maLopKem)}</td>
         <td>${escHtml(block.tenHP)}</td><td>${block.thu}</td>
         <td>${escHtml(sc.thoiGian)}</td><td>${escHtml(sc.loaiLop)}</td>
         <td>${escHtml(sc.subSessions.map(s => s.phong).join(', '))}</td>
         <td>${escHtml(sc.subSessions.map(s => s.tuan).join(', '))}</td>`;
    return `<tr class="conflict-row" data-malop="${escHtml(sc.maLop)}" data-mahp="${escHtml(block.maHP)}">${cells}</tr>`;
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

  const sc = block.subClasses[0];
  if (!sc) return;

  const scheduleRows = sc.subSessions.map(s => {
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
        <tr><td>Mã lớp</td><td>${escHtml(sc.maLop)}</td></tr>
        ${sc.maLopKem ? `<tr><td>Mã lớp kèm</td><td>${escHtml(sc.maLopKem)}</td></tr>` : ''}
        ${sc.loaiLop  ? `<tr><td>Loại lớp</td><td>${escHtml(sc.loaiLop)}</td></tr>`   : ''}
        <tr><td>Thời gian</td><td>${escHtml(sc.thoiGian)}</td></tr>
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
