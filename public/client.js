// Connect to the Socket.IO server
const socket = io();

// Store user data
const users = {};

// Track user's presence time
let activeTime = 0;

// Remember last sent position and growth to avoid redundant updates
let lastSentX = null;
let lastSentY = null;
let lastSentGrowth = null;

// Toggle to lock plant in place
let isLocked = false;

// Unique user identifier
let userId = null;

// User-chosen name
let accountId = null;

// Current mood emoji or text
let mood = null;

// Ask user to input or create an account ID
async function promptForAccountId() {
  while (!accountId) {
    const input = prompt("Enter your account ID (or create one):");
    if (!input) continue;
    accountId = input.trim();
    break;
  }
}

// Initialize session when page loads
async function initializeSession() {
  await promptForAccountId();

  // Ask for mood; default is "🌱" if skipped
  mood = prompt("What's your vibe right now?") || "🌱";

  // Show keyboard tips
  document.getElementById("avatarText").textContent =
    "Key: [Ctrl] Change Mood | [Esc] Lock/Unlock Plant";

  // Set current user ID to the accountId
  userId = accountId;

  // Start position and growth stage
  const x = 100;
  const y = 200;
  const stage = getGrowthStage(activeTime);

  // Add the current user to the users list
  users[userId] = {
    id: userId,
    x,
    y,
    targetX: x,
    targetY: y,
    growth: stage.emoji,
    activeTime,
    lastSeen: Date.now(),
    identity: { mood, accountId },
  };

  // Ask server to restore session if available
  socket.emit("request session", { userId, mood });

  // Update loop to send cursor + growth every 100ms
  setInterval(() => {
    if (isLocked) return;

    activeTime += 1;
    const stage = getGrowthStage(activeTime);
    updateProgressBar(activeTime);

    const x = users[userId].x;
    const y = users[userId].y;
    const growth = stage.emoji;

    // Only send update if something changed
    if (x !== lastSentX || y !== lastSentY || growth !== lastSentGrowth) {
      const data = {
        id: userId,
        x,
        y,
        growth,
        activeTime,
        lastSeen: Date.now(),
        identity: { mood, accountId },
      };

      socket.emit("cursor update", data);
      users[userId] = data;
      users[userId].targetX = x;
      users[userId].targetY = y;

      lastSentX = x;
      lastSentY = y;
      lastSentGrowth = growth;
    }
  }, 100);
}

// Set up the canvas
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Handle screen resizing
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

// Define growth stages based on time
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

// Show visual progress and labels for current growth stage
function updateProgressBar(activeTime) {
  const stage = getGrowthStage(activeTime);
  const percent = Math.min(activeTime / 42000, 1);
  document.getElementById("growthLabel").textContent = `${(
    percent * 100
  ).toFixed(1)}% / 100.0%`;
  document.getElementById(
    "growthStage"
  ).textContent = `Stage: ${stage.emoji} ${stage.name}`;

  // Update each segment of the progress bar
  for (let i = 0; i < 10; i++) {
    const segment = document.getElementById(`bar${i + 1}`);
    segment.style.width = `${
      Math.max(Math.min(percent - i * 0.1, 0.1), 0) * 100
    }%`;
  }
}

// Draw a single user’s emoji and mood
function drawUser(x, y, emoji, alpha = 1, identity = {}) {
  ctx.globalAlpha = alpha;

  // Draw mood label box if mood is set
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

  // Draw plant emoji
  ctx.font = "50px sans-serif";
  ctx.fillStyle = "white";
  ctx.textAlign = "start";
  ctx.fillText(emoji, x, y);
  ctx.globalAlpha = 1;
}

