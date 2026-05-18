/**
 * results.js - Handles rendering search results and the weekly timetable grid.
 */

function renderSearchResults() {
  const container = document.getElementById('results');
  const program = document.getElementById('program-select').value;
  const selectedHPs = [...state.selectedCourses];

  if (selectedHPs.length === 0) {
    container.innerHTML = '<div class="muted">Chưa chọn học phần nào.</div>';
    container.hidden = false;
    return;
  }

  // Group into valid (found) and invalid (no classes or not found)
  const found = [];
  const notFound = [];

  selectedHPs.forEach(maHP => {
    const course = state.courseMap[maHP];
    if (!course) {
      notFound.push(maHP);
      return;
    }
    const classes = Object.values(course.classes).filter(cl => !program || cl.maQL === program);
    if (classes.length === 0) {
      notFound.push(`${maHP}: ${course.tenHP}`);
    } else {
      found.push({ maHP, tenHP: course.tenHP });
    }
  });

  let html = '';

  // 1. Invalid/not found courses alert
  if (notFound.length > 0) {
    html += `
      <div class="hp-not-found">
        <span class="hp-not-found-label">Các mã học phần không có lớp: </span>
        ${notFound.map(c => `<span class="hp-not-found-item">${escHtml(c)}</span>`).join('. ')}
      </div>
    `;
  }

  // 2. Beautiful list of selected draggable courses
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
        </span>
      `;
    });
    html += `</div>`;
  }

  // 3. User friendly banner warning / hint
  html += `
    <div class="hp-hint">
      ⚠ Bạn có thể kéo thả các học phần vào bảng thời khóa biểu bên dưới
      <span class="hp-hint-sub">(Hoặc click cũng được)</span>
    </div>
  `;

  // Height adjustment slider
  html += `
    <div class="slider-control-group">
      <label for="height-slider" class="slider-label">Chiều cao bảng</label>
      <input type="range" id="height-slider" min="30" max="120" value="${state.timetableRowHeight || 60}" step="5" class="height-range-slider">
      <span id="height-val" class="slider-value-balloon">${state.timetableRowHeight || 60}px</span>
    </div>
  `;

  // 4. Timetable grid section
  html += `
    <div class="timetable-section">
      <div id="timetable-grid-container"></div>
    </div>
  `;

  container.innerHTML = html;
  container.hidden = false;

  // Click handler to toggle courses on grid
  container.querySelectorAll('.hp-item').forEach(el => {
    el.addEventListener('click', () => {
      const maHP = el.dataset.mahp;
      if (state.timetableCourses.has(maHP)) {
        state.timetableCourses.delete(maHP);
      } else {
        state.timetableCourses.add(maHP);
      }
      updateChipStyles();
      renderTimetableGrid();
    });

    // Drag-and-drop source setup
    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', el.dataset.mahp);
      el.classList.add('hp-dragging');
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('hp-dragging');
    });
  });

  // Attach event listener for the height slider
  const slider = document.getElementById('height-slider');
  const valLabel = document.getElementById('height-val');
  if (slider) {
    slider.addEventListener('input', e => {
      const val = e.target.value;
      state.timetableRowHeight = val;
      if (valLabel) valLabel.textContent = val + 'px';
      
      const ttGrid = document.getElementById('timetable');
      if (ttGrid) {
        ttGrid.style.setProperty('--row-height', val + 'px');
      }
    });
  }

  // Render the timetable grid
  renderTimetableGrid();

  // Drag-and-drop target setup on `#timetable`
  const tt = document.getElementById('timetable');
  if (tt) {
    tt.addEventListener('dragover', e => {
      e.preventDefault();
      tt.classList.add('tt-drag-over');
    });

    tt.addEventListener('dragleave', () => {
      tt.classList.remove('tt-drag-over');
    });

    tt.addEventListener('drop', e => {
      e.preventDefault();
      tt.classList.remove('tt-drag-over');
      const maHP = e.dataTransfer.getData('text/plain');
      if (maHP && state.courseMap[maHP]) {
        if (!state.timetableCourses.has(maHP)) {
          state.timetableCourses.add(maHP);
          updateChipStyles();
          renderTimetableGrid();
        }
      }
    });
  }
}

/**
 * Updates chip styling when courses are toggled.
 */
