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

  if (allRows.length < 4) {
    throw new Error('File không đúng định dạng: thiếu dữ liệu.');
  }

  // Row index 2 (0-based) = row 3 in Excel = actual header
  const headerRow = allRows[2].map(h => String(h).trim());
  const dataRows  = allRows.slice(3);

  // Build column index map
  const colIdx = {};
  headerRow.forEach((col, i) => {
    if (COLUMN_MAP[col] !== undefined) colIdx[COLUMN_MAP[col]] = i;
  });

  const missing = Object.values(COLUMN_MAP).filter(k => colIdx[k] === undefined);
  if (missing.length > 0) {
    console.warn('Không tìm thấy cột:', missing);
  }

  onProgress?.('Đang xử lý dữ liệu...');

  const rows = [];
  for (const raw of dataRows) {
    const maHP = String(raw[colIdx.maHP] ?? '').trim();
    if (!maHP) continue; // skip empty rows

    rows.push({
      maHP,
      tenHP:     String(raw[colIdx.tenHP]    ?? '').trim(),
      maLop:     String(raw[colIdx.maLop]    ?? '').trim(),
      thu:       String(raw[colIdx.thu]      ?? '').trim(),
      thoiGian:  String(raw[colIdx.thoiGian] ?? '').trim(),
      kip:       String(raw[colIdx.kip]      ?? '').trim(),
      tuan:      String(raw[colIdx.tuan]     ?? '').trim(),
      phong:     String(raw[colIdx.phong]    ?? '').trim(),
      loaiLop:   String(raw[colIdx.loaiLop]  ?? '').trim(),
      maQL:      String(raw[colIdx.maQL]     ?? '').trim(),
      trangThai: String(raw[colIdx.trangThai]?? '').trim()
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
      phong:    row.phong
    });
  }

  return map;
}
