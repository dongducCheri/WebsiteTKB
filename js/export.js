function exportTxt() {
  if (!state.courseMap) { alert('Chưa có dữ liệu.'); return; }
  const lines = Object.values(state.courseMap)
    .flatMap(c => Object.keys(c.classes))
    .join('\n');
  const blob = new Blob([lines], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ma-lop-dky.txt';
  a.click();
}
