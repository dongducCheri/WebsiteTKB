const SYSTEM_PROMPT = `Bạn là trợ lý xếp thời khóa biểu cho sinh viên ĐHBK Hà Nội.
Nhiệm vụ: chọn mã lớp (maLop) phù hợp yêu cầu của sinh viên.

QUY TẮC BẮT BUỘC:
1. Chỉ chọn maLop có trong danh sách classes được cung cấp — không được bịa.
2. Với MỖI học phần (maHP), phải chọn ĐÚNG MỘT maLop cho TỪNG loại lớp trong requiredLoaiLops (vd. LT, BT, TN).
3. Không bỏ sót loại lớp nào trong requiredLoaiLops.
4. Ưu tiên theo userMessage (nghỉ sáng, ngày trống, ít trùng giờ, v.v.).
5. Trả JSON thuần theo schema: selections (mảng) + reason (giải thích ngắn tiếng Việt).
6. Nếu không thể thỏa mãn, trả selections rỗng và giải thích trong reason.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    selections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          maHP: { type: 'string' },
          loaiLop: { type: 'string' },
          maLop: { type: 'string' }
        },
        required: ['maHP', 'loaiLop', 'maLop']
      }
    },
    reason: { type: 'string' }
  },
  required: ['selections', 'reason']
};

function buildValidSet(courses) {
  const valid = new Set();
  const requiredByHP = new Map();
  for (const c of courses || []) {
    requiredByHP.set(c.maHP, c.requiredLoaiLops || []);
    for (const cl of c.classes || []) {
      valid.add(`${c.maHP}|${normalizeLoai(cl.loaiLop)}|${cl.maLop}`);
    }
  }
  return { valid, requiredByHP };
}

function normalizeLoai(loai) {
  const s = String(loai || '').trim().toUpperCase();
  return s || '__UNKNOWN__';
}

function validateResult(result, courses) {
  const { valid, requiredByHP } = buildValidSet(courses);
  const selections = result?.selections || [];
  const pickedByHP = new Map();

  for (const sel of selections) {
    const key = `${sel.maHP}|${normalizeLoai(sel.loaiLop)}|${sel.maLop}`;
    if (!valid.has(key)) {
      return { ok: false, error: `Lớp không hợp lệ: ${sel.maHP} / ${sel.loaiLop} / ${sel.maLop}` };
    }
    if (!pickedByHP.has(sel.maHP)) pickedByHP.set(sel.maHP, new Set());
    const loaiKey = normalizeLoai(sel.loaiLop);
    const typeSet = pickedByHP.get(sel.maHP);
    if (typeSet.has(loaiKey)) {
      return { ok: false, error: `Trùng loại lớp ${sel.loaiLop} cho ${sel.maHP}` };
    }
    typeSet.add(loaiKey);
  }

  for (const c of courses || []) {
    const required = (c.requiredLoaiLops || []).map(normalizeLoai);
    const picked = pickedByHP.get(c.maHP) || new Set();
    for (const r of required) {
      if (!picked.has(r)) {
        return { ok: false, error: `Thiếu loại lớp ${r} cho học phần ${c.maHP}` };
      }
    }
  }

  return { ok: true, selections, reason: result.reason || '' };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chưa cấu hình GEMINI_API_KEY trên server.' });
  }

  const { courses, userMessage, program } = req.body || {};
  if (!courses?.length || !userMessage?.trim()) {
    return res.status(400).json({ error: 'Thiếu courses hoặc userMessage.' });
  }

  const userPrompt = JSON.stringify({
    program: program || 'Tất cả',
    userMessage: userMessage.trim(),
    courses
  }, null, 0);

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.3
          }
        })
      }
    );

    const geminiData = await geminiRes.json();
    if (!geminiRes.ok) {
      const msg = geminiData?.error?.message || `Gemini API lỗi ${geminiRes.status}`;
      return res.status(502).json({ error: msg });
    }

    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(502).json({ error: 'Gemini không trả về nội dung.' });
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: 'Không parse được JSON từ Gemini.' });
    }

    if (!parsed.selections?.length) {
      return res.status(200).json({
        selections: [],
        reason: parsed.reason || 'AI không tìm được lịch phù hợp.',
        warnings: []
      });
    }

    const validation = validateResult(parsed, courses);
    if (!validation.ok) {
      return res.status(422).json({ error: validation.error, reason: parsed.reason || '' });
    }

    return res.status(200).json({
      selections: validation.selections,
      reason: validation.reason,
      warnings: detectTimeWarnings(validation.selections, courses)
    });
  } catch (err) {
    console.error('ai-schedule error:', err);
    return res.status(500).json({ error: err.message || 'Lỗi server.' });
  }
};

function detectTimeWarnings(selections, courses) {
  const warnings = [];
  const classMap = new Map();
  for (const c of courses) {
    for (const cl of c.classes) {
      classMap.set(`${c.maHP}|${cl.maLop}`, cl);
    }
  }

  const slots = [];
  for (const sel of selections) {
    const cl = classMap.get(`${sel.maHP}|${sel.maLop}`);
    if (!cl) continue;
    for (const ss of cl.sessions || []) {
      slots.push({ maHP: sel.maHP, maLop: sel.maLop, thu: ss.thu, thoiGian: ss.thoiGian });
    }
  }

  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i], b = slots[j];
      if (String(a.thu) !== String(b.thu)) continue;
      if (a.thoiGian && b.thoiGian && a.thoiGian === b.thoiGian) {
        warnings.push(`Trùng giờ Thứ ${a.thu}: ${a.maHP} (${a.maLop}) và ${b.maHP} (${b.maLop})`);
      }
    }
  }
  return [...new Set(warnings)];
}
