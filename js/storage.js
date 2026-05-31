function saveToStorage(rows, stats, selectedClasses = {}, timetableCourses = new Set()) {
  try {
    const data = {
      rows: rows,
      stats: stats,
      selectedClasses: selectedClasses,
      timetableCourses: [...timetableCourses]
    };
    const compressed = LZString.compressToUTF16(JSON.stringify(data));
    localStorage.setItem('TKB_DATA_V2', compressed);
    return true;
  } catch (e) {
    console.error("Storage error:", e);
    return false;
  }
}

function loadFromStorage() {
  try {
    const compressed = localStorage.getItem('TKB_DATA_V2');
    if (compressed) {
      const data = JSON.parse(LZString.decompressFromUTF16(compressed));
      return {
        rows: data.rows,
        stats: data.stats,
        selectedClasses: data.selectedClasses || {},
        timetableCourses: data.timetableCourses ? new Set(data.timetableCourses) : new Set()
      };
    }
    
    // Fallback cho data cũ (chưa nén)
    const r = localStorage.getItem(STORAGE_KEY_ROWS);
    const m = localStorage.getItem(STORAGE_KEY_META);
    const s = localStorage.getItem(STORAGE_KEY_SELECTED);
    const c = localStorage.getItem(STORAGE_KEY_COURSES);
    if (!r || !m) return null;
    return { 
      rows: JSON.parse(r), 
      stats: JSON.parse(m),
      selectedClasses: s ? JSON.parse(s) : {},
      timetableCourses: c ? new Set(JSON.parse(c)) : new Set()
    };
  } catch { return null; }
}

function clearStorage() {
  localStorage.removeItem('TKB_DATA_V2');
  localStorage.removeItem(STORAGE_KEY_ROWS);
  localStorage.removeItem(STORAGE_KEY_META);
  localStorage.removeItem(STORAGE_KEY_SELECTED);
  localStorage.removeItem(STORAGE_KEY_COURSES);
}
