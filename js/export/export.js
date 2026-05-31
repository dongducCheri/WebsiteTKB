function exportPDF() {
  if (!state.courseMap || Object.keys(state.selectedClasses).length === 0) {
    alert('Chưa có lớp nào được chọn để xuất.');
    return;
  }

  let html = `
    <div style="font-family: Arial, sans-serif; color: #000; width: 100%; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0; padding: 0;">DANH SÁCH LỚP ĐÃ ĐĂNG KÝ</h2>
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">Thời khóa biểu HUST</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
  `;

  html += `
    <thead>
      <tr style="background-color: #f2f2f2; text-align: left;">
        <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 40px;">STT</th>
        <th style="border: 1px solid #ddd; padding: 10px;">Mã HP</th>
        <th style="border: 1px solid #ddd; padding: 10px;">Tên HP</th>
        <th style="border: 1px solid #ddd; padding: 10px;">Mã Lớp</th>
        <th style="border: 1px solid #ddd; padding: 10px;">Mã Lớp Kèm</th>
        <th style="border: 1px solid #ddd; padding: 10px;">Loại Lớp</th>
        <th style="border: 1px solid #ddd; padding: 10px;">Thời gian (Thứ-Kíp-Tuần-Phòng)</th>
      </tr>
    </thead>
    <tbody>
  `;

  let stt = 1;
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

    const sessionsStr = cls.sessions.map(s =>
      `Thứ ${s.thu}, ${formatTime(s.thoiGian)}, Tuần ${s.tuan}, P.${s.phong}`
    ).join('<br>');

    html += `
      <tr>
        <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">${stt++}</td>
        <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">${maHP}</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${course.tenHP}</td>
        <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${maLop}</td>
        <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${cls.maLopKem || ''}</td>
        <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${cls.loaiLop || loaiLop}</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${sessionsStr}</td>
      </tr>
    `;
    }
  }

  html += '</tbody></table></div>';

  let printDiv = document.getElementById('print-area');
  if (!printDiv) {
    printDiv = document.createElement('div');
    printDiv.id = 'print-area';
    document.body.appendChild(printDiv);

    // Inject CSS to hide everything except print-area when printing
    const style = document.createElement('style');
    style.innerHTML = `
      @media screen {
        #print-area { display: none !important; }
      }
      @media print {
        body > *:not(#print-area):not(style):not(script) { display: none !important; }
        #print-area { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
      }
    `;
    document.head.appendChild(style);
  }

  printDiv.innerHTML = html;

  setTimeout(() => {
    window.print();
  }, 200);
}
