document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input');
  const dropZone  = document.getElementById('drop-zone');

  // Upload
  dropZone.addEventListener('click', e => {
    if (e.target.id === 'btn-remove-file' || e.target.classList.contains('chip-remove')) {
      resetUpload();
      return;
    }
    if (!document.getElementById('btn-browse').hidden) fileInput.click();
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) processFile(fileInput.files[0]);
  });

  // Drag & drop
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  });

  // Search (dropdown autocomplete)
  initSearch();

  // Export
  document.getElementById('link-export').addEventListener('click', e => {
    e.preventDefault(); exportTxt();
  });

  // Lưu
  document.getElementById('link-save').addEventListener('click', e => {
    e.preventDefault();
    if (!state.rows) { alert('Chưa có dữ liệu để lưu.'); return; }
    const ok = saveToStorage(state.rows, state.stats);
    alert(ok ? 'Đã lưu vào Browser! Lần sau vào trang sẽ tự load.' : 'Không thể lưu (bộ nhớ đầy).');
  });

  // Hướng dẫn modal
  document.getElementById('btn-guide').addEventListener('click', () => {
    document.getElementById('modal-guide').hidden = false;
  });
  document.getElementById('btn-close-guide').addEventListener('click', () => {
    document.getElementById('modal-guide').hidden = true;
  });
  document.getElementById('modal-guide').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.hidden = true;
  });

  // Load dữ liệu đã cache
  const cached = loadFromStorage();
  if (cached) {
    const courseMap = buildCourseMap(cached.rows);
    onDataReady(cached.rows, courseMap, cached.stats);
  }
});
