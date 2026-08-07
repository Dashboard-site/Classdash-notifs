const express = require("express");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 3000;

const NOTIF_SCHEDULE = [
  { time: "08:20", type: "assembly",  idx: null, prev: null,       prevLabel: null },
  { time: "08:40", type: "period",    idx: 0,    prev: "assembly", prevLabel: "Assembly" },
  { time: "09:20", type: "period",    idx: 1,    prev: "period",   prevLabel: "Period 0" },
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

// Same as site (0=Sun … 6=Sat)
const TIMETABLES = {
  0: Array(10).fill({ subject: "None", teacher: "-" }),
  1: [
    { subject: "Chemistry", teacher: "Ashley tr." },
    { subject: "Physics", teacher: "Shyni tr." },
    { subject: "Maths", teacher: "Renya tr." },
    { subject: "Computer Science", teacher: "Sarala tr." },
    { subject: "English", teacher: "Manoj Kuriakose sir" },
    { subject: "Optional Subject", teacher: "-" },
    { subject: "Maths", teacher: "Sujith sir" },
    { subject: "Chemistry", teacher: "Vimal sir" },
    { subject: "Physics Practical", teacher: "-" },
    { subject: "Chemistry Practical", teacher: "-" }
  ],
  2: [
    { subject: "Computer Science", teacher: "Sarala tr." },
    { subject: "Chemistry", teacher: "Vimal sir" },
    { subject: "Physics", teacher: "Deepesh sir" },
    { subject: "Maths", teacher: "Sujith sir" },
    { subject: "English", teacher: "Manoj Kuriakose sir" },
    { subject: "Optional Subject", teacher: "-" },
    { subject: "English", teacher: "Manoj Mathew sir" },
    { subject: "Computer Science", teacher: "Sarala tr." },
    { subject: "P.T.", teacher: "Abin sir" },
    { subject: "Chemistry", teacher: "Ashley tr." }
  ],
  3: [
    { subject: "Chemistry", teacher: "Ashley tr." },
    { subject: "Computer Science", teacher: "Sarala tr." },
    { subject: "Optional Subject", teacher: "-" },
    { subject: "Maths", teacher: "Sujith sir" },
    { subject: "Chemistry", teacher: "Vimal sir" },
    { subject: "Physics", teacher: "Deepesh sir" },
    { subject: "Physics", teacher: "Shyni tr." },
    { subject: "Maths", teacher: "Renya tr." },
    { subject: "Computer Science", teacher: "Sarala tr." },
    { subject: "M.P.T.", teacher: "-" }
  ],
  4: [
    { subject: "Chemistry", teacher: "Ashley tr." },
    { subject: "Physics", teacher: "Deepesh sir" },
    { subject: "English", teacher: "Manoj Mathew sir" },
    { subject: "Maths", teacher: "Sujith sir" },
    { subject: "Physics", teacher: "Shyni tr." },
    { subject: "Chemistry", teacher: "Vimal sir" },
    { subject: "Optional Subject", teacher: "-" },
    { subject: "Maths", teacher: "Renya tr." },
    { subject: "Computer Science", teacher: "Sarala tr." },
    { subject: "Library", teacher: "Navya tr." }
  ],
  5: [
    { subject: "Physics", teacher: "Shyni tr." },
    { subject: "Chemistry", teacher: "Vimal sir" },
    { subject: "Computer Science", teacher: "Sarala tr." },
    { subject: "Optional Subject", teacher: "-" },
    { subject: "Maths", teacher: "Renya tr." },
    { subject: "Physics", teacher: "Deepesh sir" },
    { subject: "English", teacher: "Manoj Kuriakose sir" },
    { subject: "Computer Science", teacher: "Sarala tr." },
    { subject: "Chemistry", teacher: "Ashley tr." },
    { subject: "Maths", teacher: "Sujith sir" }
  ],
  6: [
    { subject: "Chemistry", teacher: "Ashley tr." },
    { subject: "Computer Science", teacher: "Sarala tr." },
    { subject: "Physics", teacher: "Shyni tr." },
    { subject: "English", teacher: "Manoj Kuriakose sir" },
    { subject: "Maths", teacher: "Sujith sir" },
    { subject: "Optional Subject", teacher: "-" },
    { subject: "Maths", teacher: "Renya tr." },
    { subject: "English", teacher: "Manoj Mathew sir" },
    { subject: "Computer Science", teacher: "Sarala tr." },
    { subject: "Physics", teacher: "Deepesh sir" }
  ]
};

function initFirebase() {
  if (admin.apps.length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase env vars");
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
  // 0=Sun … map from weekday
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = map[parts.weekday] ?? new Date().getDay();
  return { time, dayKey, day };
}

function minutesOf(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function buildMessage(entry, day) {
  const tt = TIMETABLES[day] || TIMETABLES[0];

  if (entry.type === "assembly") {
    return {
      title: "🙏 Prayer / Assembly Time",
      body: "Please proceed to the assembly."
    };
  }

  if (entry.type === "break") {
    const prevIdx = entry.prevLabel ? parseInt(String(entry.prevLabel).replace("Period ", ""), 10) : NaN;
    const prev = Number.isInteger(prevIdx) ? tt[prevIdx] : null;
    const prevSub = prev ? prev.subject : entry.prevLabel;
    return {
      title: "☕ Break Time",
      body: `${entry.prevLabel}${prevSub ? ", " + prevSub : ""} over · Break until ${entry.breakEnd}`
    };
  }

  if (entry.type === "lunch") {
    const prevIdx = entry.prevLabel ? parseInt(String(entry.prevLabel).replace("Period ", ""), 10) : NaN;
    const prev = Number.isInteger(prevIdx) ? tt[prevIdx] : null;
    const prevSub = prev ? prev.subject : "";
    return {
      title: "🍽️ Lunch Break",
      body: `${entry.prevLabel}${prevSub ? ", " + prevSub : ""} over · Lunch until ${entry.breakEnd}`
    };
  }

  if (entry.type === "dismissed") {
    const prevIdx = entry.prevLabel ? parseInt(String(entry.prevLabel).replace("Period ", ""), 10) : NaN;
    const prev = Number.isInteger(prevIdx) ? tt[prevIdx] : null;
    return {
      title: "🏁 School Dismissed",
      body: `${entry.prevLabel}${prev ? ", " + prev.subject : ""} over · See you tomorrow!`
    };
  }

  // period
  const cur = tt[entry.idx] || { subject: "—", teacher: "—" };
  const sub = cur.subject;
  const teach = cur.teacher;

  if (entry.prev === "assembly") {
    return {
      title: `📚 Current: ${sub} · ${teach}`,
      body: "🙏 Prayer / Assembly over"
    };
  }

  if (entry.prev === "period" && entry.prevLabel) {
    const prevIdx = parseInt(String(entry.prevLabel).replace("Period ", ""), 10);
    const prev = tt[prevIdx];
    const prevSub = prev ? prev.subject : "—";
    const isAssembly = String(prevSub).toLowerCase().includes("assembly");
    const overLabel = isAssembly
      ? "Prayer/Assembly over"
      : `${entry.prevLabel}, ${prevSub} over`;
    return {
      title: `📚 ${overLabel}`,
      body: `Next: ${sub} · ${teach}`
    };
  }

  if (entry.prev === "break") {
    return {
      title: `📚 Period ${entry.idx}: ${sub} · ${teach}`,
      body: "Break over"
    };
  }

  if (entry.prev === "lunch") {
    return {
      title: `📚 Period ${entry.idx}: ${sub} · ${teach}`,
      body: "Lunch over"
    };
  }

  return {
    title: `📚 Period ${entry.idx}: ${sub} · ${teach}`,
    body: "Starting now"
  };
}

async function getTokens() {
  const snap = await admin.firestore().collection("fcmTokens").get();
  return snap.docs.map(d => d.data().token).filter(Boolean);
}

async function sendToAll(title, body) {
  const tokens = await getTokens();
  if (!tokens.length) return { sent: 0, failed: 0, detail: "no tokens" };

  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: {
      fcmOptions: {
        link: process.env.APP_URL || "https://dashboard.xiicmarygiri.workers.dev/"
      }
    }
  });
  return { sent: res.successCount, failed: res.failureCount };
}

/** Returns true if this is the first claim for this slot today */
async function claimSend(dayKey, slotTime) {
  const id = `${dayKey}_${slotTime.replace(":", "")}`;
  const ref = admin.firestore().collection("sentNotifs").doc(id);
  try {
    await ref.create({
      dayKey,
      slotTime,
      at: admin.firestore.FieldValue.serverTimestamp()
    });
    return true;
  } catch (e) {
    // already exists → duplicate
    return false;
  }
}

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "classdash-notifs" });
});

app.get("/tick", async (req, res) => {
  try {
    if (process.env.CRON_SECRET && req.query.key !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: "unauthorized" });
    }

    initFirebase();
    const { time, dayKey, day } = nowIST();
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

    const okToSend = await claimSend(dayKey, entry.time);
    if (!okToSend) {
      return res.json({ ok: true, time, matched: entry.time, action: "already-sent" });
    }

    const { title, body } = buildMessage(entry, day);
    const result = await sendToAll(title, body);

    res.json({
      ok: true,
      time,
      matched: entry.time,
      action: "sent",
      title,
      body,
      ...result
    });
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

    const title = req.query.title || "📚 Class Dashboard test";
    const body  = req.query.body  || "Force notification — system OK";

    const result = await sendToAll(title, body);
    res.json({ ok: true, action: "test-send", title, body, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.listen(PORT, () => console.log("classdash-notifs on", PORT));
