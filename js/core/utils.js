function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeLoaiLop(loaiLop) {
  const normalized = String(loaiLop || '').trim().toUpperCase();
  return normalized || '__UNKNOWN__';
}

function getSelectedClassMap(maHP) {
  const raw = state.selectedClasses?.[maHP];
  if (!raw) return {};

  if (typeof raw === 'string') {
    return { __LEGACY__: [raw] };
  }

  if (typeof raw === 'object') {
    const normalized = {};
    for (const [k, v] of Object.entries(raw)) {
      if (Array.isArray(v)) normalized[k] = v.filter(Boolean);
      else if (typeof v === 'string' && v) normalized[k] = [v];
    }
    return normalized;
  }
  return {};
}

function getSelectedMaLopsForType(maHP, loaiLop) {
  const map = getSelectedClassMap(maHP);
  const key = normalizeLoaiLop(loaiLop);
  if (map[key]?.length) return map[key];
  if (map.__LEGACY__?.length) return map.__LEGACY__;
  return [];
}

function hasSelectedClasses(maHP) {
  const map = getSelectedClassMap(maHP);
  return Object.values(map).some(arr => arr.length > 0);
}

function getSelectedLoaiLops(maHP) {
  const map = getSelectedClassMap(maHP);
  return Object.keys(map).filter(k => k !== '__LEGACY__' && map[k]?.length > 0);
}

function getSelectedClassByType(maHP, loaiLop) {
  const list = getSelectedMaLopsForType(maHP, loaiLop);
  return list[0] || null;
}

function getBlockStackKey(maHP, loaiLop, maLop) {
  const loai = normalizeLoaiLop(loaiLop);
  if (maLop) return `${maHP}|${loai}|${maLop}`;
  return `${maHP}|${loai}`;
}

function recordBlockPickOrder(maHP, loaiLop, maLop) {
  if (!state.timetableBlockOrder) state.timetableBlockOrder = [];
  const key = getBlockStackKey(maHP, loaiLop, maLop);
  const i = state.timetableBlockOrder.indexOf(key);
  if (i !== -1) state.timetableBlockOrder.splice(i, 1);
  state.timetableBlockOrder.push(key);
}

function removeBlockPickOrder(maHP, loaiLop, maLop) {
  if (!state.timetableBlockOrder) return;
  const loai = normalizeLoaiLop(loaiLop);
  const prefix = `${maHP}|${loai}`;

  if (maLop) {
    const key = getBlockStackKey(maHP, loaiLop, maLop);
    const i = state.timetableBlockOrder.indexOf(key);
    if (i !== -1) state.timetableBlockOrder.splice(i, 1);
    if (state.timetableBlockShift) delete state.timetableBlockShift[key];
    return;
  }

  state.timetableBlockOrder = state.timetableBlockOrder.filter(k => !k.startsWith(prefix + '|') && k !== prefix);
  if (state.timetableBlockShift) {
    Object.keys(state.timetableBlockShift).forEach(k => {
      if (k.startsWith(prefix + '|') || k === prefix) delete state.timetableBlockShift[k];
    });
  }
}

function getBlockPickOrder(block) {
  if (!state.timetableBlockOrder?.length) return 0;
  const key = getBlockStackKey(
    block.maHP,
    block.loaiLopKey || block.loaiLop,
    block.primaryMaLop
  );
  const idx = state.timetableBlockOrder.indexOf(key);
  return idx === -1 ? 0 : idx;
}

function rebuildBlockOrderFromSelection() {
  state.timetableBlockOrder = [];
  [...state.timetableCourses].forEach(maHP => {
    getSelectedLoaiLops(maHP).forEach(loaiKey => {
      getSelectedMaLopsForType(maHP, loaiKey).forEach(maLop => {
        recordBlockPickOrder(maHP, loaiKey, maLop);
      });
    });
  });
}

const BLOCK_SHIFT_STEP_PX = 12;

function getBlockShift(block) {
  const key = getBlockStackKey(block.maHP, block.loaiLopKey || block.loaiLop, block.primaryMaLop);
  return state.timetableBlockShift?.[key] ?? 0;
}

function setBlockShift(maHP, loaiLop, steps, maLop) {
  if (!state.timetableBlockShift) state.timetableBlockShift = {};
  const key = getBlockStackKey(maHP, loaiLop, maLop);
  if (steps === 0) delete state.timetableBlockShift[key];
  else state.timetableBlockShift[key] = steps;
}

function blockShiftStyle(block) {
  const px = getBlockShift(block) * BLOCK_SHIFT_STEP_PX;
  return `--cb-shift:${px}px;`;
}

function applyBlockShiftToEl(el, block) {
  const px = getBlockShift(block) * BLOCK_SHIFT_STEP_PX;
  el.style.setProperty('--cb-shift', `${px}px`);
}

