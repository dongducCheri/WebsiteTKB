const TT_START_MIN = 6 * 60 + 45;   // 06:45
const TT_END_MIN   = 21 * 60;        // 21:00
const TT_TOTAL_MIN = TT_END_MIN - TT_START_MIN;

function timeStrToMinutes(str) {
  if (!str) return null;
  const s = String(str).replace(':', '').trim();
  if (s.length < 4) return null;
  const h = parseInt(s.slice(0, 2));
  const m = parseInt(s.slice(2, 4));
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function minutesToPct(min) {
  return ((min - TT_START_MIN) / TT_TOTAL_MIN) * 100;
}

// Trả về { startMin, endMin } hoặc null nếu không parse được
function parseSessionTime(thoiGian) {
  if (!thoiGian || !thoiGian.includes('-')) return null;
  const parts = thoiGian.split('-');
  if (parts.length < 2) return null;
  const startMin = timeStrToMinutes(parts[0].trim());
  const endMin   = timeStrToMinutes(parts[1].trim());
  if (startMin === null || endMin === null || startMin >= endMin) return null;
  return { startMin, endMin };
}
