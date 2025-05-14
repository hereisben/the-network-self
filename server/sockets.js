const { loadUsers, saveUsers } = require("./fileStore");

let allUsers = loadUsers();
const userIdToSocketId = {};
let fullBloomCount = Object.values(allUsers).filter(
  (u) => u.growth === "🌻"
).length;
const fullBloomIDs = new Set(
  Object.keys(allUsers).filter((id) => allUsers[id].growth === "🌻")
);

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    socket.on("check accountId", (accountId, callback) => {
      const taken = Object.values(allUsers).some(
        (u) => u.identity?.accountId === accountId
      );
      callback(!taken);
    });

    socket.on("request session", ({ userId, mood }) => {
      userIdToSocketId[userId] = socket.id;

      if (!allUsers[userId]) {
        // New user
        allUsers[userId] = {
          id: userId,
          x: 100,
          y: 200,
          growth: getGrowthStage(0).emoji,
          activeTime: 0,
          lastSeen: Date.now(),
          identity: { mood: mood || "🌱", accountId: userId },
        };
      } else if (mood) {
        // Existing user, update mood if provided
        allUsers[userId].identity.mood = mood;
      }

      saveUsers(allUsers);

      const previous = allUsers[userId];
      socket.emit("restore session", {
        activeTime: previous.activeTime || 0,
        mood: previous.identity?.mood || "",
      });

      socket.emit("existing users", allUsers);
      socket.emit("plant count", fullBloomCount);
    });

    socket.on("cursor update", (data) => {
      const id = data.id || socket.id;

      if (!data.identity?.accountId) {
        data.identity = { ...data.identity, accountId: id };
      }

      allUsers[id] = { ...data, lastSeen: Date.now() };

      if (data.growth === "🌻" && !fullBloomIDs.has(id)) {
        fullBloomIDs.add(id);
        fullBloomCount++;
        io.emit("plant count", fullBloomCount);
      }

      saveUsers(allUsers);
      io.emit("cursor update", { id, ...data });
    });

    socket.on("whisper", (message) => {
      io.emit("whisper", {
        id: socket.id,
        text: message,
      });

      const senderAccountId = Object.values(allUsers).find(
        (u) => userIdToSocketId[u.id] === socket.id
      )?.identity?.accountId;

      for (const id in allUsers) {
        const user = allUsers[id];
        if (!user) continue;

        const isSender = user.identity?.accountId === senderAccountId;
        user.activeTime += isSender ? 200 : 100;
        user.growth = getGrowthStage(user.activeTime).emoji;
        user.lastSeen = Date.now();

        if (user.growth === "🌻" && !fullBloomIDs.has(id)) {
          fullBloomIDs.add(id);
          fullBloomCount++;
          io.emit("plant count", fullBloomCount);
        }

        io.emit("cursor update", {
          id,
          ...user,
        });
      }

      saveUsers(allUsers);
    });

    socket.on("mood change", ({ mood, id }) => {
      const socketId = userIdToSocketId[id];
      const user = allUsers[socketId] || allUsers[id];
      if (user) {
        user.identity.mood = mood;
        user.activeTime += 400;
        user.lastSeen = Date.now();
        user.growth = getGrowthStage(user.activeTime).emoji;

        if (user.growth === "🌻" && !fullBloomIDs.has(id)) {
          fullBloomIDs.add(id);
          fullBloomCount++;
          io.emit("plant count", fullBloomCount);
        }

        io.emit("cursor update", {
          id,
          ...user,
        });

        saveUsers(allUsers);
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
      saveUsers(allUsers);
    });
  });
};

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
