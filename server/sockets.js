// sockets.js — Mongoose + MongoDB Atlas version

// Import the Mongoose model for User data
const User = require("./models/User");

// Maps userId to socket.id for tracking
const userIdToSocketId = {};

// Counter and tracker for how many users reached 🌻 Full Bloom
let fullBloomCount = 0;
const fullBloomIDs = new Set(); // Store unique user IDs who reached full bloom

// Export a function that sets up all socket event listeners
module.exports = function (io) {
  // Triggered when a user connects to the server
  io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    // Check if the accountId is already taken in the database
    socket.on("check accountId", async (accountId, callback) => {
      const existing = await User.findOne({ "identity.accountId": accountId });
      callback(!existing); // Return true if accountId is available
    });

    // Handle session initialization request
    socket.on("request session", async ({ userId, mood }) => {
      // Link userId to socket.id
      userIdToSocketId[userId] = socket.id;

      // Check if this user already exists in the database
      let user = await User.findOne({ id: userId });

      // If not found, create a new one
      if (!user) {
        user = new User({
          id: userId,
          x: 100,
          y: 200,
          growth: getGrowthStage(0).emoji,
          activeTime: 0,
          lastSeen: Date.now(),
          identity: { mood: mood || "🌱", accountId: userId },
        });
      } else if (mood) {
        // Update mood if provided
        user.identity.mood = mood;
      }

      await user.save();

      // Track full bloom status
      if (user.growth === "🌻") fullBloomIDs.add(user.id);
      fullBloomCount = fullBloomIDs.size;

      // Send session data back to the client
      socket.emit("restore session", {
        activeTime: user.activeTime,
        mood: user.identity.mood,
      });

      // Send all current users to this client
      const allUsers = await loadAllUsers();
      socket.emit("existing users", allUsers);

      // Send current full bloom count
      socket.emit("plant count", fullBloomCount);
    });

    // Handle live cursor/growth updates from clients
    socket.on("cursor update", async (data) => {
      const id = data.id || socket.id;
      data.lastSeen = Date.now();

      // Save or update user info in the database
      const updated = await User.findOneAndUpdate(
        { id },
        { ...data, lastSeen: Date.now() },
        { upsert: true, new: true }
      );

      // Update bloom count if this user just reached full bloom
      if (updated.growth === "🌻" && !fullBloomIDs.has(id)) {
        fullBloomIDs.add(id);
        fullBloomCount++;
        io.emit("plant count", fullBloomCount);
      }

      // Broadcast update to other clients
      socket.broadcast.emit("cursor update", { id, ...data });
    });

    // Handle whisper messages between users
    socket.on("whisper", async (message) => {
      // Broadcast whisper to everyone
      io.emit("whisper", {
        id: socket.id,
        text: message,
      });

      // Get sender's userId from socket
      const sender = await User.findOne({ id: getUserIdBySocket(socket.id) });
      if (!sender) return;

      const senderAccountId = sender.identity?.accountId;

      // Load all users from database
      const all = await User.find();

      // For each user, increase growth (more for sender)
      for (const user of all) {
        const isSender = user.identity?.accountId === senderAccountId;
        user.activeTime += isSender ? 200 : 100;
        user.growth = getGrowthStage(user.activeTime).emoji;
        user.lastSeen = Date.now();

        if (user.growth === "🌻" && !fullBloomIDs.has(user.id)) {
          fullBloomIDs.add(user.id);
          fullBloomCount++;
          io.emit("plant count", fullBloomCount);
        }

        await user.save();

        // Broadcast user update to all clients
        io.emit("cursor update", user.toObject());
      }
    });

    // Handle mood change requests
    socket.on("mood change", async ({ mood, id }) => {
      const user = await User.findOne({ id });
      if (!user) return;

      // Update mood and growth
      user.identity.mood = mood;
      user.activeTime += 400;
      user.lastSeen = Date.now();
      user.growth = getGrowthStage(user.activeTime).emoji;

      // Update bloom count if needed
      if (user.growth === "🌻" && !fullBloomIDs.has(id)) {
        fullBloomIDs.add(id);
        fullBloomCount++;
        io.emit("plant count", fullBloomCount);
      }

      await user.save();

      // Send update to everyone
      io.emit("cursor update", user.toObject());
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });
};

// Helper to find a userId by socketId
function getUserIdBySocket(socketId) {
  return Object.entries(userIdToSocketId).find(
    ([, sid]) => sid === socketId
  )?.[0];
}

// Helper to determine growth stage by active time
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

// Load all users from the database and return as a dictionary
async function loadAllUsers() {
  const docs = await User.find();
  const all = {};
  for (const u of docs) all[u.id] = u.toObject();
  return all;
}
