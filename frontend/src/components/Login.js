import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_BASE_URL;

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .game-bg {
    min-height: 100vh;
    background: #05060f;
    background-image:
      radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,200,255,0.12) 0%, transparent 70%),
      repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(0,200,255,0.03) 40px, rgba(0,200,255,0.03) 41px),
      repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(0,200,255,0.03) 40px, rgba(0,200,255,0.03) 41px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    font-family: 'Rajdhani', sans-serif;
  }

  .login-card {
    background: rgba(8, 12, 30, 0.95);
    border: 1px solid rgba(0,200,255,0.25);
    border-radius: 16px;
    padding: 2.5rem 2rem;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 0 60px rgba(0,200,255,0.08), inset 0 1px 0 rgba(255,255,255,0.05);
    animation: slideUp 0.5s cubic-bezier(0.16,1,0.3,1);
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .logo-area {
    text-align: center;
    margin-bottom: 2rem;
  }

  .logo-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 0.5rem;
    filter: drop-shadow(0 0 12px rgba(0,200,255,0.6));
    animation: pulse 2.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { filter: drop-shadow(0 0 10px rgba(0,200,255,0.5)); }
    50%       { filter: drop-shadow(0 0 22px rgba(0,200,255,0.9)); }
  }

  .logo-title {
    font-family: 'Orbitron', monospace;
    font-size: 1.6rem;
    font-weight: 900;
    color: #fff;
    letter-spacing: 3px;
    text-transform: uppercase;
  }

  .logo-sub {
    font-size: 0.8rem;
    color: rgba(0,200,255,0.6);
    letter-spacing: 4px;
    text-transform: uppercase;
    margin-top: 4px;
  }

  .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(0,200,255,0.3), transparent);
    margin: 1.5rem 0;
  }

  .field-group { margin-bottom: 1.2rem; }

  .field-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(0,200,255,0.7);
    margin-bottom: 0.4rem;
  }

  .field-input {
    width: 100%;
    background: rgba(0,200,255,0.04);
    border: 1px solid rgba(0,200,255,0.2);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    color: #fff;
    font-family: 'Rajdhani', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 1px;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    outline: none;
  }

  .field-input::placeholder { color: rgba(255,255,255,0.2); }

  .field-input:focus {
    border-color: rgba(0,200,255,0.6);
    background: rgba(0,200,255,0.08);
    box-shadow: 0 0 0 3px rgba(0,200,255,0.1);
  }

  .error-msg {
    background: rgba(255,60,60,0.12);
    border: 1px solid rgba(255,60,60,0.3);
    border-radius: 8px;
    padding: 0.6rem 1rem;
    color: #ff6b6b;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    margin-bottom: 1rem;
    text-align: center;
  }

  .btn-primary {
    width: 100%;
    background: linear-gradient(135deg, rgba(0,200,255,0.15) 0%, rgba(0,150,255,0.25) 100%);
    border: 1px solid rgba(0,200,255,0.5);
    border-radius: 10px;
    padding: 0.85rem;
    color: #00c8ff;
    font-family: 'Orbitron', monospace;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 0.75rem;
    position: relative;
    overflow: hidden;
  }

  .btn-primary::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(0,200,255,0.2), transparent);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .btn-primary:hover {
    border-color: rgba(0,200,255,0.9);
    box-shadow: 0 0 20px rgba(0,200,255,0.25), 0 4px 15px rgba(0,0,0,0.3);
    color: #fff;
    transform: translateY(-1px);
  }

  .btn-primary:hover::after { opacity: 1; }
  .btn-primary:active { transform: translateY(0); }

  .btn-secondary {
    width: 100%;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 0.75rem;
    color: rgba(255,255,255,0.4);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: block;
    text-align: center;
  }

  .btn-secondary:hover {
    border-color: rgba(255,255,255,0.25);
    color: rgba(255,255,255,0.7);
  }
`;

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { username, password });
      localStorage.setItem('token', res.data.token);
      navigate('/lobby');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="game-bg">
        <div className="login-card">
          <div className="logo-area">
            <span className="logo-icon">🃏</span>
            <div className="logo-title">CardArena</div>
            <div className="logo-sub">Enter the Game</div>
          </div>

          <div className="divider" />

          <form onSubmit={handleLogin}>
            <div className="field-group">
              <label className="field-label">Username</label>
              <input
                className="field-input"
                type="text"
                placeholder="Enter your callsign"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="field-group">
              <label className="field-label">Password</label>
              <input
                className="field-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && <div className="error-msg">⚠ {error}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Authenticating...' : '▶ Enter Arena'}
            </button>

            <Link to="/register" className="btn-secondary">
              New Player? Register
            </Link>
          </form>
        </div>
      </div>
    </>
  );
};

export default Login;