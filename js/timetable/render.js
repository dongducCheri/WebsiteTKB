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

  let gCounter = 0;
  for (let d = 2; d <= 7; d++) {
    const dayBlocks = blocks.filter(b => b.thu === d && !b.isPending);
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

      let labelHtml = '';
      if (block.isPending) {
        labelHtml = buildPendingBlockHtml(block);
      } else if (sc0) {
        labelHtml = buildConfirmedBlockHtml(block, sc0);
      }

      const confirmedCls = !block.isPending ? ' cb-confirmed' : '';
      const closeBtnHtml = !block.isPending
        ? `<button type="button" class="cb-close-btn" data-close-type="${escHtml(block.loaiLopKey || '')}" title="Bỏ chọn lớp" aria-label="Bỏ chọn lớp">×</button>`
        : '';

      const navHtml = (!block.isPending && block._gId)
        ? `<div class="cb-nav" data-gid="${escHtml(block._gId)}">
             <button class="cb-nav-btn cb-nav-up" title="Thẻ trên">▲</button>
             <button class="cb-nav-btn cb-nav-dn" title="Thẻ dưới">▼</button>
           </div>`
        : '';

      const zIndex = block.kip;

      html += `<div class="course-block${pendingCls}${confirmedCls}"
        style="top:${block.topPct.toFixed(2)}%;height:${block.heightPct.toFixed(2)}%;z-index:${zIndex}"
        data-mahp="${escHtml(block.maHP)}"
        data-gid="${escHtml(block._gId || '')}">${closeBtnHtml}${navHtml}${labelHtml}</div>`;
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
