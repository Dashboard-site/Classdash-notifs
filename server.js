const express = require("express");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 3000;

// Same period clock for every class (IST)
const NOTIF_SCHEDULE = [
  { time: "08:20", type: "assembly",  idx: null, prev: null,       prevLabel: null },
  { time: "08:40", type: "period",    idx: 0,    prev: "assembly", prevLabel: "Assembly" },
  { time: "09:40", type: "period",    idx: 1,    prev: "period",   prevLabel: "Period 0" },
  { time: "10:20", type: "period",    idx: 2,    prev: "period",   prevLabel: "Period 1" },
  { time: "11:00", type: "break",     idx: null, prev: "period",   prevLabel: "Period 2", breakEnd: "11:10" },
  { time: "11:10", type: "period",    idx: 3,    prev: "break",    prevLabel: null },
  { time: "11:50", type: "period",    idx: 4,    prev: "period",   prevLabel: "Period 3" },
  { time: "12:30", type: "lunch",     idx: null, prev: "period",   prevLabel: "Period 4", breakEnd: "1:00 PM" },
  { time: "13:00", type: "period",    idx: 5,    prev: "lunch",    prevLabel: null },
  { time: "13:35", type: "period",    idx: 6,    prev: "period",   prevLabel: "Period 5" },
  { time: "14:10", type: "break",     idx: null, prev: "period",   prevLabel: "Period 6", breakEnd: "2:20 PM" },
  { time: "14:20", type: "period",    idx: 7,    prev: "break",    prevLabel: null },
  { time: "14:55", type: "period",    idx: 8,    prev: "period",   prevLabel: "Period 7" },
  { time: "15:30", type: "period",    idx: 9,    prev: "period",   prevLabel: "Period 8" },
  { time: "16:20", type: "dismissed", idx: null, prev: "period",   prevLabel: "Period 9" }
];

/**
 * Fallback weekly TTs per class when Firestore has no todayTt override.
 * Keep in sync with data/xiic.js … data/xiif.js on the site when possible.
 * Keys: 0=Sun … 6=Sat. Each day: 10 periods { subject, teacher }.
 * Empty arrays / None = free period.
 */
