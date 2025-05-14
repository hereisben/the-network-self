const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  id: String,
  x: Number,
  y: Number,
  growth: String,
  activeTime: Number,
  lastSeen: Number,
  identity: {
    mood: String,
    accountId: String,
  },
});

module.exports = mongoose.model("User", userSchema);
