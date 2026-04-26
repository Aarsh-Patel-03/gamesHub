const Room = require('../models/Room');

exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find(
      { 
        players: { $exists: true, $ne: [] },  // Active rooms only
        'players.3': { $exists: false }      // Less than 4 players
      }, 
      'roomId players'
    )
    .sort({ createdAt: -1 })
    .limit(10);
    
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};