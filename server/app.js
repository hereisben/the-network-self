// Load environment variables from .env file
require("dotenv").config();

// Import Mongoose to interact with MongoDB
const mongoose = require("mongoose");

// Connect to MongoDB Atlas using connection string from .env
mongoose
  .connect(process.env.MONGO_URI, {
    dbName: "plantNetwork", // Name of the database to use
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => console.log("✅ Connected to MongoDB Atlas")) // Success message
  .catch((err) => console.error("❌ MongoDB connection error:", err)); // Error message

// Import core modules
const express = require("express");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");

// Create an Express app
const app = express();

// Create a basic HTTP server using Express app
const server = http.createServer(app);

// Attach Socket.IO to the HTTP server
const io = socketio(server);

// Import and initialize socket logic (real-time features)
require("./sockets")(io); // Pass io instance to the sockets module

// Serve all files inside /public as static files (like index.html, client.js, etc.)
app.use(express.static(path.join(__dirname, "../public")));

// Choose port from .env or use 3030 by default
const PORT = process.env.PORT || 3030;

// Start server and listen for connections
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
