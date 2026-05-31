function formatPendingTypesLabel(subClasses) {
  const types = [...new Set(subClasses.map(sc => sc.loaiLop).filter(Boolean))];
  types.sort((a, b) => {
    const ia = LOAI_LOP_ORDER.indexOf(normalizeLoaiLop(a));
    const ib = LOAI_LOP_ORDER.indexOf(normalizeLoaiLop(b));
    const ra = ia === -1 ? 99 : ia;
    const rb = ib === -1 ? 99 : ib;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
  return types.join(', ');
}

function buildPendingBlockHtml(block) {
  const types = formatPendingTypesLabel(block.subClasses);
  const count = block.subClasses.length;
  const prefix = types ? `(${escHtml(types)}) ` : '';
  const tip = `Có ${count} lớp`;
  return `<span class="cb-label cb-label--pending" title="${escHtml(tip)}">${prefix}${escHtml(block.tenHP)}</span>`;
}

function formatBlockRoomWeek(subSessions) {
  const rooms = [...new Set(subSessions.map(s => s.phong).filter(Boolean))];
  const tuans = [...new Set(subSessions.map(s => s.tuan).filter(Boolean))];
  if (!rooms.length && !tuans.length) return '';
  let text = rooms.length ? `Phòng: ${rooms.join(', ')}` : 'Phòng: —';
  if (tuans.length) text += ` (Tuần ${tuans.join(', ')})`;
  return text;
}

function buildKemPillHtml(maHP, sc) {
  const kem = normalizeMaLopCode(sc.maLopKem);
  if (!kem || kem === normalizeMaLopCode(sc.maLop)) {
    return `<span class="cb-pill cb-pill--null" title="Không có mã lớp kèm">NULL</span>`;
  }
  const picked = isMaLopSelected(maHP, kem);
  const cls = picked ? 'cb-pill cb-pill--selected cb-kem-btn' : 'cb-pill cb-kem-btn';
  const title = picked
    ? 'Lớp kèm đã có trên TKB'
    : 'Thêm lớp kèm vào thời khóa biểu';
  return `<button type="button" class="${cls}" data-mahp="${escHtml(maHP)}" data-malop-kem="${escHtml(kem)}" title="${escHtml(title)}" ${picked ? 'disabled' : ''}><span class="cb-pill-code">${escHtml(kem)}</span></button>`;
}

function buildConfirmedBlockHtml(block, sc) {
  const loai = sc.loaiLop ? ` (${escHtml(sc.loaiLop)})` : '';
  const roomWeek = formatBlockRoomWeek(sc.subSessions);
  return `
    <div class="cb-card">
      <div class="cb-title">${escHtml(block.tenHP)}${loai}</div>
      <div class="cb-row">
        <span class="cb-row-lbl">Mã lớp:</span>
        <button type="button" class="cb-pill cb-pill--selected cb-copy-btn" data-copy-malop="${escHtml(sc.maLop)}" title="Click để copy mã lớp">
          <span class="cb-pill-code">${escHtml(sc.maLop)}</span>
          <span class="cb-pill-check" aria-hidden="true">✓</span>
        </button>
      </div>
      <div class="cb-row">
        <span class="cb-row-lbl">Mã lớp kèm:</span>
        ${buildKemPillHtml(block.maHP, sc)}
      </div>
      ${roomWeek ? `<div class="cb-room">${escHtml(roomWeek)}</div>` : ''}
    </div>`;
}
