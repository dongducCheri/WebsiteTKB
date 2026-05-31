// Union-Find để tìm các nhóm block chồng nhau trong 1 ngày
function findOverlapGroups(dayBlocks) {
  const n = dayBlocks.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i) {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = dayBlocks[i], b = dayBlocks[j];
      if (a.topPct < b.botPct && b.topPct < a.botPct) {
        parent[find(i)] = find(j);
      }
    }
  }

  const map = new Map();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!map.has(root)) map.set(root, []);
    map.get(root).push(i);
  }

  return [...map.values()].filter(g => g.length > 1);
}

function findBlockForSession(blocks, maHP, thu, kip, isPending, loaiLopKey) {
  return blocks.find(b => {
    if (b.maHP !== maHP || b.thu !== thu || b.kip !== kip) return false;
    if (isPending) return b.isPending;
    return !b.isPending && b.loaiLopKey === loaiLopKey;
  });
}

function collectCourseBlocks() {
  const blocks = [];
  const program = document.getElementById('program-select').value;

  const coursesOnGrid = new Set(state.timetableCourses);
  if (state.editingCourse) coursesOnGrid.add(state.editingCourse);

  coursesOnGrid.forEach(maHP => {
    const course = state.courseMap[maHP];
    if (!course) return;

    const isEditing = state.editingCourse === maHP;
    const selectedMap = getSelectedClassMap(maHP);
    let classesArray = Object.values(course.classes).filter(cl => !program || cl.maQL === program);
    classesArray = classesArray.filter(cl => {
      const selectedLop = getSelectedClassByType(maHP, cl.loaiLop);
      if (selectedLop) return cl.maLop === selectedLop;
      return isEditing;
    });

    classesArray.forEach(cl => {
      const selectedLopForType = selectedMap[normalizeLoaiLop(cl.loaiLop)] || null;
      const isPending = !selectedLopForType;

      cl.sessions.forEach(ss => {
        let thu = ss.thu;
        if (typeof thu === 'string') {
          thu = thu.replace(/Thứ\s*/i, '');
          if (/^(cn|chủ\s*nhật)$/i.test(thu.trim())) thu = 8;
          else thu = parseInt(thu);
        }
        if (!thu || thu < 2 || thu > 7) return;

        const timeRange = parseSessionTime(ss.thoiGian);
        if (!timeRange) return;

        const kip = getKip(timeRange.startMin);
        if (kip === null) return;

        const pos = sessionPositionInKip(timeRange.startMin, timeRange.endMin, kip);
        if (!pos) return;

        const session = { phong: ss.phong || '', tuan: ss.tuan || '', rawRow: ss.rawRow || null };

        const loaiLopKey = normalizeLoaiLop(cl.loaiLop);
        const block = findBlockForSession(blocks, maHP, thu, kip, isPending, loaiLopKey);

        if (block) {
          if (pos.topPct < block.topPct) block.topPct = pos.topPct;
          if (pos.botPct > block.botPct) block.botPct = pos.botPct;
          block.heightPct = block.botPct - block.topPct;

          const sub = block.subClasses.find(sc => sc.maLop === cl.maLop);
          if (sub) sub.subSessions.push(session);
          else block.subClasses.push({
            maLop: cl.maLop, maLopKem: cl.maLopKem || '',
            loaiLop: cl.loaiLop || '', thoiGian: ss.thoiGian || '',
            subSessions: [session]
          });
        } else {
          blocks.push({
            maHP, tenHP: course.tenHP,
            loaiLop: cl.loaiLop || '',
            loaiLopKey,
            thu, kip,
            topPct: pos.topPct,
            botPct: pos.botPct,
            heightPct: pos.heightPct,
            isPending,
            subClasses: [{
              maLop: cl.maLop, maLopKem: cl.maLopKem || '',
              loaiLop: cl.loaiLop || '', thoiGian: ss.thoiGian || '',
              subSessions: [session]
            }]
          });
        }
      });
    });
  });

  return blocks;
}
