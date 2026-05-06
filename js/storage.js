function saveToStorage(rows, stats) {
  try {
    localStorage.setItem(STORAGE_KEY_ROWS, JSON.stringify(rows));
    localStorage.setItem(STORAGE_KEY_META, JSON.stringify(stats));
    return true;
  } catch { return false; }
}

function loadFromStorage() {
  try {
    const r = localStorage.getItem(STORAGE_KEY_ROWS);
    const m = localStorage.getItem(STORAGE_KEY_META);
    if (!r || !m) return null;
    return { rows: JSON.parse(r), stats: JSON.parse(m) };
  } catch { return null; }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY_ROWS);
  localStorage.removeItem(STORAGE_KEY_META);
}