const CLASS_TT = {
  xiia: {
    0: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
    1: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
    2: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
    3: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
    4: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
    5: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
    6: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
  },
  xiib: {
    0: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
    1: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
    2: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
    3: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
    4: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
    5: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
    6: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
  },
  xiic: {
    0: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
    1: [{ subject: "Chemistry", teacher: "Ashley tr." }, { subject: "Physics", teacher: "Shyni tr." }, { subject: "Maths", teacher: "Renya tr." }, { subject: "Computer Science", teacher: "Sarala tr." }, { subject: "English", teacher: "Manoj Kuriakose sir" }, { subject: "Optional Subject", teacher: "-" }, { subject: "Maths", teacher: "Sujith sir" }, { subject: "Chemistry", teacher: "Vimal sir" }, { subject: "Physics Practical", teacher: "-" }, { subject: "Chemistry Practical", teacher: "-" }],
    2: [{ subject: "Computer Science", teacher: "Sarala tr." }, { subject: "Chemistry", teacher: "Vimal sir" }, { subject: "Physics", teacher: "Deepesh sir" }, { subject: "Maths", teacher: "Sujith sir" }, { subject: "English", teacher: "Manoj Kuriakose sir" }, { subject: "Optional Subject", teacher: "-" }, { subject: "English", teacher: "Manoj Mathew sir" }, { subject: "Computer Science", teacher: "Sarala tr." }, { subject: "P.T.", teacher: "Abin sir" }, { subject: "Chemistry", teacher: "Ashley tr." }],
    3: [{ subject: "Chemistry", teacher: "Ashley tr." }, { subject: "Computer Science", teacher: "Sarala tr." }, { subject: "Optional Subject", teacher: "-" }, { subject: "Maths", teacher: "Sujith sir" }, { subject: "Chemistry", teacher: "Vimal sir" }, { subject: "Physics", teacher: "Deepesh sir" }, { subject: "Physics", teacher: "Shyni tr." }, { subject: "Maths", teacher: "Renya tr." }, { subject: "Computer Science", teacher: "Sarala tr." }, { subject: "M.P.T.", teacher: "-" }],
    4: [{ subject: "Chemistry", teacher: "Ashley tr." }, { subject: "Physics", teacher: "Deepesh sir" }, { subject: "English", teacher: "Manoj Mathew sir" }, { subject: "Maths", teacher: "Sujith sir" }, { subject: "Physics", teacher: "Shyni tr." }, { subject: "Chemistry", teacher: "Vimal sir" }, { subject: "Optional Subject", teacher: "-" }, { subject: "Maths", teacher: "Renya tr." }, { subject: "Computer Science", teacher: "Sarala tr." }, { subject: "Library", teacher: "Navya tr." }],
    5: [{ subject: "Physics", teacher: "Shyni tr." }, { subject: "Chemistry", teacher: "Vimal sir" }, { subject: "Computer Science", teacher: "Sarala tr." }, { subject: "Optional Subject", teacher: "-" }, { subject: "Maths", teacher: "Renya tr." }, { subject: "Physics", teacher: "Deepesh sir" }, { subject: "English", teacher: "Manoj Kuriakose sir" }, { subject: "Computer Science", teacher: "Sarala tr." }, { subject: "Chemistry", teacher: "Ashley tr." }, { subject: "Maths", teacher: "Sujith sir" }],
    6: [{ subject: "Chemistry", teacher: "Ashley tr." }, { subject: "Computer Science", teacher: "Sarala tr." }, { subject: "Physics", teacher: "Shyni tr." }, { subject: "English", teacher: "Manoj Kuriakose sir" }, { subject: "Maths", teacher: "Sujith sir" }, { subject: "Optional Subject", teacher: "-" }, { subject: "Maths", teacher: "Renya tr." }, { subject: "English", teacher: "Manoj Mathew sir" }, { subject: "Computer Science", teacher: "Sarala tr." }, { subject: "Physics", teacher: "Deepesh sir" }],
  },
  xiid: {
    0: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
    1: [{ subject: "Psychology", teacher: "Jiyamol tr." }, { subject: "Physics", teacher: "Deepesh sir" }, { subject: "Chemistry", teacher: "Vimal sir" }, { subject: "English", teacher: "Manoj Kuriakose sir" }, { subject: "Physics", teacher: "Shyni tr." }, { subject: "Optional Subject", teacher: "-" }, { subject: "Chemistry", teacher: "Ashley tr." }, { subject: "P.T.", teacher: "Abin sir" }, { subject: "Biology Practical", teacher: "-" }, { subject: "Biology Practical", teacher: "-" }],
    2: [{ subject: "Psychology", teacher: "Jiyamol tr." }, { subject: "Physics", teacher: "Shyni tr." }, { subject: "Chemistry", teacher: "Vimal sir" }, { subject: "English", teacher: "Manoj Mathew sir" }, { subject: "Biology", teacher: "Rini tr." }, { subject: "Optional Subject", teacher: "-" }, { subject: "Physics Practical", teacher: "-" }, { subject: "Chemistry Practical", teacher: "-" }, { subject: "Biology", teacher: "Amrutha tr." }, { subject: "Physics", teacher: "Deepesh sir" }],
    3: [{ subject: "Psychology", teacher: "Jiyamol tr." }, { subject: "Chemistry", teacher: "Vimal sir" }, { subject: "Optional Subject", teacher: "-" }, { subject: "Physics", teacher: "Deepesh sir" }, { subject: "Biology", teacher: "Amrutha tr." }, { subject: "English", teacher: "Manoj Kuriakose sir" }, { subject: "Chemistry", teacher: "Ashley tr." }, { subject: "Biology", teacher: "Rini tr." }, { subject: "Library", teacher: "-" }, { subject: "M.P.T.", teacher: "-" }],
    4: [{ subject: "Biology", teacher: "Rini tr." }, { subject: "Chemistry", teacher: "Ashley tr." }, { subject: "Physics", teacher: "Shyni tr." }, { subject: "Biology", teacher: "Rini tr." }, { subject: "Psychology", teacher: "Jiyamol tr." }, { subject: "Physics", teacher: "Deepesh sir" }, { subject: "Optional Subject", teacher: "-" }, { subject: "Chemistry", teacher: "Vimal sir" }, { subject: "Psychology", teacher: "Jiyamol tr." }, { subject: "English", teacher: "Manoj Mathew sir" }],
    5: [{ subject: "Physics", teacher: "Deepesh sir" }, { subject: "Psychology", teacher: "Jiyamol tr." }, { subject: "Biology", teacher: "Rini tr." }, { subject: "Optional Subject", teacher: "-" }, { subject: "Library", teacher: "-" }, { subject: "English", teacher: "Manoj Mathew sir" }, { subject: "Biology", teacher: "Rini tr." }, { subject: "Chemistry", teacher: "Ashley tr." }, { subject: "English", teacher: "Manoj Kuriakose sir" }, { subject: "Psychology", teacher: "Jiyamol tr." }],
    6: [{ subject: "Psychology", teacher: "Jiyamol tr." }, { subject: "Physics", teacher: "Deepesh sir" }, { subject: "Chemistry", teacher: "Ashley tr." }, { subject: "Biology", teacher: "Rini tr." }, { subject: "P.T.", teacher: "Lal sir" }, { subject: "Optional Subject", teacher: "-" }, { subject: "Physics", teacher: "Shyni tr." }, { subject: "English", teacher: "Manoj Kuriakose sir" }, { subject: "Psychology", teacher: "Jiyamol tr." }, { subject: "Chemistry", teacher: "Vimal sir" }],
  },
  xiie: {
    0: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
    1: [{ subject: "Physics", teacher: "Deepesh sir" }, { subject: "Biology", teacher: "Rini tr." }, { subject: "Chemistry", teacher: "Ashley tr." }, { subject: "Biology", teacher: "Amrutha tr." }, { subject: "Mathematics / Psychology", teacher: "-" }, { subject: "Optional Subject", teacher: "-" }, { subject: "Chemistry", teacher: "Vimal sir" }, { subject: "English", teacher: "Manoj Kuriakose sir" }, { subject: "Physics", teacher: "Shyni tr." }, { subject: "Mathematics / Psychology", teacher: "-" }],
    2: [{ subject: "Biology", teacher: "Rini tr." }, { subject: "Physics", teacher: "Deepesh sir" }, { subject: "Chemistry", teacher: "Ashley tr." }, { subject: "Mathematics / Psychology", teacher: "-" }, { subject: "Physics", teacher: "Shyni tr." }, { subject: "Optional Subject", teacher: "-" }, { subject: "Library", teacher: "-" }, { subject: "Chemistry", teacher: "Vimal sir" }, { subject: "Mathematics / Psychology", teacher: "-" }, { subject: "English", teacher: "Manoj Mathew sir" }],
    3: [{ subject: "Chemistry", teacher: "Vimal sir" }, { subject: "English", teacher: "Manoj Kuriakose sir" }, { subject: "Optional Subject", teacher: "-" }, { subject: "Mathematics / Psychology", teacher: "-" }, { subject: "Biology", teacher: "Rini tr." }, { subject: "P.T.", teacher: "Abin sir" }, { subject: "Biology", teacher: "Amrutha tr." }, { subject: "Mathematics / Psychology", teacher: "-" }, { subject: "Physics", teacher: "Deepesh sir" }, { subject: "M.P.T.", teacher: "-" }],
    4: [{ subject: "Physics", teacher: "Deepesh sir" }, { subject: "EMG", teacher: "Manoj Mathew sir" }, { subject: "Biology", teacher: "Rini tr." }, { subject: "English", teacher: "Manoj Kuriakose sir" }, { subject: "Chemistry", teacher: "Ashley tr." }, { subject: "Mathematics / Psychology", teacher: "-" }, { subject: "Optional Subject", teacher: "-" }, { subject: "Biology", teacher: "Rini tr." }, { subject: "Chemistry Practical", teacher: "Ashley tr." }, { subject: "Physics Practical", teacher: "Shyni tr." }],
    5: [{ subject: "Chemistry", teacher: "Ashley tr." }, { subject: "Physics", teacher: "Shyni tr." }, { subject: "Mathematics / Psychology", teacher: "-" }, { subject: "Optional Subject", teacher: "-" }, { subject: "Physics", teacher: "Deepesh sir" }, { subject: "Chemistry", teacher: "Vimal sir" }, { subject: "English", teacher: "Manoj Mathew sir" }, { subject: "Mathematics / Psychology", teacher: "-" }, { subject: "Biology Practical", teacher: "-" }, { subject: "Biology Practical", teacher: "-" }],
    6: [{ subject: "Physics", teacher: "Deepesh sir" }, { subject: "Biology", teacher: "Rini tr." }, { subject: "English", teacher: "Manoj Kuriakose sir" }, { subject: "Mathematics / Psychology", teacher: "-" }, { subject: "Chemistry", teacher: "Ashley tr." }, { subject: "Optional Subject", teacher: "-" }, { subject: "Biology", teacher: "Rini tr." }, { subject: "Physics", teacher: "Shyni tr." }, { subject: "Chemistry", teacher: "Vimal sir" }, { subject: "Mathematics / Psychology", teacher: "-" }],
  },
  xiif: {
    0: [{ subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }, { subject: "None", teacher: "-" }],
    1: [{ subject: "Biology", teacher: "Rini tr." }, { subject: "Mathematics", teacher: "Sujith sir" }, { subject: "Physics", teacher: "Shyni tr." }, { subject: "Chemistry", teacher: "Vimal sir" }, { subject: "Physics", teacher: "Deepesh sir" }, { subject: "Optional Subject", teacher: "-" }, { subject: "Biology", teacher: "Rini tr." }, { subject: "Mathematics", teacher: "Renya tr." }, { subject: "English", teacher: "Manoj Mathew sir" }, { subject: "Chemistry", teacher: "Ashley tr." }],
    2: [{ subject: "Physics", teacher: "Shyni tr." }, { subject: "Chemistry", teacher: "Ashley tr." }, { subject: "Biology", teacher: "Rini tr." }, { subject: "Physics", teacher: "Deepesh sir" }, { subject: "Biology", teacher: "Amrutha tr." }, { subject: "Optional Subject", teacher: "-" }, { subject: "Mathematics", teacher: "Sujith sir" }, { subject: "English", teacher: "Manoj Kuriakose sir" }, { subject: "Mathematics", teacher: "Renya tr." }, { subject: "Chemistry", teacher: "Vimal sir" }],
    3: [{ subject: "Biology", teacher: "Rini tr." }, { subject: "Mathematics", teacher: "Sujith sir" }, { subject: "Optional Subject", teacher: "-" }, { subject: "Physics", teacher: "Shyni tr." }, { subject: "Chemistry", teacher: "Ashley tr." }, { subject: "Mathematics", teacher: "Renya tr." }, { subject: "Physics", teacher: "Deepesh sir" }, { subject: "Chemistry", teacher: "Vimal sir" }, { subject: "English", teacher: "Manoj Mathew sir" }, { subject: "M.P.T.", teacher: "-" }],
    4: [{ subject: "Chemistry", teacher: "Vimal sir" }, { subject: "English", teacher: "Manoj Kuriakose sir" }, { subject: "Chemistry", teacher: "Ashley tr." }, { subject: "Physics", teacher: "Deepesh sir" }, { subject: "Mathematics", teacher: "Sujith sir" }, { subject: "Physics", teacher: "Shyni tr." }, { subject: "Optional Subject", teacher: "-" }, { subject: "P.T.", teacher: "Abin sir" }, { subject: "Biology Practical", teacher: "-" }, { subject: "Biology Practical", teacher: "-" }],
    5: [{ subject: "Biology", teacher: "Rini tr." }, { subject: "Chemistry", teacher: "Ashley tr." }, { subject: "Mathematics", teacher: "Renya tr." }, { subject: "Optional Subject", teacher: "-" }, { subject: "Physics", teacher: "Shyni tr." }, { subject: "English", teacher: "Manoj Kuriakose sir" }, { subject: "Biology", teacher: "Amrutha tr." }, { subject: "Mathematics", teacher: "Sujith sir" }, { subject: "Chemistry Practical", teacher: "Vimal sir" }, { subject: "Physics Practical", teacher: "Deepesh sir" }],
    6: [{ subject: "Mathematics", teacher: "Renya tr." }, { subject: "Chemistry", teacher: "Vimal sir" }, { subject: "English", teacher: "Manoj Mathew sir" }, { subject: "Mathematics", teacher: "Sujith sir" }, { subject: "Biology", teacher: "Rini tr." }, { subject: "Optional Subject", teacher: "-" }, { subject: "EMG", teacher: "Manoj Kuriakose sir" }, { subject: "Physics", teacher: "Deepesh sir" }, { subject: "Biology", teacher: "Rini tr." }, { subject: "Library", teacher: "-" }],
  },
};