function setSelectedClass(maHP, loaiLop, maLop) {
  const map = getSelectedClassMap(maHP);
  const key = normalizeLoaiLop(loaiLop);
  if (map.__LEGACY__) delete map.__LEGACY__;
  if (!map[key]) map[key] = [];
  if (!map[key].includes(maLop)) map[key].push(maLop);
  state.selectedClasses[maHP] = map;
  recordBlockPickOrder(maHP, loaiLop, maLop);
}

function removeSelectedClass(maHP, loaiLop, maLop) {
  const map = getSelectedClassMap(maHP);
  const key = normalizeLoaiLop(loaiLop);
  delete map.__LEGACY__;

  if (maLop && map[key]) {
    map[key] = map[key].filter(m => m !== maLop);
    if (map[key].length === 0) delete map[key];
    removeBlockPickOrder(maHP, loaiLop, maLop);
  } else {
    delete map[key];
    removeBlockPickOrder(maHP, loaiLop, maLop);
  }

  if (Object.keys(map).length === 0) delete state.selectedClasses[maHP];
  else state.selectedClasses[maHP] = map;
}

function clearSelectedClasses(maHP) {
  delete state.selectedClasses[maHP];
}

const LOAI_LOP_ORDER = ['LT', 'BT', 'TN', 'TH', 'DA'];

function formatSelectedTypesLabel(maHP) {
  const types = getSelectedLoaiLops(maHP).filter(t => t !== '__UNKNOWN__');
  if (!types.length) return '';

  types.sort((a, b) => {
    const ia = LOAI_LOP_ORDER.indexOf(a);
    const ib = LOAI_LOP_ORDER.indexOf(b);
    const ra = ia === -1 ? 99 : ia;
    const rb = ib === -1 ? 99 : ib;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });

  return types.join(', ');
}

function startEditingCourse(maHP) {
  state.timetableCourses.forEach(hp => {
    if (!hasSelectedClasses(hp) && hp !== maHP) state.timetableCourses.delete(hp);
  });
  state.timetableCourses.add(maHP);
  state.editingCourse = maHP;
}

function stopEditingCourse() {
  state.editingCourse = null;
  [...state.timetableCourses].forEach(hp => {
    if (!hasSelectedClasses(hp)) state.timetableCourses.delete(hp);
  });
}

function onClassPicked(maHP) {
  state.timetableCourses.add(maHP);
  state.editingCourse = null;
}

function onClassRemovedFromTimetable(maHP) {
  if (!hasSelectedClasses(maHP)) {
    state.timetableCourses.delete(maHP);
    if (state.editingCourse === maHP) state.editingCourse = null;
  } else {
    state.editingCourse = null;
  }
}

function refreshSelectionUI() {
  if (typeof refreshTopChipsUI === 'function') refreshTopChipsUI();
  else if (typeof renderChips === 'function') renderChips();
  if (typeof refreshHpItemUI === 'function') refreshHpItemUI();
  if (typeof renderTimetableGrid === 'function') renderTimetableGrid();
}

function normalizeMaLopCode(code) {
  const s = String(code ?? '').trim();
  if (!s || /^null$/i.test(s) || s === '—' || s === '-') return '';
  return s;
}

function isMaLopSelected(maHP, maLop) {
  const code = normalizeMaLopCode(maLop);
  if (!code) return false;
  const map = getSelectedClassMap(maHP);
  return Object.values(map).some(arr => arr.includes(code));
}

function findClassInCourse(maHP, maLop) {
  const course = state.courseMap?.[maHP];
  if (!course) return null;
  const code = normalizeMaLopCode(maLop);
  if (!code) return null;
  if (course.classes[code]) return course.classes[code];
  return Object.values(course.classes).find(cl => cl.maLop === code) || null;
}

function showToast(message, type = 'success') {
  let el = document.getElementById('app-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `app-toast app-toast--${type} app-toast--show`;
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.classList.remove('app-toast--show');
  }, 2500);
}

async function copyMaLopToClipboard(maLop) {
  const code = normalizeMaLopCode(maLop);
  if (!code) return false;
  try {
    await navigator.clipboard.writeText(code);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function addCompanionClass(maHP, maLopKem) {
  const cls = findClassInCourse(maHP, maLopKem);
  if (!cls) {
    alert(`Không tìm thấy lớp có mã ${maLopKem} trong học phần ${maHP}.`);
    return false;
  }
  if (isMaLopSelected(maHP, cls.maLop)) return true;

  setSelectedClass(maHP, cls.loaiLop, cls.maLop);
  if (state.selectedCourses && !state.selectedCourses.has(maHP)) {
    state.selectedCourses.add(maHP);
  }
  state.timetableCourses.add(maHP);
  onClassPicked(maHP);
  refreshSelectionUI();
  return true;
}
