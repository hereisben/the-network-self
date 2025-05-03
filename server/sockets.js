const allUsers = {}; // Keeps track of all users, active and inactive

let fullBloomCount = 0;
const fullBloomIDs = new Set();

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    // Send all known users to the new user
    socket.emit("existing users", allUsers);

    socket.emit("plant count", fullBloomCount);

    // Receive new user data (cursor + identity)
    socket.on("cursor update", (data) => {
      allUsers[socket.id] = {
        ...data,
        activeTime: data.activeTime,
        identity: data.identity,
        lastSeen: Date.now(),
      };

      if (data.growth === "🌻" && !fullBloomIDs.has(socket.id)) {
        fullBloomIDs.add(socket.id);
        fullBloomCount++;
        io.emit("plant count", fullBloomCount);
      }

      // Broadcast to others
      socket.broadcast.emit("cursor update", {
        id: socket.id,
        ...data,
      });
    });

    socket.on("request session", () => {
      const previous = allUsers[socket.id];
      if (previous) {
        socket.emit("restore session", {
          activeTime: previous.activeTime || 0,
          mood: previous.identity?.mood || "",
        });
      }
    });

    socket.on("whisper", (message) => {
      io.emit("whisper", {
        id: socket.id,
        text: message,
      });
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });

  // Clean up ghosts after 24 hours
  setInterval(() => {
    const now = Date.now();
    for (const id in allUsers) {
      if (now - allUsers[id].lastSeen > 0.1 * 60 * 60 * 1000) {
        delete allUsers[id];
      }
    }
  }, 10 * 60 * 1000); // every 10 minutes
};
