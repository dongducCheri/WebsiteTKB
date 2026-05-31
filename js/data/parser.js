// Strip Vietnamese diacritics for fuzzy matching
function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

// Maps Vietnamese Excel column headers to JS keys
const COLUMN_MAP = {
  'Mã_HP':       'maHP',
  'Tên_HP':      'tenHP',
  'Mã_lớp':      'maLop',
  'Thứ':         'thu',
  'Thời_gian':   'thoiGian',
  'Kíp':         'kip',
  'Tuần':        'tuan',
  'Phòng':       'phong',
  'Loại_lớp':    'loaiLop',
  'Mã_QL':       'maQL',
  'Trạng_thái':  'trangThai'
};

/**
 * Parse an .xlsx File object using SheetJS.
 * Excel format: rows 1-2 are garbage, row 3 is the real header.
 * Returns { rows, courseMap, stats }.
 */
async function parseExcelFile(file, onProgress) {
  onProgress?.('Đang đọc file...');

  const buffer = await file.arrayBuffer();
  onProgress?.('Đang phân tích cấu trúc...');

  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];

  // header:1 → each row is a plain array; defval fills empty cells
  const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (allRows.length < 1) {
    throw new Error('File không có dữ liệu.');
  }

  // Find the header row dynamically
  let headerIndex = -1;
  for (let i = 0; i < Math.min(allRows.length, 20); i++) {
    const row = allRows[i].map(c => removeDiacritics(String(c).toLowerCase()).replace(/[_\s]+/g, ''));
    if (row.some(c => c.includes('mahp') || c.includes('mahocphan') || c.includes('malop'))) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error('Không tìm thấy dòng tiêu đề (Mã HP, Tên HP...) trong 20 dòng đầu tiên của file.');
  }

  const headerRow = allRows[headerIndex].map(h => String(h).trim());
  const dataRows  = allRows.slice(headerIndex + 1);

  // Build column index map with fuzzy matching
  const colIdx = {};
  headerRow.forEach((col, i) => {
    const cleanCol = removeDiacritics(col.toLowerCase()).replace(/[_\s]+/g, '');
    
    if (cleanCol.includes('mahp') || cleanCol === 'mahocphan') colIdx.maHP = i;
    else if ((cleanCol.includes('tenhp') || cleanCol === 'tenhocphan') && !cleanCol.includes('tienganh') && !cleanCol.includes('english') && !cleanCol.includes('anh') && colIdx.tenHP === undefined) colIdx.tenHP = i;
    else if (cleanCol === 'malop' || (cleanCol.includes('malop') && !cleanCol.includes('kem') && !cleanCol.includes('chua'))) colIdx.maLop = i;
    else if (cleanCol.includes('malopkem') || cleanCol.includes('lopkem')) colIdx.maLopKem = i;
    else if (cleanCol === 'thu') colIdx.thu = i;
    else if (cleanCol.includes('thoigian')) colIdx.thoiGian = i;
    else if (cleanCol === 'kip') colIdx.kip = i;
    else if (cleanCol === 'tuan') colIdx.tuan = i;
    else if (cleanCol === 'phong') colIdx.phong = i;
    else if (cleanCol.includes('loailop')) colIdx.loaiLop = i;
    else if (cleanCol.includes('maql')) colIdx.maQL = i;
    else if (cleanCol.includes('trangthai')) colIdx.trangThai = i;
  });

  const essential = ['maHP', 'maLop', 'thu'];
  const missing = essential.filter(k => colIdx[k] === undefined);
  if (missing.length > 0) {
    console.error('Không tìm thấy các cột bắt buộc:', missing);
    // Fallback to searching the header row for best matches
    headerRow.forEach((col, i) => {
       if (col.match(/Mã.*HP/i)) colIdx.maHP = i;
       if (col.match(/Mã.*Lớp/i) && !col.match(/kèm/i)) colIdx.maLop = i;
       if (col.match(/kèm/i)) colIdx.maLopKem = i;
    });
  }

  onProgress?.('Đang xử lý dữ liệu...');

  const rows = [];
  for (const raw of dataRows) {
    const maHP = String(raw[colIdx.maHP] ?? '').trim();
    if (!maHP) continue; // skip empty rows

    const rawRow = {};
    headerRow.forEach((colName, i) => {
      rawRow[colName] = String(raw[i] ?? '').trim();
    });

    rows.push({
      maHP,
      tenHP:     String(raw[colIdx.tenHP]    ?? '').trim(),
      maLop:     String(raw[colIdx.maLop]    ?? '').trim(),
      maLopKem:  colIdx.maLopKem !== undefined ? String(raw[colIdx.maLopKem] ?? '').trim() : '',
      thu:       String(raw[colIdx.thu]      ?? '').trim(),
      thoiGian:  String(raw[colIdx.thoiGian] ?? '').trim(),
      kip:       String(raw[colIdx.kip]      ?? '').trim(),
      tuan:      String(raw[colIdx.tuan]     ?? '').trim(),
      phong:     String(raw[colIdx.phong]    ?? '').trim(),
      loaiLop:   String(raw[colIdx.loaiLop]  ?? '').trim(),
      maQL:      String(raw[colIdx.maQL]     ?? '').trim(),
      trangThai: String(raw[colIdx.trangThai]?? '').trim(),
      rawRow
    });
  }

  onProgress?.('Đang xây dựng chỉ mục...');
  const courseMap = buildCourseMap(rows);

  const uniqueCourses = Object.keys(courseMap).length;
  const uniqueClasses = Object.values(courseMap)
    .reduce((n, c) => n + Object.keys(c.classes).length, 0);

  const stats = {
    totalRows:     rows.length,
    uniqueCourses,
    uniqueClasses,
    fileName:      file.name,
    parsedAt:      new Date().toISOString()
  };

  return { rows, courseMap, stats };
}

/**
 * Group raw rows into a nested course → class → sessions map.
 */
function buildCourseMap(rows) {
  const map = {};

  for (const row of rows) {
    if (!row.maHP || !row.maLop) continue;

    if (!map[row.maHP]) {
      map[row.maHP] = {
        maHP:     row.maHP,
        tenHP:    row.tenHP,
        loaiLops: [],
        classes:  {}
      };
    }

    const course = map[row.maHP];

    if (!course.loaiLops.includes(row.loaiLop) && row.loaiLop) {
      course.loaiLops.push(row.loaiLop);
    }

    if (!course.classes[row.maLop]) {
      course.classes[row.maLop] = {
        maLop:     row.maLop,
        maLopKem:  row.maLopKem || '',
        loaiLop:   row.loaiLop,
        maQL:      row.maQL,
        trangThai: row.trangThai,
        sessions:  []
      };
    }

    course.classes[row.maLop].sessions.push({
      thu:      row.thu,
      thoiGian: row.thoiGian,
      kip:      row.kip,
      tuan:     row.tuan,
      phong:    row.phong,
      rawRow:   row.rawRow || null
    });
  }

  return map;
}
