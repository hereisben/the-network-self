const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "data", "users.json");

function loadUsers() {
  try {
    // Auto-create if missing
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, "{}");
    }
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to load users.json:", err);
    return {};
  }
}

function saveUsers(data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to save users.json:", err);
  }
}

module.exports = {
  loadUsers,
  saveUsers,
};
