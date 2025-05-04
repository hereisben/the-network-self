const allUsers = {}; // Tracks all users
const userIdToSocketId = {}; // Maps persistent userId to socket.id
let fullBloomCount = 0;
const fullBloomIDs = new Set();

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    socket.on("request session", ({ userId }) => {
      // Remove ghost session with same userId
      if (userIdToSocketId[userId]) {
        const oldSocketId = userIdToSocketId[userId];
        delete allUsers[oldSocketId];
        fullBloomIDs.delete(oldSocketId);
      }

      userIdToSocketId[userId] = socket.id;

      const previous = Object.values(allUsers).find(
        (u) => u.identity?.userId === userId
      );

      if (previous) {
        socket.emit("restore session", {
          activeTime: previous.activeTime || 0,
          mood: previous.identity?.mood || "",
        });
      }

      // Send all known plants
      socket.emit("existing users", allUsers);

      // Sync bloom count
      socket.emit("plant count", fullBloomCount);
    });

    socket.on("cursor update", (data) => {
      const id = data.id || socket.id;
      allUsers[id] = {
        ...data,
        lastSeen: Date.now(),
      };

      // Track full bloom
      if (data.growth === "🌻" && !fullBloomIDs.has(id)) {
        fullBloomIDs.add(id);
        fullBloomCount++;
        io.emit("plant count", fullBloomCount);
      }

      io.emit("cursor update", {
        id,
        ...data,
      });
    });

    socket.on("whisper", (message) => {
      io.emit("whisper", {
        id: socket.id,
        text: message,
      });

      // Growth boost: sender and all users
      for (const id in allUsers) {
        const user = allUsers[id];
        user.activeTime =
          (user.activeTime || 0) + (id === socket.id ? 200 : 100);
        const newStage = getGrowthStage(user.activeTime);
        user.growth = newStage.emoji;
        user.lastSeen = Date.now();

        // Full bloom sync
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
    });

    socket.on("mood change", ({ mood, id }) => {
      const user = allUsers[id];
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
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });

  // Cleanup + subtract bloom if inactive
  setInterval(() => {
    const now = Date.now();
    for (const id in allUsers) {
      if (now - allUsers[id].lastSeen > 5000) {
        if (allUsers[id].growth === "🌻" && fullBloomIDs.has(id)) {
          fullBloomIDs.delete(id);
          fullBloomCount--;
          io.emit("plant count", fullBloomCount);
        }
        delete allUsers[id];
      }
    }
  }, 100);
};

// Helper to compute stage
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
