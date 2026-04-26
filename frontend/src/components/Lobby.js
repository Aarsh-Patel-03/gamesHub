import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import axios from "axios";

const API_BASE = "http://localhost:5000/api";
const SOCKET_BASE = "http://localhost:5000";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .lobby-root {
    min-height: 100vh;
    background: #05060f;
    background-image:
      radial-gradient(ellipse 100% 50% at 50% 0%, rgba(0,200,255,0.1) 0%, transparent 60%);
    font-family: 'Rajdhani', sans-serif;
    color: #fff;
  }

  /* NAV */
  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: rgba(5,6,15,0.8);
    backdrop-filter: blur(10px);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .nav-brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-family: 'Orbitron', monospace;
    font-size: 1.1rem;
    font-weight: 900;
    letter-spacing: 2px;
    color: #fff;
  }

  .nav-brand span { font-size: 1.4rem; }

  .nav-right { display: flex; align-items: center; gap: 1rem; }

  .status-dot {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 1px;
    padding: 0.3rem 0.7rem;
    border-radius: 20px;
    border: 1px solid;
  }

  .status-dot.live {
    color: #00ff88;
    border-color: rgba(0,255,136,0.3);
    background: rgba(0,255,136,0.08);
  }

  .status-dot.connecting {
    color: #ffaa00;
    border-color: rgba(255,170,0,0.3);
    background: rgba(255,170,0,0.08);
  }

  .status-dot.offline {
    color: #ff4444;
    border-color: rgba(255,68,68,0.3);
    background: rgba(255,68,68,0.08);
  }

  .status-dot .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: currentColor;
    animation: blink 1.2s ease-in-out infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }

  .btn-logout {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 0.4rem 0.9rem;
    color: rgba(255,255,255,0.5);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.5px;
  }

  .btn-logout:hover { color: #fff; border-color: rgba(255,255,255,0.25); }

  /* CONTENT */
  .lobby-content {
    max-width: 680px;
    margin: 0 auto;
    padding: 1.5rem 1.25rem 4rem;
  }

  /* ROOM BANNER */
  .room-banner {
    background: rgba(0,200,255,0.06);
    border: 1px solid rgba(0,200,255,0.2);
    border-radius: 12px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    animation: fadeIn 0.4s ease;
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .room-banner-label {
    font-size: 0.7rem;
    letter-spacing: 2px;
    color: rgba(0,200,255,0.6);
    text-transform: uppercase;
    margin-bottom: 0.25rem;
  }

  .room-banner-id {
    font-family: 'Orbitron', monospace;
    font-size: 1rem;
    font-weight: 700;
    color: #00c8ff;
    letter-spacing: 2px;
  }

  .btn-enter {
    background: linear-gradient(135deg, rgba(0,200,255,0.2), rgba(0,100,200,0.3));
    border: 1px solid rgba(0,200,255,0.5);
    border-radius: 8px;
    padding: 0.5rem 1.2rem;
    color: #00c8ff;
    font-family: 'Orbitron', monospace;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 2px;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
  }

  .btn-enter:hover {
    border-color: #00c8ff;
    box-shadow: 0 0 15px rgba(0,200,255,0.25);
    color: #fff;
    transform: translateY(-1px);
  }

  /* SECTIONS */
  .section { margin-bottom: 1.25rem; }

  .btn-create {
    width: 100%;
    background: linear-gradient(135deg, rgba(0,200,255,0.1), rgba(0,100,255,0.2));
    border: 1px solid rgba(0,200,255,0.3);
    border-radius: 12px;
    padding: 1rem;
    color: rgba(0,200,255,0.9);
    font-family: 'Orbitron', monospace;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .btn-create:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .btn-create:not(:disabled):hover {
    border-color: rgba(0,200,255,0.7);
    box-shadow: 0 0 25px rgba(0,200,255,0.15);
    color: #fff;
    transform: translateY(-1px);
  }

  /* JOIN ROW */
  .join-row {
    display: flex;
    gap: 0.75rem;
  }

  .section-label {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 2px;
    color: rgba(255,255,255,0.35);
    text-transform: uppercase;
    margin-bottom: 0.6rem;
  }

  .join-input {
    flex: 1;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 0.75rem 1rem;
    color: #fff;
    font-family: 'Rajdhani', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 1px;
    outline: none;
    transition: all 0.2s;
  }

  .join-input::placeholder { color: rgba(255,255,255,0.2); }

  .join-input:focus {
    border-color: rgba(0,200,255,0.4);
    background: rgba(0,200,255,0.05);
  }

  .btn-join {
    background: rgba(0,200,255,0.12);
    border: 1px solid rgba(0,200,255,0.35);
    border-radius: 10px;
    padding: 0.75rem 1.25rem;
    color: #00c8ff;
    font-family: 'Orbitron', monospace;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-join:disabled { opacity: 0.3; cursor: not-allowed; }

  .btn-join:not(:disabled):hover {
    border-color: rgba(0,200,255,0.8);
    box-shadow: 0 0 15px rgba(0,200,255,0.2);
    color: #fff;
  }

  /* ALERT */
  .alert {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: rgba(0,200,255,0.07);
    border: 1px solid rgba(0,200,255,0.2);
    border-radius: 10px;
    padding: 0.75rem 1rem;
    color: rgba(200,240,255,0.8);
    font-size: 0.88rem;
    font-weight: 600;
    margin-bottom: 1.25rem;
    animation: fadeIn 0.3s ease;
  }

  .alert-close {
    margin-left: auto;
    background: none;
    border: none;
    color: rgba(255,255,255,0.3);
    cursor: pointer;
    font-size: 1rem;
    transition: color 0.2s;
    padding: 0 0.2rem;
  }

  .alert-close:hover { color: rgba(255,255,255,0.7); }

  /* PLAYERS */
  .players-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 1.25rem;
  }

  .players-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 2px;
    color: rgba(255,255,255,0.4);
    text-transform: uppercase;
    position: relative;
  }

  .players-header .host-badge {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.7rem;
    color: #00ff88;
  }

  .player-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.7rem 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    transition: background 0.15s;
  }

  .player-item:last-child { border-bottom: none; }
  .player-item:hover { background: rgba(255,255,255,0.03); }

  .player-avatar {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(0,200,255,0.3), rgba(120,0,255,0.3));
    border: 1px solid rgba(0,200,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  .player-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: rgba(255,255,255,0.85);
    letter-spacing: 0.5px;
    flex: 1;
  }

  .host-label {
    margin-left: auto;
    font-size: 0.68rem;
    letter-spacing: 1.5px;
    color: #ffcc00;
    font-weight: 700;
  }

  /* PUBLIC ROOMS */
  .rooms-list { display: flex; flex-direction: column; gap: 0.6rem; }

  .room-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    padding: 0.85rem 1rem;
    transition: all 0.2s;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .room-item:hover { border-color: rgba(0,200,255,0.2); background: rgba(0,200,255,0.04); }

  .room-id {
    font-family: 'Orbitron', monospace;
    font-size: 0.85rem;
    font-weight: 700;
    color: rgba(255,255,255,0.8);
    letter-spacing: 1px;
  }

  .room-count {
    font-size: 0.78rem;
    color: rgba(255,255,255,0.35);
    font-weight: 600;
    letter-spacing: 0.5px;
    margin-top: 0.15rem;
  }

  .btn-room-join {
    background: rgba(0,200,255,0.08);
    border: 1px solid rgba(0,200,255,0.25);
    border-radius: 7px;
    padding: 0.35rem 0.85rem;
    color: #00c8ff;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .btn-room-join:hover {
    border-color: rgba(0,200,255,0.6);
    background: rgba(0,200,255,0.15);
    color: #fff;
  }

  .empty-state {
    text-align: center;
    padding: 1.5rem;
    color: rgba(255,255,255,0.2);
    font-size: 0.88rem;
    letter-spacing: 0.5px;
  }

  .start-game-section {
    padding: 1rem;
    border-top: 1px solid rgba(255,255,255,0.06);
    text-align: center;
    background: rgba(0,255,136,0.05);
    border: 1px solid rgba(0,255,136,0.2);
  }

  .btn-start-game {
    width: 100%;
    background: linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,200,83,0.3));
    border: 1px solid rgba(0,255,136,0.5);
    border-radius: 12px;
    padding: 1rem;
    color: #00ff88;
    font-family: 'Orbitron', monospace;
    font-size: 1rem;
    font-weight: 900;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .btn-start-game:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    background: rgba(0,255,136,0.1);
  }

  .btn-start-game:not(:disabled):hover {
    border-color: rgba(0,255,136,0.8);
    box-shadow: 0 0 25px rgba(0,255,136,0.3);
    color: #fff;
    transform: translateY(-2px);
  }
