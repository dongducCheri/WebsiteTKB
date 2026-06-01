function exportExcel() {
  if (!state.courseMap || Object.keys(state.selectedClasses).length === 0) {
    alert('Chưa có lớp nào được chọn để xuất.');
    return;
  }

  let stt = 1;
  const aoa = [
    ['STT', 'Mã HP', 'Tên HP', 'Mã Lớp', 'Mã Lớp Kèm', 'Loại Lớp', 'Thứ', 'Kíp', 'Thời gian', 'Tuần', 'Phòng']
  ];

  for (const [maHP, typeMap] of Object.entries(state.selectedClasses)) {
    const course = state.courseMap[maHP];
    if (!course) continue;

    const entries = typeof typeMap === 'string'
      ? [{ loaiLop: '', maLop: typeMap }]
      : Object.entries(typeMap).flatMap(([loaiKey, val]) => {
          const maLops = Array.isArray(val) ? val : [val];
          return maLops.filter(Boolean).map(maLop => ({
            loaiLop: loaiKey === '__LEGACY__' ? '' : loaiKey,
            maLop
          }));
        });

    for (const { loaiLop, maLop } of entries) {
      const cls = course.classes[maLop];
      if (!cls) continue;

      const formatTime = (t) => {
        if (!t || !t.includes('-')) return t;
        return t.split('-').map(p => {
          p = p.trim();
          return p.length === 4 ? p.slice(0, 2) + ':' + p.slice(2, 4) : p;
        }).join(' - ');
      };

      if (!cls.sessions || cls.sessions.length === 0) {
        aoa.push([
          stt++, maHP, course.tenHP, maLop, cls.maLopKem || '', cls.loaiLop || loaiLop,
          '', '', '', '', ''
        ]);
        continue;
      }

      for (let i = 0; i < cls.sessions.length; i++) {
        const s = cls.sessions[i];
        
        let kip = '';
        if (typeof parseSessionTime !== 'undefined' && typeof getKip !== 'undefined') {
          const parsed = parseSessionTime(s.thoiGian);
          if (parsed && parsed.startMin !== null) {
            const k = getKip(parsed.startMin);
            if (k !== null) kip = k;
          }
        }

        aoa.push([
          i === 0 ? stt++ : '', // Chỉ đánh số STT ở dòng đầu tiên của lớp
          maHP,
          course.tenHP,
          maLop,
          cls.maLopKem || '',
          cls.loaiLop || loaiLop,
          s.thu || '',
          kip,
          formatTime(s.thoiGian),
          s.tuan || '',
          s.phong || ''
        ]);
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Styling: Center alignment and auto-fit columns
  const cols = aoa[0].map(() => ({ wch: 10 })); // Default minimum width

  for (let r = 0; r < aoa.length; r++) {
    for (let c = 0; c < aoa[r].length; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellAddress];
      if (!cell) continue;

      // 1. Add center alignment style (and bold for header row)
      cell.s = {
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        font: r === 0 ? { bold: true } : {}
      };

      // 2. Calculate width
      const valStr = cell.v !== undefined && cell.v !== null ? cell.v.toString() : '';
      // Handle multiline text width
      const lines = valStr.split('\n');
      let maxLineLen = 0;
      for (const line of lines) {
        if (line.length > maxLineLen) maxLineLen = line.length;
      }
      const width = maxLineLen + 4; // Add padding
      if (width > cols[c].wch) {
        cols[c].wch = width;
      }
    }
  }
  ws['!cols'] = cols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DanhSachLop");
  XLSX.writeFile(wb, "ThoiKhoaBieu.xlsx");
}