function initFirebase() {
  if (admin.apps.length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY");
  }
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey })
  });
}

function nowIST() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  const time = `${parts.hour}:${parts.minute}`;
  const dayKey = `${parts.year}-${parts.month}-${parts.day}`;
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = map[parts.weekday] ?? new Date().getDay();
  return { time, dayKey, day };
}

function minutesOf(t) {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + m;
}

async function loadTodayOverride(classId, dayKey) {
  try {
    const col = admin.firestore().collection("classdash_sync");
    // 1) Preferred: shared_<classId>.todayTt (written by in-app "Save today")
    const sharedId = `shared_${classId}`;
    const snap = await col.doc(sharedId).get();
    if (snap.exists) {
      const tt = snap.data().todayTt;
      if (tt && typeof tt === "object" && !tt.cleared && (!tt.date || tt.date === dayKey)) {
        return tt;
      }
    }
    // 2) Fallback: day_<YYYY-MM-DD>_<classId> docs (also written by writeSharedExtras)
    const dayId = `day_${dayKey}_${classId}`;
    const daySnap = await col.doc(dayId).get();
    if (daySnap.exists) {
      const tt = daySnap.data();
      if (tt && typeof tt === "object" && !tt.cleared && Array.isArray(tt.periods)) {
        return tt;
      }
    }
    // Alternate naming from classDoc("day_"+date) => day_YYYY-MM-DD_classId already above
    return null;
  } catch (e) {
    console.warn("todayTt load failed", classId, e.message);
    return null;
  }
}