`;

const Lobby = () => {
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [myRoomId, setMyRoomId] = useState("");
  const [players, setPlayers] = useState([]);
  const [publicRooms, setPublicRooms] = useState([]);
  const [error, setError] = useState("");
  const [isHost, setIsHost] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) return navigate("/");

    const newSocket = io(SOCKET_BASE, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      setIsSocketReady(true);
    });
    newSocket.on("disconnect", () => setIsSocketReady(false));

    newSocket.on("room-update", (data) => {
      setPlayers(data.players || []);

      const myUsername = JSON.parse(atob(token.split(".")[1])).username;

      setIsHost(data.host === myUsername);
    });

    newSocket.on("room-created", (id) => {
      setMyRoomId(id);
      setError(`Room ${id} created — share with friends!`);
    });
    newSocket.on("player-joined", (player) =>
      setError(`${player} joined your room!`),
    );
    newSocket.on("join-success", (id) => {
      setMyRoomId(id);
      setError(
        `Joined ${id}! ${isHost ? "Start the game!" : "Waiting for host..."}`,
      );
    });
    newSocket.on("player-left", (player) =>
      setError(`${player} left the room`),
    );
    newSocket.on("game-started", (data) => {
      console.log("Game started:", data);

      // Navigate ALL players to same room/game screen
      navigate(`/play/${data.roomId}`, {
        state: {
          players: data.players,
          host: data.host,
        },
      });
    });
    newSocket.on("error", setError);

    setSocket(newSocket);

    // Fetch public rooms
    axios
      .get(`${API_BASE}/rooms/`)
      .then((res) => setPublicRooms(res.data))
      .catch(console.error);

    return () => newSocket.close();
  }, [token, navigate]);

  const createRoom = () => {
    const id = Array.from({ length: 6 }, () =>
      String.fromCharCode(65 + Math.floor(Math.random() * 26)),
    ).join("");
    console.log("create room frontend");
    if (socket) socket.emit("create-room", id);
  };

  const joinRoom = (id) => {
    const trimmed = (id || roomId).trim();
    if (!trimmed) return setError("Enter a Room ID");
    if (!isSocketReady) return setError("Socket not ready yet");
    socket.emit("join-room", trimmed);
  };

  const startGame = () => {
    if (!isSocketReady || !myRoomId) {
      setError("Room not ready");
      return;
    }
    if (players.length < 2) {
      setError("Need at least 2 players to start");
      return;
    }
    socket.emit("start-game", myRoomId);
    setError("Starting game...");
  };

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const statusClass = isSocketReady ? "live" : "connecting";
  const statusLabel = isSocketReady
    ? `LIVE · ${socket?.id?.slice(-4) || ""}`
    : "CONNECTING";

  return (
    <>
      <style>{styles}</style>
      <div className="lobby-root">
        <nav className="nav">
          <div className="nav-brand">
            <span>🃏</span> CardArena
          </div>
          <div className="nav-right">
            <div className={`status-dot ${statusClass}`}>
              <span className="dot" />
              {statusLabel}
            </div>
            <button className="btn-logout" onClick={logout}>
              Logout
            </button>
          </div>
        </nav>

        <div className="lobby-content">
          {myRoomId && (
            <div className="room-banner">
              <div>
                <div className="room-banner-label">
                  {isHost ? "Your Room (Host)" : "Joined Room"}
                </div>
                <div className="room-banner-id">{myRoomId}</div>
              </div>
              <button
                className="btn-enter"
                onClick={() => navigate(`/play/${myRoomId}`)}
              >
                Enter Room →
              </button>
            </div>
          )}

          {/* CREATE ROOM */}
          <div className="section">
            <button
              className="btn-create"
              onClick={createRoom}
              disabled={!isSocketReady}
            >
              ➕ Create New Room
            </button>
          </div>

          {/* JOIN BY ID */}
          <div className="section">
            <div className="section-label">Join by Room ID</div>
            <div className="join-row">
              <input
                className="join-input"
                type="text"
                placeholder="Enter Room ID..."
                value={roomId}
                onChange={(e) => {
                  const value = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z]/g, "")
                    .slice(0, 6);

                  setRoomId(value);
                }}
                onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              />
              <button
                className="btn-join"
                onClick={() => joinRoom()}
                disabled={!roomId.trim() || !isSocketReady}
              >
                {isSocketReady ? "JOIN" : "WAIT..."}
              </button>
            </div>
          </div>

          {/* ALERT */}
          {error && (
            <div className="alert">
              <span>ℹ</span>
              {error}
              <button className="alert-close" onClick={() => setError("")}>
                ✕
              </button>
            </div>
          )}

          {/* CURRENT PLAYERS */}
          {players.length > 0 && (
            <div className="section">
              <div className="section-label">
                Players in Room ({players.length}/4)
              </div>
              <div className="players-card">
                <div className="players-header">
                  Connected Players
                  {isHost && (
                    <span className="host-badge">👑 YOU ARE HOST</span>
                  )}
                </div>
                {players.map((player, i) => (
                  <div className="player-item" key={i}>
                    <div className="player-avatar">{i === 0 ? "👑" : "👤"}</div>
                    <div className="player-name">{player}</div>
                    {i === 0 && <span className="host-label">HOST</span>}
                  </div>
                ))}

                {/* START GAME BUTTON */}
                {isHost && players.length >= 2 && (
                  <div className="start-game-section">
                    <button
                      className="btn-start-game"
                      onClick={startGame}
                      disabled={!isSocketReady || !myRoomId}
                    >
                      🚀 START GAME ({players.length}/4)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PUBLIC ROOMS */}
          <div className="section">
            <div className="section-label">Public Rooms</div>
            {publicRooms.length > 0 ? (
              <div className="rooms-list">
                {publicRooms.map((room) => (
                  <div className="room-item" key={room._id}>
                    <div>
                      <div className="room-id">{room.roomId}</div>
                      <div className="room-count">
                        {room.players?.length || 0} / 4 players
                      </div>
                    </div>
                    <button
                      className="btn-room-join"
                      onClick={() => joinRoom(room.roomId)}
                      disabled={!isSocketReady}
                    >
                      Quick Join
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                No public rooms available — create one!
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Lobby;
