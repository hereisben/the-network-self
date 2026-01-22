const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
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