function periodFromOverride(override, idx) {
  if (!override || !Array.isArray(override.periods)) return null;
  const p = override.periods[idx];
  if (!p || p.enabled === false) return { subject: "—", teacher: "—", skipped: true };
  return {
    subject: p.subject || "—",
    teacher: p.teacher || "—",
    skipped: false
  };
}

function periodFromBase(classId, day, idx) {
  const pack = CLASS_TT[classId];
  if (!pack || !pack[day] || !pack[day][idx]) {
    return { subject: `Period ${idx}`, teacher: "—", skipped: false };
  }
  const p = pack[day][idx];
  let subject = (p.subject || "").trim();
  let teacher = (p.teacher || "").trim();
  if (subject === "None" || subject === "—" || subject === "-") subject = "—";
  if (teacher === "None" || teacher === "—" || teacher === "-") teacher = "—";
  return {
    subject: subject || "—",
    teacher: teacher || "—",
    skipped: false
  };
}

function buildMessage(entry, day, classId, override) {
  const label = classId ? String(classId).toUpperCase() : "";

  if (entry.type === "assembly") {
    return { title: "🙏 Prayer / Assembly Time", body: label ? `${label} · Please proceed to assembly.` : "Please proceed to the assembly." };
  }
  if (entry.type === "break") {
    return { title: "☕ Break Time", body: `${entry.prevLabel || "Period"} over · Break until ${entry.breakEnd}` };
  }
  if (entry.type === "lunch") {
    return { title: "🍽️ Lunch Break", body: `${entry.prevLabel || "Period"} over · Lunch until ${entry.breakEnd}` };
  }
  if (entry.type === "dismissed") {
    return { title: "🏁 School Dismissed", body: label ? `${label} · See you tomorrow!` : "See you tomorrow!" };
  }

  // period
  const idx = entry.idx;
  const cur = periodFromOverride(override, idx) || periodFromBase(classId, day, idx);
  if (cur.skipped) {
    return { title: `📚 ${label || "Class"}`, body: "No class this period", skipSend: true };
  }
  const sub = cur.subject || "—";
  const teach = cur.teacher || "—";

  if (entry.prev === "assembly") {
    return {
      title: `📚 ${sub}${teach && teach !== "—" ? " · " + teach : ""}`,
      body: "🙏 Prayer / Assembly over"
    };
  }
  if (entry.prev === "break") {
    return {
      title: `📚 Period ${idx}: ${sub}${teach && teach !== "—" ? " · " + teach : ""}`,
      body: "Break over"
    };
  }
  if (entry.prev === "lunch") {
    return {
      title: `📚 Period ${idx}: ${sub}${teach && teach !== "—" ? " · " + teach : ""}`,
      body: "Lunch over"
    };
  }
  if (entry.prev === "period" && entry.prevLabel) {
    const prevIdx = parseInt(String(entry.prevLabel).replace("Period ", ""), 10);
    const prev = periodFromOverride(override, prevIdx) || periodFromBase(classId, day, prevIdx);
    const prevSub = prev && prev.subject ? prev.subject : "—";
    return {
      title: `📚 ${entry.prevLabel}, ${prevSub} over`,
      body: `Next: ${sub}${teach && teach !== "—" ? " · " + teach : ""}`
    };
  }
  return {
    title: `📚 Period ${idx}: ${sub}${teach && teach !== "—" ? " · " + teach : ""}`,
    body: "Starting now"
  };
}

