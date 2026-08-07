const express = require("express");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 3000;

// Same schedule as index.html (IST)
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

// Prevent double-send in the same minute
const fired = new Set();

function initFirebase() {
  if (admin.apps.length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";

  // Render often stores newlines as \n
  privateKey = privateKey.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey
    })
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
    day: "2-digit"
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  const time = `${parts.hour}:${parts.minute}`;
  const dayKey = `${parts.year}-${parts.month}-${parts.day}`;
  return { time, dayKey };
}

function buildMessage(entry) {
  if (entry.type === "assembly") {
    return { title: "🙏 Prayer / Assembly Time", body: "Please proceed to the assembly." };
  }
  if (entry.type === "break") {
    return {
      title: "☕ Break Time",
      body: `${entry.prevLabel} over · Break until ${entry.breakEnd}`
    };
  }
  if (entry.type === "lunch") {
    return {
      title: "🍽️ Lunch Break",
      body: `${entry.prevLabel} over · Lunch until ${entry.breakEnd}`
    };
  }
  if (entry.type === "dismissed") {
    return {
      title: "🏁 School Dismissed",
      body: `${entry.prevLabel} over · See you tomorrow!`
    };
  }
  // period
  return {
    title: `📚 Period ${entry.idx}`,
    body: entry.prev === "assembly"
      ? "Prayer / Assembly over · Next period starting"
      : entry.prev === "break"
        ? "Break over · Next period starting"
        : entry.prev === "lunch"
          ? "Lunch over · Next period starting"
          : `${entry.prevLabel || "Previous period"} over · Next period starting`
  };
}

async function getTokens() {
  const snap = await admin.firestore().collection("fcmTokens").get();
  return snap.docs.map(d => d.data().token).filter(Boolean);
}

async function sendToAll(title, body) {
  const tokens = await getTokens();
  if (!tokens.length) {
    return { sent: 0, detail: "no tokens" };
  }

  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: {
      fcmOptions: {
        link: process.env.APP_URL || "https://dashboard.xiicmarygiri.workers.dev/"
      }
    }
  });

  return {
    sent: res.successCount,
    failed: res.failureCount
  };
}

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "classdash-notifs" });
});

app.get("/tick", async (req, res) => {
  try {
    // Optional simple secret: ?key=YOUR_SECRET
    if (process.env.CRON_SECRET) {
      if (req.query.key !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: "unauthorized" });
      }
    }

    initFirebase();
    const { time, dayKey } = nowIST();
    const entry = NOTIF_SCHEDULE.find(e => e.time === time);

    if (!entry) {
      return res.json({ ok: true, time, action: "none" });
    }

    const fireKey = `${dayKey}-${time}`;
    if (fired.has(fireKey)) {
      return res.json({ ok: true, time, action: "already-sent" });
    }

    const { title, body } = buildMessage(entry);
    const result = await sendToAll(title, body);
    fired.add(fireKey);

    // Keep set from growing forever
    if (fired.size > 50) {
      const first = fired.values().next().value;
      fired.delete(first);
    }

    res.json({ ok: true, time, action: "sent", title, body, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.listen(PORT, () => {
  console.log("classdash-notifs on", PORT);
});