function updateChipStyles() {
  document.querySelectorAll('.hp-item').forEach(el => {
    const maHP = el.dataset.mahp;
    if (state.timetableCourses.has(maHP)) {
      el.classList.add('hp-active');
    } else {
      el.classList.remove('hp-active');
    }
  });
}

function renderTimetableGrid() {
  const gridContainer = document.getElementById('timetable-grid-container');
  if (!gridContainer) return;

  // HUST Time axis labels corresponding to Kíp 1 - Kíp 6 boundaries (spans from 06:45 to 17:30)
  const timeLabels = [
    { row: 2, text: '0645-' },
    { row: 3, text: '0825-' },
    { row: 4, text: '1015-' },
    { row: 5, text: '1230-' },
    { row: 6, text: '1410-' },
    { row: 7, text: '1600-' },
    { row: 8, text: '1730-' }
  ];

  let html = `<div class="timetable-container" id="timetable" style="--row-height: ${state.timetableRowHeight || 60}px;">`;

  // Row 1: empty corner + day headers (Monday to Saturday: 2 to 7)
  html += `<div style="grid-column: 1;"></div>`;
  for (let d = 2; d <= 7; d++) {
    html += `<div class="day-header" style="grid-column: ${d};">${d}</div>`;
  }

  // Time axis labels
  timeLabels.forEach(t => {
    html += `<div class="time-axis" style="grid-row: ${t.row};">${t.text}</div>`;
  });

  // Vertical grid-cell dividers (span 6 kíp rows)
  for (let d = 2; d <= 7; d++) {
    html += `<div class="grid-cell" style="grid-column: ${d};"></div>`;
  }

  // Render course blocks with dynamic inline placement
  const blocks = collectCourseBlocks();
  blocks.forEach(block => {
    const inlineStyle = `grid-column: ${block.thu}; grid-row: ${block.kipStart + 1} / span ${block.kipLength};`;
    const uniqueRooms = Array.from(new Set(block.subSessions.map(s => s.phong).filter(Boolean))).join(', ');

    html += `<div class="course-block" style="${inlineStyle}" title="${escHtml(block.maHP)} — ${escHtml(block.maLop)}\nPhòng: ${escHtml(uniqueRooms)}">`;
    html += `(${escHtml(block.loaiLop)}) <span class="cb-name-trigger">${escHtml(block.tenHP)}</span>`;
    html += `</div>`;
  });

  html += `</div>`;
  gridContainer.innerHTML = html;

  // Add click event listener to each course block to toggle detailed view inline
  gridContainer.querySelectorAll('.course-block').forEach((el, index) => {
    const block = blocks[index];

    // Define HTML templates
    const simpleHtml = `(${escHtml(block.loaiLop)}) <span class="cb-name-trigger">${escHtml(block.tenHP)}</span>`;

    const sessionsList = block.subSessions.map(s => {
      let text = `<b>Phòng:</b> ${escHtml(s.phong)}`;
      if (s.tuan) text += ` (Tuần ${escHtml(s.tuan)})`;
      return text;
    }).join('<br>');

    const expandedHtml = `
      <span class="cb-close-btn" data-mahp="${escHtml(block.maHP)}">✕</span>
      ${block.loaiLop ? `<span class="cb-type-badge">${escHtml(block.loaiLop)}</span>` : ''}
      <span class="cb-name cb-name-trigger">${escHtml(block.tenHP)}</span>
      <span class="cb-details"><b>Mã lớp:</b> ${escHtml(block.maLop)}</span>
      ${block.maLopKem ? `<span class="cb-details"><b>Mã lớp kèm:</b> ${escHtml(block.maLopKem)}</span>` : ''}
      <div class="cb-details-list" style="margin-top: 4px; display: flex; flex-direction: column; gap: 2px;">
        ${sessionsList}
      </div>
    `;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Hide floating tooltip immediately upon clicking
      const tooltip = document.getElementById('rich-tooltip');
      if (tooltip) tooltip.hidden = true;
      
      // If the red X button was clicked, remove the course from the timetable
      if (e.target.classList.contains('cb-close-btn')) {
        const maHP = e.target.getAttribute('data-mahp');
        state.timetableCourses.delete(maHP);
        updateChipStyles();
        renderTimetableGrid();
        return;
      }
      
      const isExpanded = el.getAttribute('data-expanded') === 'true';
      
      if (isExpanded) {
        el.setAttribute('data-expanded', 'false');
        el.classList.remove('expanded');
        el.innerHTML = simpleHtml;
      } else {
        // Close any other currently expanded blocks first to maintain clean schedule
        gridContainer.querySelectorAll('.course-block.expanded').forEach(otherEl => {
          if (otherEl !== el) {
            const otherIdx = Array.from(gridContainer.querySelectorAll('.course-block')).indexOf(otherEl);
            if (otherIdx !== -1) {
              const otherBlock = blocks[otherIdx];
              otherEl.setAttribute('data-expanded', 'false');
              otherEl.classList.remove('expanded');
              otherEl.innerHTML = `(${escHtml(otherBlock.loaiLop)}) <span class="cb-name-trigger">${escHtml(otherBlock.tenHP)}</span>`;
            }
          }
        });

        el.setAttribute('data-expanded', 'true');
        el.classList.add('expanded');
        el.innerHTML = expandedHtml;
      }
    });

    // Rich Spreadsheet-row Tooltip Events (delegated to cb-name-trigger)
    el.addEventListener('mouseover', (e) => {
      const trigger = e.target.closest('.cb-name-trigger');
      if (!trigger) return;

      const blockEl = e.target.closest('.course-block');
      if (!blockEl || blockEl.getAttribute('data-expanded') !== 'true') return;

      const tooltip = document.getElementById('rich-tooltip');
      if (!tooltip) return;

      const rawRows = block.subSessions.map(s => s.rawRow).filter(Boolean);
      let headers = [];
      let rowsData = [];

      if (rawRows.length > 0) {
        headers = Object.keys(rawRows[0]);
        const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[_\s]+/g, '');
        const keyLopChinh = headers.find(k => norm(k) === 'malop');
        const keyLopKem = headers.find(k => norm(k) === 'malopkem');

        rowsData = rawRows.map(row => {
          const newRow = { ...row };
          if (keyLopKem) {
            const lopChinhVal = keyLopChinh ? row[keyLopChinh] : block.maLop;
            newRow[keyLopKem] = row[keyLopKem] || lopChinhVal;
          }
          return newRow;
        });
      } else {
        // Fallback mock row using current block fields
        headers = ['Mã HP', 'Tên HP', 'Mã lớp', 'Mã lớp kèm', 'Thứ', 'Phòng', 'Tuần', 'Loại lớp'];
        rowsData = [{
          'Mã HP': block.maHP,
          'Tên HP': block.tenHP,
          'Mã lớp': block.maLop,
          'Mã lớp kèm': block.maLopKem || block.maLop,
          'Thứ': block.thu,
          'Phòng': block.subSessions.map(s => s.phong).join(', '),
          'Tuần': block.subSessions.map(s => s.tuan).join(', '),
          'Loại lớp': block.loaiLop || ''
        }];
      }

      let tableHtml = `
        <div class="tooltip-table-wrapper">
          <table class="tooltip-table">
            <thead>
              <tr>
                ${headers.map(h => `<th>${escHtml(h)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rowsData.map(row => `
                <tr>
                  ${headers.map(h => `<td>${escHtml(row[h] || '')}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      tooltip.innerHTML = tableHtml;
      tooltip.hidden = false;
    });

    el.addEventListener('mousemove', (e) => {
      const trigger = e.target.closest('.cb-name-trigger');
      const tooltip = document.getElementById('rich-tooltip');
      const blockEl = e.target.closest('.course-block');

      if (!trigger || !tooltip || !blockEl || blockEl.getAttribute('data-expanded') !== 'true') {
        if (tooltip) tooltip.hidden = true;
        return;
      }

      const tooltipWidth = tooltip.offsetWidth;
      const tooltipHeight = tooltip.offsetHeight;

      // Position offset from cursor
      let left = e.clientX + 15;
      let top = e.clientY + 15;

      // Adjust boundaries to prevent overflow outside screen
      if (left + tooltipWidth > window.innerWidth) {
        left = e.clientX - tooltipWidth - 15;
      }
      if (top + tooltipHeight > window.innerHeight) {
        top = e.clientY - tooltipHeight - 15;
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });

    el.addEventListener('mouseout', (e) => {
      const trigger = e.target.closest('.cb-name-trigger');
      if (!trigger) {
        const tooltip = document.getElementById('rich-tooltip');
        if (tooltip) tooltip.hidden = true;
      }
    });
  });
}

