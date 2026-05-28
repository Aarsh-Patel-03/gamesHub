const Room = require("../models/Room");
const jwt = require("jsonwebtoken");

const rooms = {};
// Tracks which players have re-joined via their GamePlayground socket after navigation
// Key: roomId → Set of usernames whose GP socket is in the room
const readyPlayers = {};

// ════════════════════════════════════════════
//  DECK UTILITIES
// ════════════════════════════════════════════

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];
const RANK_ORDER = {
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const createDeck = () => {
  const deck = [];
  for (const suit of SUITS)
    for (const rank of RANKS) deck.push({ suit, rank, id: `${suit}${rank}` });
  return deck;
};

const shuffle = (deck) => {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
};

const dealHands = (players) => {
  const deck = shuffle(createDeck());
  const hands = {};
  players.forEach((p, i) => {
    hands[p] = deck.slice(i * 13, (i + 1) * 13);
  });
  return hands;
};

// ════════════════════════════════════════════
//  GAME STATE FACTORY
// ════════════════════════════════════════════

const createGameState = (players) => {
  // Teams: players[0] & players[2] vs players[1] & players[3]
  const teams = {
    A: [players[0], players[2] || null].filter(Boolean),
    B: [players[1] || null, players[3] || null].filter(Boolean),
  };

  return {
    players, // ordered array of usernames
    teams, // { A: [p0,p2], B: [p1,p3] }
    hands: dealHands(players),
    currentTrick: [], // [{ player, card }]
    leadSuit: null,
    currentPlayerIndex: 0,
    trickNumber: 1,
    collectedCards: { A: [], B: [] },
    trickHistory: [],
    status: "playing", // playing | finished
  };
};

// ════════════════════════════════════════════
//  GAME LOGIC HELPERS
// ════════════════════════════════════════════

const getTeamOf = (gameState, username) =>
  gameState.teams.A.includes(username) ? "A" : "B";

const currentPlayer = (gs) => gs.players[gs.currentPlayerIndex];

const nextPlayerIndex = (gs) => (gs.currentPlayerIndex + 1) % gs.players.length;

// Validate that the played card follows the suit rule
const isValidPlay = (gs, username, card) => {
  const hand = gs.hands[username];
  const cardInHand = hand.some((c) => c.id === card.id);
  if (!cardInHand) return { valid: false, reason: "Card not in hand" };

  // First card of trick — anything goes
  if (gs.currentTrick.length === 0) return { valid: true };

  // Must follow lead suit if possible
  const hasSuit = hand.some((c) => c.suit === gs.leadSuit);
  if (hasSuit && card.suit !== gs.leadSuit)
    return { valid: false, reason: `Must follow suit: ${gs.leadSuit}` };

  return { valid: true };
};

// Determine trick winner — highest rank of lead suit
const resolveTrick = (trick, leadSuit) => {
  const leadCards = trick.filter((t) => t.card.suit === leadSuit);
  const winner = leadCards.reduce((best, t) =>
    RANK_ORDER[t.card.rank] > RANK_ORDER[best.card.rank] ? t : best,
  );
  return winner.player;
};

// Count 10s in a pile
const countTens = (cards) => cards.filter((c) => c.rank === "10").length;

// Build score summary
const buildScoreResult = (gs) => {
  const tensA = countTens(gs.collectedCards.A);
  const tensB = countTens(gs.collectedCards.B);
  let winner = null;
  if (tensA > tensB) winner = "A";
  else if (tensB > tensA) winner = "B";
  // else draw — optional: carry forward rule

  return {
    tensA,
    tensB,
    teamA: gs.teams.A,
    teamB: gs.teams.B,
    winner,
    collectedA: gs.collectedCards.A.length,
    collectedB: gs.collectedCards.B.length,
  };
};

// ════════════════════════════════════════════
//  EMIT HELPERS
// ════════════════════════════════════════════

const emitRoomUpdate = async (roomId, io) => {
  try {
    const room = await Room.findOne({ roomId });
    if (!room) {
      // Room was deleted — tell all clients to remove it
      io.emit("public-rooms-update", { roomId, players: [] });
      return;
    }
    // Only broadcast rooms that are non-full and active
    io.emit("public-rooms-update", {
      _id: room._id,
      roomId: room.roomId,
      players: room.players,
    });
  } catch (err) {
    console.error("Room update emit error:", err);
  }
};

const emitRoomPlayersUpdate = (roomId, io, players, hostUsername) => {
  io.to(roomId).emit("room-update", {
    players: players,
    host: hostUsername,
  });
};

// Send each player only their own hand
const emitDealtHands = (roomId, io, gameState) => {
  const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
  if (!socketsInRoom) return;

  socketsInRoom.forEach((socketId) => {
    const sock = io.sockets.sockets.get(socketId);
    if (!sock) return;
    const username = sock.username;
    const hand = gameState.hands[username];
    if (hand) {
      sock.emit("deal-hand", hand);
    }
  });
};

// Broadcast the public trick state (no private hand info)
const emitTrickState = (roomId, io, gameState) => {
  io.to(roomId).emit("trick-update", {
    currentTrick: gameState.currentTrick,
    leadSuit: gameState.leadSuit,
    currentPlayer: currentPlayer(gameState),
    trickNumber: gameState.trickNumber,
    teams: gameState.teams,
    score: {
      A: countTens(gameState.collectedCards.A),
      B: countTens(gameState.collectedCards.B),
    },
  });
};

// Tell each player their remaining hand + valid cards
const emitHandUpdate = (roomId, io, gameState) => {
  const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
  if (!socketsInRoom) return;

  socketsInRoom.forEach((socketId) => {
    const sock = io.sockets.sockets.get(socketId);
    if (!sock) return;
    const username = sock.username;
    const hand = gameState.hands[username];
    if (!hand) return;

    // Calculate which cards are valid to play
    let validCards = hand.map((c) => c.id);
    if (gameState.leadSuit && gameState.currentTrick.length > 0) {
      const hasSuit = hand.some((c) => c.suit === gameState.leadSuit);
      if (hasSuit) {
        validCards = hand
          .filter((c) => c.suit === gameState.leadSuit)
          .map((c) => c.id);
      }
    }

    sock.emit("hand-update", { hand, validCards });
  });
};

// ════════════════════════════════════════════
//  SOCKET AUTH
// ════════════════════════════════════════════

const socketAuth = (io) => {
  io.use((socket, next) => {
    try {
      const decoded = jwt.verify(
        socket.handshake.auth.token,
        process.env.JWT_SECRET,
      );
      socket.username = decoded.username;
      socket.data = { username: decoded.username };
      next();
    } catch {
      next(new Error("Authentication error"));
    }
  });
};

// ════════════════════════════════════════════
//  SOCKET EVENTS
// ════════════════════════════════════════════

const socketEvents = (io) => {
  io.on("connection", (socket) => {
    console.log(`${socket.username} connected`);

    // ── CREATE ROOM ──────────────────────────
    socket.on("create-room", async (roomId) => {
      console.log(`🏠 ${socket.username} creating room: ${roomId}`);
      try {
        let room = await Room.findOne({ roomId });
        if (room) return socket.emit("error", "Room ID already exists");

        room = new Room({
          roomId,
          players: [socket.username],
          host: socket.username,
          createdAt: new Date(),
        });
        await room.save();

        socket.join(roomId);
        socket.isHost = true;
        rooms[roomId] = { players: [socket.username], host: socket.username };

        socket.emit("room-update", {
          players: [socket.username],
          host: socket.username,
        });
        socket.emit("room-created", roomId);
        socket.emit("join-success", roomId);
        await emitRoomUpdate(roomId, io);
      } catch (err) {
        console.error("Create room error:", err);
        socket.emit("error", "Failed to create room");
      }
    });

    // ── JOIN ROOM ────────────────────────────
    socket.on("join-room", async (roomId) => {
      console.log(`🎯 ${socket.username} trying to join: ${roomId}`);
      try {
        const room = await Room.findOne({ roomId });
        if (!room) return socket.emit("error", "Room not found");

        const currentRoom = rooms[roomId];
        const gameAlreadyStarted = currentRoom && currentRoom.gameState;

        // ── Case A: Game is already running (player navigated to GamePlayground) ──
        // This happens because Lobby socket closes and GamePlayground opens a NEW socket.
        // We just need to re-add this socket to the Socket.IO room so they receive events.
        if (gameAlreadyStarted) {
          socket.join(roomId);
          console.log(
            `🔁 ${socket.username} re-joined room ${roomId} (game in progress)`,
          );

          // Track this player as ready in GamePlayground
          if (!readyPlayers[roomId]) readyPlayers[roomId] = new Set();
          readyPlayers[roomId].add(socket.username);

          const expectedCount = currentRoom.players.length;
          const readyCount = readyPlayers[roomId].size;
          console.log(
            `✅ Ready: ${readyCount}/${expectedCount} players in ${roomId}`,
          );

          // Send this player their hand immediately (they may have missed the deal-hand emit)
          // const hand = currentRoom.gameState.hands[socket.username];
          // if (hand) {
          //   socket.emit("deal-hand", hand);
          // }

          // Also re-sync game state for this player
          socket.emit("game-started", {
            roomId,
            players: currentRoom.players,
            host: currentRoom.host,
            teams: currentRoom.gameState.teams,
            firstPlayer: currentPlayer(currentRoom.gameState),
          });

          // When ALL expected players have their GamePlayground socket in the room,
          // broadcast the all-players-joined countdown + deal hands to everyone
          if (readyCount === expectedCount) {
            console.log(
              `🎴 All ${expectedCount} players ready in ${roomId} — dealing now`,
            );

            io.to(roomId).emit("all-players-joined", {
              players: currentRoom.players,
              dealDelayMs: 5000,
            });

            // Deal after 5s countdown
            setTimeout(() => {
              const r = rooms[roomId];
              if (!r || !r.gameState) return;
              emitDealtHands(roomId, io, r.gameState);
              emitTrickState(roomId, io, r.gameState);
              io.to(roomId).emit("turn-update", currentPlayer(r.gameState));
              emitHandUpdate(roomId, io, r.gameState);
              // Clean up readyPlayers tracking
              delete readyPlayers[roomId];
            }, 5000);
          }
          return;
        }

        // ── Case B: Player is joining the lobby room (game not started yet) ──
        if (room.players.length >= 4)
          return socket.emit("error", "Room full (4 players max)");
        if (room.players.includes(socket.username)) {
          socket.join(roomId);
          emitRoomPlayersUpdate(roomId, io, room.players, room.host);
          return socket.emit("join-success", roomId);
        }

        room.players.push(socket.username);
        await room.save();

        socket.join(roomId);
        rooms[roomId] = {
          ...rooms[roomId],
          players: room.players,
          host: room.host,
        };

        emitRoomPlayersUpdate(roomId, io, room.players, room.host);
        socket.emit("join-success", roomId);
        socket.to(roomId).emit("player-joined", socket.username);
        await emitRoomUpdate(roomId, io);

        // ── Auto-start when 4 players are in the lobby ──
        if (room.players.length === 4) {
          const gameState = createGameState(room.players);
          rooms[roomId] = { ...rooms[roomId], gameState };

          // Notify Lobby so all clients navigate to GamePlayground
          io.to(roomId).emit("game-started", {
            roomId,
            players: room.players,
            host: room.host,
            teams: gameState.teams,
            firstPlayer: currentPlayer(gameState),
          });

          // NOTE: We do NOT deal cards or emit all-players-joined here.
          // Cards are dealt only after all 4 players re-connect via their
          // GamePlayground socket (Case A above handles that).
        }
      } catch (err) {
        console.error("Join error:", err);
        socket.emit("error", "Join failed - try again");
      }
    });

    // ── LEAVE ROOM ───────────────────────────
    socket.on("leave-room", async (roomId) => {
      try {
        const room = await Room.findOne({ roomId });
        if (room && room.players.includes(socket.username)) {
          room.players = room.players.filter((p) => p !== socket.username);
          if (room.host === socket.username && room.players.length > 0)
            room.host = room.players[0];
          else if (room.players.length === 0) {
            await Room.deleteOne({ roomId });
            delete rooms[roomId];
            delete readyPlayers[roomId];
            return;
          }
          await room.save();
          socket.leave(roomId);
          emitRoomPlayersUpdate(roomId, io, room.players, room.host);
          socket.to(roomId).emit("player-left", socket.username);
          await emitRoomUpdate(roomId, io);
        }
      } catch (err) {
        console.error("Leave error:", err);
      }
    });

    // ── START GAME ───────────────────────────
    socket.on("start-game", async (roomId) => {
      console.log(`🎮 ${socket.username} starting game in ${roomId}`);
      try {
        const room = await Room.findOne({ roomId });
        if (!room) return socket.emit("error", "Room not found");
        if (room.host !== socket.username)
          return socket.emit("error", "Only host can start game");
        if (room.players.length < 2)
          return socket.emit("error", "Need at least 2 players");

        const gameState = createGameState(room.players);
        rooms[roomId] = {
          ...rooms[roomId],
          gameState,
          players: room.players,
          host: room.host,
        };

        console.log(
          `🚀 Game started in ${roomId}. Players: ${room.players.join(", ")}`,
        );

        // Tell everyone to navigate to GamePlayground
        io.to(roomId).emit("game-started", {
          roomId,
          players: room.players,
          host: socket.username,
          teams: gameState.teams,
          firstPlayer: currentPlayer(gameState),
        });

        // Cards are dealt once all players re-connect via their GamePlayground socket.
        // (handled in join-room Case A)
      } catch (err) {
        console.error("Start game error:", err);
        socket.emit("error", "Failed to start game");
      }
    });

    // ── PLAY CARD ────────────────────────────
    socket.on("play-card", ({ roomId, card }) => {
      const room = rooms[roomId];
      if (!room || !room.gameState) {
        return socket.emit("error", "Game not started");
      }

      const gs = room.gameState;

      // Must be this player's turn
      if (currentPlayer(gs) !== socket.username) {
        return socket.emit("error", "Not your turn");
      }

      // Validate the move
      const { valid, reason } = isValidPlay(gs, socket.username, card);
      if (!valid) {
        return socket.emit("invalid-move", { reason });
      }

      // Set lead suit on first card of trick
      if (gs.currentTrick.length === 0) {
        gs.leadSuit = card.suit;
      }

      // Remove card from hand
      gs.hands[socket.username] = gs.hands[socket.username].filter(
        (c) => c.id !== card.id,
      );

      // Add to current trick
      gs.currentTrick.push({ player: socket.username, card });

      console.log(
        `🃏 ${socket.username} played ${card.suit}${card.rank} in trick ${gs.trickNumber}`,
      );

      // Broadcast the played card to everyone
      io.to(roomId).emit("card-played", {
        player: socket.username,
        card,
        trickPosition: gs.currentTrick.length,
      });

      // ── All 4 players have played → resolve trick ──
      if (gs.currentTrick.length === gs.players.length) {
        const winnerName = resolveTrick(gs.currentTrick, gs.leadSuit);
        const winnerTeam = getTeamOf(gs, winnerName);
        const trickCards = gs.currentTrick.map((t) => t.card);

        // Add all trick cards to winner's team collection
        gs.collectedCards[winnerTeam].push(...trickCards);

        const tensA = countTens(gs.collectedCards.A);
        const tensB = countTens(gs.collectedCards.B);

        // Save trick to history
        gs.trickHistory.push({
          trickNumber: gs.trickNumber,
          cards: [...gs.currentTrick],
          winner: winnerName,
          winnerTeam,
        });

        console.log(
          `✅ Trick ${gs.trickNumber} won by ${winnerName} (Team ${winnerTeam}). Tens → A:${tensA} B:${tensB}`,
        );

        // Emit trick result
        io.to(roomId).emit("trick-result", {
          winner: winnerName,
          winnerTeam,
          trick: gs.currentTrick,
          tensA,
          tensB,
          trickNumber: gs.trickNumber,
        });

        // ── Check if game is over (all 13 tricks played) ──
        if (gs.trickNumber === 13) {
          gs.status = "finished";
          const result = buildScoreResult(gs);

          console.log(
            `🏆 Game over in ${roomId}. Tens A:${result.tensA} B:${result.tensB}. Winner: Team ${result.winner || "Draw"}`,
          );

          io.to(roomId).emit("game-over", result);

          // Clean up game state but keep room
          rooms[roomId].gameState = null;
          return;
        }

        // ── Prepare next trick ──
        gs.trickNumber += 1;
        gs.currentTrick = [];
        gs.leadSuit = null;

        // Winner of trick leads next
        gs.currentPlayerIndex = gs.players.indexOf(winnerName);

        // Small delay so clients can animate the trick result
        setTimeout(() => {
          emitTrickState(roomId, io, gs);
          io.to(roomId).emit("turn-update", currentPlayer(gs));
          emitHandUpdate(roomId, io, gs);
        }, 2000);
      } else {
        // ── Move to next player ──
        gs.currentPlayerIndex = nextPlayerIndex(gs);
        emitTrickState(roomId, io, gs);
        io.to(roomId).emit("turn-update", currentPlayer(gs));
        emitHandUpdate(roomId, io, gs);
      }
    });

    // ── CHAT ─────────────────────────────────
    socket.on("chat-message", ({ roomId, message }) => {
      io.to(roomId).emit("chat-message", {
        username: socket.username,
        message,
      });
    });

    // ── DISCONNECT ───────────────────────────
    socket.on("disconnect", async () => {
      console.log(`${socket.username} disconnected`);
      for (const roomId of Object.keys(rooms)) {
        const room = rooms[roomId];
        if (room?.players?.includes(socket.username)) {
          try {
            const dbRoom = await Room.findOne({ roomId });
            if (dbRoom) {
              dbRoom.players = dbRoom.players.filter(
                (p) => p !== socket.username,
              );
              if (dbRoom.host === socket.username && dbRoom.players.length > 0)
                dbRoom.host = dbRoom.players[0];
              else if (dbRoom.players.length === 0)
                await Room.deleteOne({ roomId });
              else await dbRoom.save();

              emitRoomPlayersUpdate(roomId, io, dbRoom.players, dbRoom.host);
              await emitRoomUpdate(roomId, io);

              // Remove from readyPlayers tracking if present
              if (readyPlayers[roomId]) {
                readyPlayers[roomId].delete(socket.username);
                if (readyPlayers[roomId].size === 0)
                  delete readyPlayers[roomId];
              }

              // Notify others that a player disconnected mid-game
              if (room.gameState) {
                io.to(roomId).emit("player-disconnected", {
                  username: socket.username,
                });
              }
            }
          } catch (err) {
            console.error("Disconnect cleanup error:", err);
          }
        }
      }
    });
  });
};

module.exports = { socketAuth, socketEvents };
