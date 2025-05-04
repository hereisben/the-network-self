const socket = io();
const users = {};
let activeTime = 0;
let isLocked = false;

let userId = localStorage.getItem("userId");
if (!userId) {
  userId = crypto.randomUUID();
  localStorage.setItem("userId", userId);
}

let mood =
  localStorage.getItem("mood") || prompt("What's your vibe right now?");
if (!localStorage.getItem("mood")) {
  localStorage.setItem("mood", mood);
}

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("avatarText").textContent = "Key: [Ctrl] | [Esc]";
  const storedTime = Number(localStorage.getItem("activeTime")) || 0;
  activeTime = storedTime;
  updateProgressBar(activeTime);
  const x = Number(localStorage.getItem("lastX")) || 100;
  const y = Number(localStorage.getItem("lastY")) || 200;
  const stage = getGrowthStage(activeTime);

  users[userId] = {
    id: userId,
    x,
    y,
    growth: stage.emoji,
    activeTime,
    lastSeen: Date.now(),
    identity: { mood },
  };
});

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function getGrowthStage(t) {
  if (t > 42000) return { emoji: "🌻", name: "Full Bloom" };
  if (t > 37000) return { emoji: "🌼", name: "Peak Bloom" };
  if (t > 32000) return { emoji: "🌺", name: "Flowering" };
  if (t > 26000) return { emoji: "🌸", name: "Budding" };
  if (t > 20000) return { emoji: "🌳", name: "Mature Tree" };
  if (t > 14000) return { emoji: "🌲", name: "Young Tree" };
  if (t > 9000) return { emoji: "🌾", name: "Vegetative" };
  if (t > 5000) return { emoji: "🌿", name: "Seedling" };
  if (t > 2000) return { emoji: "🌱", name: "Germination" };
  return { emoji: "🌰", name: "Seed" };
}

function updateProgressBar(activeTime) {
  const stage = getGrowthStage(activeTime);
  const percent = Math.min(activeTime / 42000, 1);

  document.getElementById("growthLabel").textContent = `${(
    percent * 100
  ).toFixed(1)}% / 100.0%`;
  document.getElementById(
    "growthStage"
  ).textContent = `Stage: ${stage.emoji} ${stage.name}`;

  for (let i = 0; i < 10; i++) {
    const segment = document.getElementById(`bar${i + 1}`);
    segment.style.width = `${
      Math.max(Math.min(percent - i * 0.1, 0.1), 0) * 100
    }%`;
  }
}

function drawUser(x, y, emoji, alpha = 1, identity = {}) {
  ctx.globalAlpha = alpha;
  if (identity.mood) {
    const text = identity.mood;
    ctx.font = "18px sans-serif";
    ctx.textAlign = "center";
    const textWidth = ctx.measureText(text).width;
    const boxWidth = textWidth + 24;
    const boxHeight = 26;
    const boxX = x + 35 - boxWidth / 2;
    const boxY = y - 70;
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, 6);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.fillText(text, x + 35, boxY + 18);
  }
  ctx.font = "50px sans-serif";
  ctx.fillStyle = "white";
  ctx.textAlign = "start";
  ctx.fillText(emoji, x, y);
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const margin = 30;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(
    margin,
    70,
    canvas.width / window.devicePixelRatio - margin * 2,
    canvas.height / window.devicePixelRatio - 140
  );

  const now = Date.now();
  for (const id in users) {
    const user = users[id];
    const alpha = now - user.lastSeen < 5000 ? 1 : 0.3;
    drawUser(user.x, user.y, user.growth, alpha, user.identity);
  }
  requestAnimationFrame(draw);
}
draw();

setInterval(() => {
  const now = Date.now();
  for (const id in users) {
    const user = users[id];
    const inactiveDuration = now - user.lastSeen;
    if (inactiveDuration < 5000 || user.activeTime <= 0) continue;
    user.activeTime -= 25;
    if (user.activeTime < 0) user.activeTime = 0;
    const stage = getGrowthStage(user.activeTime);
    user.growth = stage.emoji;
  }
}, 100);

socket.on("connect", () => {
  socket.emit("request session", { userId });

  setInterval(() => {
    activeTime += 1000;
    localStorage.setItem("activeTime", activeTime);
    const stage = getGrowthStage(activeTime);
    updateProgressBar(activeTime);
    const x = Number(localStorage.getItem("lastX")) || 100;
    const y = Number(localStorage.getItem("lastY")) || 200;
    const data = {
      id: userId,
      x,
      y,
      growth: stage.emoji,
      activeTime,
      lastSeen: Date.now(),
      identity: { mood },
    };
    socket.emit("cursor update", data);
    users[userId] = data;
  }, 100);
});

const input = document.getElementById("whisperInput");
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && input.value.trim() !== "") {
    socket.emit("whisper", input.value.trim());
    input.value = "";
  }
});

socket.on("whisper", (msg) => showWhisper(msg.text));

function showWhisper(text) {
  const div = document.createElement("div");
  div.textContent = text;
  div.className = "whisper";
  document.body.appendChild(div);
  div.style.left = Math.random() * window.innerWidth + "px";
  div.style.top = Math.random() * window.innerHeight + "px";
  setTimeout(() => div.remove(), 10 * 60 * 1000);
}

socket.on("restore session", (data) => {
  activeTime =
    data?.activeTime || Number(localStorage.getItem("activeTime")) || 0;
  mood = data?.mood || mood;
  updateProgressBar(activeTime);
  users[userId] = {
    id: userId,
    x: Number(localStorage.getItem("lastX")) || 100,
    y: Number(localStorage.getItem("lastY")) || 200,
    growth: getGrowthStage(activeTime).emoji,
    activeTime,
    lastSeen: Date.now(),
    identity: { mood },
  };
});

socket.on("existing users", (existing) => {
  for (const id in existing) {
    users[id] = existing[id];
  }
});

socket.on("cursor update", (data) => {
  users[data.id] = {
    ...data,
    lastSeen: Date.now(),
    identity: data.identity || {},
  };
});

socket.on("plant count", (count) => {
  document.getElementById(
    "plantCount"
  ).textContent = `🌻 Plants we’ve grown together: ${count}`;
});

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

let lastMoodChange = 0;
const MOOD_COOLDOWN = 30000; // 30 seconds

document.addEventListener("keydown", (e) => {
  if (e.key === "Control") {
    const now = Date.now();
    if (now - lastMoodChange < MOOD_COOLDOWN) {
      alert("Please wait before changing your mood again.");
      return;
    }

    const newMood = prompt("Change your mood:");
    if (newMood && newMood.trim() !== "") {
      mood = newMood.trim();
      localStorage.setItem("mood", mood);
      lastMoodChange = now;

      socket.emit("mood change", { mood, id: userId });

      // Optional: also update local display immediately
      if (users[userId]) {
        users[userId].identity.mood = mood;
      }
    }
  }
});

document.addEventListener("mousemove", (e) => {
  if (isLocked) return;
  const x = Math.max(
    30,
    Math.min(e.clientX, canvas.width / window.devicePixelRatio - 100)
  );
  const y = Math.max(
    130,
    Math.min(e.clientY, canvas.height / window.devicePixelRatio - 70)
  );
  localStorage.setItem("lastX", x);
  localStorage.setItem("lastY", y);

  const stage = getGrowthStage(activeTime);

  const data = {
    id: userId,
    x,
    y,
    growth: stage.emoji,
    activeTime,
    lastSeen: Date.now(),
    identity: { mood },
  };

  socket.emit("cursor update", data);
  users[userId] = data;
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    isLocked = !isLocked;
  }
});
