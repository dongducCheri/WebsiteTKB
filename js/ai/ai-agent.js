function normalizeThuForPayload(thu) {
  if (typeof thu === 'number') return thu;
  let s = String(thu || '').replace(/Thứ\s*/i, '').trim();
  if (/^(cn|chủ\s*nhật)$/i.test(s)) return 8;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : s;
}

function buildAIPayload() {
  const program = document.getElementById('program-select')?.value || '';
  const courses = [];

  [...state.selectedCourses].forEach(maHP => {
    const course = state.courseMap?.[maHP];
    if (!course) return;

    const classes = Object.values(course.classes)
      .filter(cl => !program || cl.maQL === program)
      .map(cl => ({
        maLop: cl.maLop,
        loaiLop: cl.loaiLop || '',
        sessions: (cl.sessions || []).map(ss => ({
          thu: normalizeThuForPayload(ss.thu),
          thoiGian: ss.thoiGian || '',
          kip: ss.kip || '',
          phong: ss.phong || '',
          tuan: ss.tuan || ''
        }))
      }));

    if (!classes.length) return;

    const loaiSet = new Set(classes.map(c => normalizeLoaiLop(c.loaiLop)).filter(k => k !== '__UNKNOWN__'));
    const requiredLoaiLops = (course.loaiLops?.length
      ? course.loaiLops
      : [...loaiSet]
    ).map(l => String(l).trim().toUpperCase()).filter(Boolean);

    courses.push({
      maHP,
      tenHP: course.tenHP || '',
      requiredLoaiLops,
      classes
    });
  });

  return { program, courses };
}

function validateAIResultClient(result, payload) {
  if (!result?.selections?.length) {
    return { ok: true, empty: true };
  }

  const valid = new Set();
  for (const c of payload.courses) {
    for (const cl of c.classes) {
      valid.add(`${c.maHP}|${normalizeLoaiLop(cl.loaiLop)}|${cl.maLop}`);
    }
  }

  for (const sel of result.selections) {
    const key = `${sel.maHP}|${normalizeLoaiLop(sel.loaiLop)}|${sel.maLop}`;
    if (!valid.has(key)) {
      return { ok: false, error: `Lớp không hợp lệ: ${sel.maHP} / ${sel.loaiLop} / ${sel.maLop}` };
    }
  }
  return { ok: true, empty: false };
}

function applyAISuggestion(result) {
  const maHPs = [...new Set(result.selections.map(s => s.maHP))];
  maHPs.forEach(maHP => clearSelectedClasses(maHP));

  result.selections.forEach(sel => {
    setSelectedClass(sel.maHP, sel.loaiLop, sel.maLop);
    state.timetableCourses.add(sel.maHP);
    if (state.selectedCourses && !state.selectedCourses.has(sel.maHP)) {
      state.selectedCourses.add(sel.maHP);
    }
  });

  state.editingCourse = null;
  state.timetableBlockOrder = [];
  result.selections.forEach(sel => recordBlockPickOrder(sel.maHP, sel.loaiLop, sel.maLop));
  refreshSelectionUI();
}

async function callAISchedule(userMessage) {
  const payload = buildAIPayload();
  if (!payload.courses.length) {
    throw new Error('Không có học phần hợp lệ để xếp lịch.');
  }

  const res = await fetch('/api/ai-schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      courses: payload.courses,
      userMessage,
      program: payload.program
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Lỗi ${res.status}`);
  }

  const check = validateAIResultClient(data, payload);
  if (!check.ok) throw new Error(check.error);

  return data;
}

function renderAIPanelHTML() {
  return `
    <div class="ai-panel" id="ai-panel">
      <div class="ai-panel-head">
        <span class="ai-panel-title">✨ Xếp lịch bằng AI</span>
        <span class="ai-panel-hint">Mô tả mong muốn, nhấn Enter hoặc Gửi</span>
      </div>
      <textarea id="ai-prompt" class="ai-textarea" rows="2"
        placeholder="VD: Nghỉ buổi sáng nhiều nhất có thể / Có ít nhất 1 ngày trống hoàn toàn trong tuần"></textarea>
      <div class="ai-panel-actions">
        <button type="button" class="btn btn-ai" id="ai-submit-btn">Gửi cho AI</button>
        <span id="ai-status" class="ai-status" aria-live="polite"></span>
      </div>
      <div id="ai-reason" class="ai-reason" hidden></div>
    </div>`;
}

function setAIStatus(text, type = '') {
  const el = document.getElementById('ai-status');
  if (!el) return;
  el.textContent = text;
  el.className = 'ai-status' + (type ? ` ai-status--${type}` : '');
}

function setAIReason(text, warnings = []) {
  const el = document.getElementById('ai-reason');
  if (!el) return;
  if (!text && !warnings.length) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  let html = text ? `<p>${escHtml(text)}</p>` : '';
  if (warnings.length) {
    html += `<ul class="ai-warnings">${warnings.map(w => `<li>${escHtml(w)}</li>`).join('')}</ul>`;
  }
  el.innerHTML = html;
  el.hidden = false;
}

async function runAISchedule() {
  const textarea = document.getElementById('ai-prompt');
  const btn = document.getElementById('ai-submit-btn');
  const message = textarea?.value?.trim();
  if (!message) {
    setAIStatus('Nhập yêu cầu trước.', 'error');
    return;
  }

  btn.disabled = true;
  textarea.disabled = true;
  setAIStatus('AI đang xếp lịch…', 'loading');
  setAIReason('');

  try {
    const result = await callAISchedule(message);
    if (!result.selections?.length) {
      setAIStatus('Không tìm được lịch phù hợp.', 'error');
      setAIReason(result.reason || 'Thử mô tả yêu cầu khác.');
      return;
    }
    applyAISuggestion(result);
    setAIStatus('Đã áp dụng lên TKB!', 'success');
    setAIReason(result.reason, result.warnings || []);
    if (typeof showToast === 'function') showToast('AI đã xếp xong lịch');
  } catch (err) {
    setAIStatus(err.message || 'Lỗi khi gọi AI.', 'error');
    if (typeof showToast === 'function') showToast(err.message || 'Lỗi AI', 'error');
  } finally {
    btn.disabled = false;
    textarea.disabled = false;
    textarea.focus();
  }
}

function updateAIScheduleButton(enabled) {
  const btn = document.getElementById('btn-ai-schedule');
  if (!btn) return;
  btn.disabled = !enabled;
}

function hideAIPanel() {
  const slot = document.getElementById('ai-panel-slot');
  if (!slot) return;
  slot.hidden = true;
  slot.innerHTML = '';
  slot.removeAttribute('data-inited');
}

function showAIPanel() {
  const slot = document.getElementById('ai-panel-slot');
  if (!slot) return;
  if (!slot.innerHTML.trim()) {
    slot.innerHTML = renderAIPanelHTML();
    initAIPanel();
    slot.dataset.inited = '1';
  }
  slot.hidden = false;
  document.getElementById('ai-prompt')?.focus();
  slot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function initAIScheduleButton() {
  document.getElementById('btn-ai-schedule')?.addEventListener('click', () => {
    if (document.getElementById('btn-ai-schedule')?.disabled) return;
    showAIPanel();
  });
}

function initAIPanel() {
  const panel = document.getElementById('ai-panel');
  if (!panel || panel.dataset.listeners === '1') return;
  panel.dataset.listeners = '1';

  const textarea = document.getElementById('ai-prompt');
  const btn = document.getElementById('ai-submit-btn');

  btn?.addEventListener('click', () => runAISchedule());

  textarea?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      runAISchedule();
    }
  });
}
