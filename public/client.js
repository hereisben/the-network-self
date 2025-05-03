const socket = io();
const users = {};
let activeTime = 0;
let mood =
  localStorage.getItem("mood") || prompt("What's your vibe right now?");
if (!localStorage.getItem("mood")) {
  localStorage.setItem("mood", mood);
}

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("avatarText").textContent = `You’re growing a plant!`;
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

function drawUser(x, y, emoji, alpha = 1, identity = {}) {
  ctx.globalAlpha = alpha;

  // Draw mood/status box above the emoji
  if (identity.mood) {
    const text = identity.mood;
    ctx.font = "18px sans-serif";
    ctx.textAlign = "center";

    // Measure text size
    const textWidth = ctx.measureText(text).width;
    const boxWidth = textWidth + 16;
    const boxHeight = 26;
    const boxX = x + 55 - boxWidth / 2;
    const boxY = y - 70;

    // Draw black rounded rectangle background
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, 6);
    ctx.fill();

    // Draw mood text
    ctx.fillStyle = "white";
    ctx.fillText(text, x + 55, boxY + 18);
  }

  // Draw the emoji
  ctx.font = "50px sans-serif";
  ctx.fillStyle = "white";
  ctx.textAlign = "start";
  ctx.fillText(emoji, x, y);

  ctx.globalAlpha = 1;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const now = Date.now();

  for (const id in users) {
    const user = users[id];
    const secondsSinceSeen = (now - user.lastSeen) / 1000;
    const alpha =
      secondsSinceSeen < 15
        ? 1
        : Math.max(0.3, 1 - (secondsSinceSeen - 15) / 60);
    drawUser(user.x, user.y, user.growth, alpha, user.identity);
  }
  requestAnimationFrame(draw);
}
draw();

socket.on("existing users", (existing) => {
  for (const id in existing) {
    users[id] = existing[id];
  }
});

socket.emit("request session");

socket.on("restore session", (data) => {
  if (data && data.activeTime) {
    activeTime = data.activeTime;
  } else {
    const storedTime = Number(localStorage.getItem("activeTime")) || 0;
    activeTime = storedTime;
  }

  if (data && data.mood) {
    mood = data.mood;
  }
});

socket.on("cursor update", (data) => {
  users[data.id] = {
    ...data,
    lastSeen: Date.now(),
    identity: data.identity || {},
  };
});

socket.on("connect", () => {
  document.addEventListener("mousemove", (e) => {
    activeTime += 100;
    localStorage.setItem("activeTime", activeTime);
    const stage = getGrowthStage(activeTime);
    const data = {
      x: e.clientX,
      y: e.clientY,
      growth: stage.emoji,
      activeTime,
      lastSeen: Date.now(),
      identity: {
        mood,
      },
    };
    // Update growth progress bar
    const percent = Math.min(activeTime / 42000, 1);
    document.getElementById("growthLabel").textContent = `${Math.min(
      activeTime,
      42000
    )} / 42000`;
    document.getElementById(
      "growthStage"
    ).textContent = `Stage: ${stage.emoji} ${stage.name}`;

    // Update each segment width
    for (let i = 0; i < 10; i++) {
      const segment = document.getElementById(`bar${i + 1}`);
      segment.style.width = `${
        Math.max(Math.min(percent - i * 0.1, 0.1), 0) * 100
      }%`;
    }
    socket.emit("cursor update", data);
    users[socket.id] = data;
  });
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

socket.on("plant count", (count) => {
  const countBox = document.getElementById("plantCount");
  if (countBox) {
    countBox.textContent = `🌻 Plants we’ve grown together: ${count}`;
  }
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