// Render loop to draw all users
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw canvas boundary
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

  // Loop through all users
  for (const id in users) {
    const user = users[id];
    const alpha = now - user.lastSeen < 5000 ? 1 : 0.3;

    // Smooth movement only for other users
    if (
      id !== userId &&
      user.targetX !== undefined &&
      user.targetY !== undefined
    ) {
      const dx = user.targetX - user.x;
      const dy = user.targetY - user.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 100) {
        user.x = user.targetX;
        user.y = user.targetY;
      } else {
        user.x += dx * 0.2;
        user.y += dy * 0.2;
      }
    }

    // Use target positions for others, actual for self
    const drawX = userId === id ? user.x : user.targetX ?? user.x;
    const drawY = userId === id ? user.y : user.targetY ?? user.y;

    drawUser(drawX, drawY, user.growth, alpha, user.identity);
  }

  requestAnimationFrame(draw);
}

draw(); // Start drawing loop

// Show floating whisper text
socket.on("whisper", (msg) => showWhisper(msg.text));

function showWhisper(text) {
  const div = document.createElement("div");
  div.textContent = text;
  div.className = "whisper";
  document.body.appendChild(div);
  div.style.left = Math.random() * window.innerWidth + "px";
  div.style.top = Math.random() * window.innerHeight + "px";
  setTimeout(() => div.remove(), 10 * 60 * 1000); // Remove after 10 mins
}

// Restore session from server data
socket.on("restore session", (data) => {
  activeTime = data?.activeTime || 0;
  mood = data?.mood || mood;
  updateProgressBar(activeTime);

  const x = 100;
  const y = 200;
  users[userId] = {
    id: userId,
    x,
    y,
    targetX: x,
    targetY: y,
    growth: getGrowthStage(activeTime).emoji,
    activeTime,
    lastSeen: Date.now(),
    identity: { mood, accountId },
  };
});

// Load existing users into the scene
socket.on("existing users", (existing) => {
  for (const id in existing) {
    const u = existing[id];
    users[id] = {
      ...u,
      targetX: u.x,
      targetY: u.y,
    };
  }
});

// Handle new cursor updates from server
socket.on("cursor update", (data) => {
  if (data.id === userId && isLocked) return;

  if (!users[data.id]) {
    users[data.id] = {
      ...data,
      targetX: data.x,
      targetY: data.y,
    };
  } else {
    const user = users[data.id];
    user.targetX = data.x;
    user.targetY = data.y;
    user.growth = data.growth;
    user.lastSeen = Date.now();
    user.identity = data.identity || {};
    if (data.id === userId) {
      user.x = data.x;
      user.y = data.y;
    }
  }

  if (data.id === userId) {
    activeTime = data.activeTime;
  }
});

// Update total full bloom count from server
socket.on("plant count", (count) => {
  document.getElementById(
    "plantCount"
  ).textContent = `🌻 Plants we’ve grown together: ${count}`;
});

// Control mood change timing
const MOOD_COOLDOWN = 30000;
let lastMoodChange = 0;

// Handle keyboard shortcuts
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
      lastMoodChange = now;
      socket.emit("mood change", { mood, id: userId });
      if (users[userId]) {
        users[userId].identity.mood = mood;
      }
    }
  }
});

// Track mouse movement and send to server
document.addEventListener("mousemove", (e) => {
  if (isLocked || !userId) return;
  const x = Math.max(
    30,
    Math.min(e.clientX, canvas.width / window.devicePixelRatio - 100)
  );
  const y = Math.max(
    130,
    Math.min(e.clientY, canvas.height / window.devicePixelRatio - 70)
  );

  users[userId].x = x;
  users[userId].y = y;
  users[userId].targetX = x;
  users[userId].targetY = y;

  const stage = getGrowthStage(activeTime);
  const data = {
    id: userId,
    x,
    y,
    growth: stage.emoji,
    activeTime,
    lastSeen: Date.now(),
    identity: { mood, accountId },
  };

  socket.emit("cursor update", data);
  users[userId] = data;
});

// Lock/unlock user movement
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    isLocked = !isLocked;
  }
});

// Send whisper on Enter key
document.getElementById("whisperInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.value.trim() !== "") {
    socket.emit("whisper", e.target.value.trim());
    e.target.value = "";
  }
});

// Helper to draw a rounded rectangle
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

// Start everything after page loads
window.addEventListener("DOMContentLoaded", initializeSession);
