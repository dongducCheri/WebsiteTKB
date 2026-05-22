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

// Phân kíp HUST — trả về 1-7 dựa trên giờ bắt đầu, null nếu không khớp kíp nào
const KIP_SLOTS = [
  { kip: 1, from: 6*60+45,  to: 8*60+20  }, // 06:45–08:20
  { kip: 2, from: 8*60+20,  to: 10*60+10 }, // 08:20–10:10
  { kip: 3, from: 10*60+10, to: 11*60+45 }, // 10:10–11:45
  { kip: 4, from: 12*60+30, to: 14*60+10 }, // 12:30–14:10
  { kip: 5, from: 14*60+10, to: 16*60+0  }, // 14:10–16:00
  { kip: 6, from: 16*60+0,  to: 17*60+30 }, // 16:00–17:30
  { kip: 7, from: 17*60+45, to: 19*60+15 }, // 17:45–19:15
];

function getKip(startMin) {
  const slot = KIP_SLOTS.find(s => startMin >= s.from && startMin < s.to);
  return slot ? slot.kip : null;
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