async function getTokensByClass() {
  const snap = await admin.firestore().collection("fcmTokens").get();
  const map = {};
  snap.docs.forEach(d => {
    const data = d.data() || {};
    const token = data.token;
    if (!token) return;
    const classId = (data.classId || "xiic").toLowerCase();
    if (!map[classId]) map[classId] = [];
    map[classId].push(token);
  });
  return map;
}

async function sendToTokens(tokens, title, body) {
  if (!tokens.length) return { sent: 0, failed: 0 };
  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    data: {
      title: String(title),
      body: String(body),
      tag: "classdash"
    },
    webpush: {
      headers: { Urgency: "high" },
      fcmOptions: {
        link: process.env.APP_URL || "https://dashboard.marygiri.workers.dev/"
      }
    }
  });
  return { sent: res.successCount, failed: res.failureCount };
}

async function claimSend(dayKey, slotTime, classId) {
  const id = `${dayKey}_${slotTime.replace(":", "")}_${classId}`;
  const ref = admin.firestore().collection("sentNotifs").doc(id);
  try {
    await ref.create({
      dayKey,
      slotTime,
      classId,
      at: admin.firestore.FieldValue.serverTimestamp()
    });
    return true;
  } catch (e) {
    return false;
  }
}

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "classdash-notifs", multiClass: true });
});

