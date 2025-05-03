const express = require("express");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");

// Create app and HTTP server
const app = express();
const server = http.createServer(app);

// Attach Socket.IO to the server
const io = socketio(server);
require("./sockets")(io); // Load socket handlers

// Serve static files from /public
app.use(express.static(path.join(__dirname, "../public")));

// Start the server
const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
