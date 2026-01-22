# 🌱 The Networked Plant Project

**Live demo:** https://the-network-self.onrender.com/

A real-time, browser-based net art project where each visitor grows a digital plant through presence and interaction. As more users join, a shared forest forms, reflecting collective activity over time.

This project explores how identity, mood, and presence can exist and persist in a shared online space.

---

## ✨ Features

- 🌰 Users start as a seed and grow through multiple stages
- 🌻 Shared counter tracks how many plants reach full bloom
- 💬 Anonymous whispers float across the canvas
- 🧠 Users set a mood or status visible to others
- 🎨 Emoji-based growth stages with live progress
- 🔁 Persistent sessions using `accountId`
- ⚡ Real-time updates via WebSockets

---

## 🛠 Tech Stack

### Frontend

- Vanilla JavaScript
- HTML5 Canvas
- CSS

### Backend

- Node.js
- Express
- Socket.IO
- MongoDB Atlas
- Mongoose

---

## 🔄 Data Flow Overview

- `localStorage` stores a persistent `accountId`
- Client connects via Socket.IO
- Server syncs user state with MongoDB
- Growth, mood, and activity persist across sessions

---

## 📌 Notes

`MongoDB` is the source of truth for user data

`localStorage` is only used for session identification

Designed as an exploratory net art experience rather than a traditional app
