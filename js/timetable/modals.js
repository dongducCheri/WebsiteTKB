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
      <h2 class="cmodal-title">Chọn 1 lớp trong khung giờ này</h2>
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
      const selectedClass = block.subClasses.find(sc => sc.maLop === row.dataset.malop);
      setSelectedClass(row.dataset.mahp, selectedClass?.loaiLop || block.loaiLop, row.dataset.malop);
      onClassPicked(row.dataset.mahp);
      close();
      refreshSelectionUI();
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
    removeSelectedClass(block.maHP, sc.loaiLop || block.loaiLop || block.loaiLopKey || '', sc.maLop);
    onClassRemovedFromTimetable(block.maHP);
    close();
    refreshSelectionUI();
  });
}