app.get("/tick", async (req, res) => {
  try {
    if (process.env.CRON_SECRET && req.query.key !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: "unauthorized" });
    }

    initFirebase();
    const { time, dayKey, day } = nowIST();

    // Skip Sundays
    if (day === 0) {
      return res.json({ ok: true, time, action: "skip-sunday" });
    }

    const nowMin = minutesOf(time);
    let entry = null;
    for (const e of NOTIF_SCHEDULE) {
      const entryMin = minutesOf(e.time);
      if (nowMin >= entryMin && nowMin < entryMin + 2) {
        entry = e;
        break;
      }
    }
    if (!entry) {
      return res.json({ ok: true, time, action: "none" });
    }

    const byClass = await getTokensByClass();
    const results = [];

    for (const [classId, tokens] of Object.entries(byClass)) {
      const okToSend = await claimSend(dayKey, entry.time, classId);
      if (!okToSend) {
        results.push({ classId, action: "already-sent" });
        continue;
      }
      const override = await loadTodayOverride(classId, dayKey);
      const msg = buildMessage(entry, day, classId, override);
      if (msg.skipSend) {
        results.push({ classId, action: "skipped-period", title: msg.title });
        continue;
      }
      const sendResult = await sendToTokens(tokens, msg.title, msg.body);
      results.push({
        classId,
        action: "sent",
        matched: entry.time,
        title: msg.title,
        body: msg.body,
        usedOverride: !!override,
        ...sendResult
      });
    }

    res.json({ ok: true, time, matched: entry.time, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.get("/test-send", async (req, res) => {
  try {
    if (process.env.CRON_SECRET && req.query.key !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: "unauthorized" });
    }
    initFirebase();
    const classId = (req.query.class || "").toLowerCase();
    const title = req.query.title || "📚 Class Dashboard test";
    const body = req.query.body || "Force notification — system OK";
    const byClass = await getTokensByClass();
    let tokens = [];
    if (classId && byClass[classId]) tokens = byClass[classId];
    else tokens = Object.values(byClass).flat();
    const result = await sendToTokens(tokens, title, body);
    res.json({ ok: true, action: "test-send", classId: classId || "all", title, body, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.listen(PORT, () => console.log("classdash-notifs multi-class on", PORT));
