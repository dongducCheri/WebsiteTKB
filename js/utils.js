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
    // Backward compatibility: dữ liệu cũ chỉ lưu 1 mã lớp cho cả học phần
    return { __LEGACY__: raw };
  }

  if (typeof raw === 'object') return raw;
  return {};
}

function hasSelectedClasses(maHP) {
  const map = getSelectedClassMap(maHP);
  return Object.keys(map).length > 0;
}

function getSelectedLoaiLops(maHP) {
  const map = getSelectedClassMap(maHP);
  return Object.keys(map).filter(k => k !== '__LEGACY__');
}

function getSelectedClassByType(maHP, loaiLop) {
  const map = getSelectedClassMap(maHP);
  const key = normalizeLoaiLop(loaiLop);
  if (map[key]) return map[key];
  return map.__LEGACY__ || null;
}

function setSelectedClass(maHP, loaiLop, maLop) {
  const map = getSelectedClassMap(maHP);
  const key = normalizeLoaiLop(loaiLop);
  if (map.__LEGACY__) delete map.__LEGACY__;
  map[key] = maLop;
  state.selectedClasses[maHP] = map;
}

function removeSelectedClass(maHP, loaiLop) {
  const map = getSelectedClassMap(maHP);
  delete map[normalizeLoaiLop(loaiLop)];
  delete map.__LEGACY__;

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
  return Object.values(getSelectedClassMap(maHP)).includes(code);
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