/**
 * Collect only positioned blocks for the courses added to timetable.
 */
function collectCourseBlocks() {
  const blocks = [];
  const program = document.getElementById('program-select').value;

  state.timetableCourses.forEach(maHP => {
    const course = state.courseMap[maHP];
    if (!course) return;

    const classesArray = Object.values(course.classes).filter(cl => !program || cl.maQL === program);
    if (classesArray.length === 0) return;

    classesArray.forEach(cl => {
      cl.sessions.forEach(ss => {
        let thu = ss.thu;
        if (typeof thu === 'string') {
          thu = thu.replace(/Thứ\s*/i, '');
          if (thu.toLowerCase() === 'cn' || thu.toLowerCase() === 'chủ nhật') thu = 8;
          else thu = parseInt(thu);
        }

        const kipRange = parseKipRange(ss);
        if (thu && thu >= 2 && thu <= 7 && kipRange) {
          const kipStart = kipRange.start;
          const kipLength = kipRange.end - kipRange.start + 1;

          const existing = blocks.find(b => b.maHP === maHP && b.maLop === cl.maLop && b.thu === thu && b.kipStart === kipStart);
          if (existing) {
            existing.subSessions.push({ phong: ss.phong || '', tuan: ss.tuan || '', rawRow: ss.rawRow || null });
          } else {
            blocks.push({
              maHP,
              tenHP: course.tenHP,
              maLop: cl.maLop,
              maLopKem: cl.maLopKem || '',
              loaiLop: cl.loaiLop,
              thu,
              kipStart,
              kipLength,
              subSessions: [{ phong: ss.phong || '', tuan: ss.tuan || '', rawRow: ss.rawRow || null }]
            });
          }
        }
      });
    });
  });

  return blocks;
}

