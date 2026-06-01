function onDataReady(rows, courseMap, stats) {
  state.rows      = rows;
  state.courseMap = courseMap;
  state.stats     = stats;

  const chip = document.getElementById('file-chip');
  chip.innerHTML = `Tải lên ${escHtml(stats.fileName)} <span class="chip-remove" id="btn-remove-file" title="Đổi file">✕</span>`;
  chip.hidden = false;
  document.getElementById('btn-browse').hidden = true;

  document.getElementById('search-input').disabled   = false;
  document.getElementById('program-select').disabled = false;
  document.getElementById('btn-search').disabled     = false;

}

function resetUpload() {
  clearStorage();
  state.rows = null; state.courseMap = null; state.stats = null;
  state.selectedCourses.clear();
  state.timetableCourses.clear();
  state.selectedClasses = {};
  state.timetableBlockOrder = [];
  state.timetableBlockShift = {};

  document.getElementById('file-chip').hidden  = true;
  document.getElementById('btn-browse').hidden = false;
  document.getElementById('file-input').value  = '';

  document.getElementById('search-input').disabled   = true;
  document.getElementById('search-input').value      = '';
  document.getElementById('program-select').disabled = true;
  document.getElementById('btn-search').disabled     = true;
  document.getElementById('results').hidden          = true;
  if (typeof updateAIScheduleButton === 'function') updateAIScheduleButton(false);
  if (typeof hideAIPanel === 'function') hideAIPanel();

  renderChips();
}

async function processFile(file) {
  if (!file?.name.match(/\.xlsx?$/i)) {
    alert('Vui lòng chọn file Excel (.xlsx hoặc .xls).');
    return;
  }

  const chip = document.getElementById('file-chip');
  chip.innerHTML = 'Đang xử lý...';
  chip.hidden = false;
  document.getElementById('btn-browse').hidden = true;

  try {
    const { rows, courseMap, stats } = await parseExcelFile(file);
    saveToStorage(rows, stats);
    onDataReady(rows, courseMap, stats);
  } catch (err) {
    chip.hidden = true;
    document.getElementById('btn-browse').hidden = false;
    alert('Lỗi khi đọc file: ' + err.message);
  }
}
