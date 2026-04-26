const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, required: true },
  players: [{ type: String }],
  host: { type: String, required: true },   // ✅ ADD THIS
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', RoomSchema);