function parseKipRange(session) {
  const { thoiGian, kip } = session;

  if (kip) {
    const k = kip.toString().trim();
    const kNum = parseInt(k);
    if (!isNaN(kNum) && kNum >= 1 && kNum <= 6) {
      return { start: kNum, end: kNum };
    }
    if (k === 'Sáng')  return { start: 1, end: 3 };
    if (k === 'Chiều') return { start: 4, end: 6 };
  }

  if (!thoiGian) return null;

  // Format: "1-3" (tiết range)
  if (thoiGian.includes('-') && thoiGian.length < 6) {
    const [s, e] = thoiGian.split('-').map(Number);
    if (!isNaN(s) && !isNaN(e)) {
      return tietToKip(s, e);
    }
  }

  // Format: "0645-0910" (time range)
  if (thoiGian.includes('-') && thoiGian.length >= 9) {
    const [startStr, endStr] = thoiGian.split('-').map(t => t.trim().replace(':', ''));
    
    const startTimeToKip = {
      '0645': 1, '0730': 1,
      '0825': 2, '0920': 2,
      '1015': 3, '1100': 3,
      '1230': 4, '1315': 4,
      '1410': 5, '1505': 5,
      '1600': 6, '1645': 6
    };

    const endTimeToKip = {
      '0730': 1, '0815': 1,
      '0910': 2, '1005': 2,
      '1100': 3, '1145': 3,
      '1315': 4, '1400': 4,
      '1455': 5, '1550': 5,
      '1645': 6, '1730': 6
    };

    const s = startTimeToKip[startStr];
    const e = endTimeToKip[endStr];

    if (s && e) return { start: s, end: e };
    if (s) return { start: s, end: s };
  }

  return null;
}

/**
 * Convert tiết range (1–12) to kíp range (1–6).
 */
function tietToKip(start, end) {
  const kipStart = Math.ceil(start / 2);
  const kipEnd   = Math.ceil(end / 2);
  return { start: Math.max(1, kipStart), end: Math.min(6, kipEnd) };
}

function pickClass(maHP, maLop) {
  state.selectedClasses[maHP] = maLop;
  alert(`Đã chọn lớp ${maLop} cho học phần ${maHP}`);
  renderTimetableGrid();
}
