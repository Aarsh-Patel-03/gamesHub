require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const { socketAuth, socketEvents } = require("./controllers/socketHandler");

const app = express();
const server = http.createServer(app);

// 👇 CHANGE 1: Simplified CORS for Socket.IO
const allowedOrigins = [
  "http://localhost:3000",
  "https://games-hub-indol.vercel.app",
];
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, // 👈 Wildcard = no issues
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// 👇 CHANGE 2: App CORS (HTTP APIs only)
app.use(
  cors({
    // origin: [
    //   "http://localhost:3000",
    //   "http://localhost:3001",
    //   "http://localhost:3002",
    //   "http://localhost:3003",
    // ],
    origin: allowedOrigins,
  }),
);
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("Mongo error:", err));

// Routes (HTTP APIs)
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

// Socket setup (WebSocket)
socketAuth(io);
socketEvents(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Backend on http://localhost:${PORT}`);
  console.log("Socket.IO ready");
});
