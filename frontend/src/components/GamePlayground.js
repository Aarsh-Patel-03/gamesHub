import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import io from "socket.io-client";

const SOCKET_BASE = process.env.REACT_APP_SOCKET_URL;

// ════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .game-root {
    min-height: 100vh;
    background: #0e1a10;
    background-image:
      radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,180,80,0.07) 0%, transparent 55%),
      radial-gradient(ellipse 60% 40% at 50% 100%, rgba(0,80,30,0.1) 0%, transparent 55%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    font-family: 'Rajdhani', sans-serif;
    color: #fff;
    padding-top: 56px;
    padding-bottom: 24px;
    overflow-x: hidden;
  }

  /* NAV */
  .game-nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem;
    background: rgba(5,15,8,0.95);
    border-bottom: 1px solid rgba(0,255,100,0.08);
    backdrop-filter: blur(14px);
    z-index: 200;
  }

  .nav-brand {
    font-family: 'Orbitron', monospace;
    font-size: 0.9rem;
    font-weight: 900;
    letter-spacing: 3px;
    color: #fff;
  }

  .nav-center {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .score-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    padding: 4px 14px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 1px;
  }

  .score-a { color: #60a5fa; }
  .score-b { color: #f87171; }
  .score-sep { color: rgba(255,255,255,0.2); }

  .trick-pill {
    font-family: 'Orbitron', monospace;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 2px;
    color: rgba(255,255,255,0.4);
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    padding: 3px 10px;
  }

  .room-pill {
    font-family: 'Orbitron', monospace;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 2px;
    color: #00c8ff;
    background: rgba(0,200,255,0.08);
    border: 1px solid rgba(0,200,255,0.22);
    border-radius: 20px;
    padding: 3px 10px;
  }

  .live-dot {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 1px;
  }

  .live-dot::before {
    content: '';
    width: 7px; height: 7px;
    border-radius: 50%;
    background: currentColor;
    animation: blink 1.2s ease-in-out infinite;
  }

  /* TABLE SCENE */
  .table-scene {
    position: relative;
    width: 92%;
    height: 33vh;
    margin: 10px 0 0 0;
    flex-shrink: 0;
  }

  .table-rail {
    position: absolute;
    inset: 48px 36px;
    border-radius: 40% / 55%;
    background: linear-gradient(160deg, #4a2c0a 0%, #2e1a06 40%, #1e1103 100%);
    box-shadow:
      0 0 0 3px #6b3d10,
      0 0 0 6px #3d2005,
      0 28px 80px rgba(0,0,0,0.75),
      0  8px 24px rgba(0,0,0,0.55);
  }

  .table-felt {
    position: absolute;
    inset: 50px 38px;
    border-radius: 40% / 55%;
    background:
      radial-gradient(ellipse 70% 55% at 48% 45%, #27ae60 0%, #1e8449 45%, #145a32 100%);
    box-shadow:
      inset 0 2px 12px rgba(0,0,0,0.35),
      inset 0 -2px 8px rgba(0,0,0,0.25);
    overflow: hidden;
  }

  .table-felt::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px),
      repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px);
    border-radius: inherit;
    pointer-events: none;
  }

  /* TRICK AREA (center of table) */
  .trick-area {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    z-index: 10;
  }

  .trick-label {
    font-family: 'Orbitron', monospace;
    font-size: 0.42rem;
    font-weight: 700;
    letter-spacing: 4px;
    color: rgba(255,255,255,0.2);
    text-transform: uppercase;
  }

  .trick-cards-grid {
    display: grid;
    grid-template-columns: 52px 52px;
    grid-template-rows: 72px 72px;
    gap: 5px;
  }

  .trick-slot {
    width: 52px;
    height: 72px;
    border-radius: 6px;
    border: 1.5px dashed rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.12);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .trick-slot-label {
    font-size: 0.42rem;
    color: rgba(255,255,255,0.18);
    letter-spacing: 1px;
  }

  /* PLAYED CARD IN TRICK */
  .trick-card {
    position: absolute;
    inset: 0;
    border-radius: 6px;
    background: #f9f6ee;
    border: 1px solid #d1c9b8;
    box-shadow: 0 4px 14px rgba(0,0,0,0.55);
    padding: 4px 5px;
    display: flex;
    flex-direction: column;
    animation: cardDrop 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }

  @keyframes cardDrop {
    from { transform: scale(0.5) translateY(-20px); opacity: 0; }
    to   { transform: scale(1) translateY(0);        opacity: 1; }
  }

  /* TRICK WINNER FLASH */
  .trick-winner-overlay {
    position: absolute;
    inset: 0;
    border-radius: 6px;
    background: rgba(255,215,0,0.25);
    border: 2px solid #ffd700;
    animation: winFlash 0.5s ease-out forwards;
    pointer-events: none;
  }

  /* ── DEALING LAYER ── */
  /* Lives inside .table-scene (not .table-felt) so cards aren't clipped */
  .dealing-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 40;
    overflow: visible;
  }

  /* Each deal-card is rendered at its FINAL seat position from the start.
     It begins scaled/faded via inline style, then CSS transition moves it. */
  .deal-card {
    position: absolute;
    width: 36px;
    height: 52px;
    border-radius: 5px;
    background: linear-gradient(155deg, #1e3a6e 0%, #0d1f40 60%, #07132a 100%);
    border: 1px solid rgba(100,160,255,0.3);
    box-shadow: 2px 3px 10px rgba(0,0,0,0.6);
    /* GPU-composited transition for smooth animation */
    transition: transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94),
                opacity   0.3s ease;
    will-change: transform, opacity;
  }

  /* ── ALL-PLAYERS-JOINED OVERLAY ── */
  .join-countdown-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.85);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 300;
    animation: fadeIn 0.4s ease;
  }
  .join-countdown-title {
    font-family: 'Orbitron', monospace;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 4px;
    color: #00ff88;
    margin-bottom: 1.4rem;
    text-transform: uppercase;
    text-align: center;
    line-height: 1.6;
  }
  .join-countdown-players {
    display: flex;
    gap: 12px;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  .join-player-chip {
    display: flex;
    align-items: center;
    gap: 7px;
    background: rgba(0,255,136,0.08);
    border: 1px solid rgba(0,255,136,0.3);
    border-radius: 24px;
    padding: 6px 14px;
    font-size: 0.8rem;
    font-weight: 600;
    color: #4ade80;
    letter-spacing: 0.5px;
    animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }

  /* ── COUNTDOWN OVERLAY ── */
  .countdown-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 50;
    pointer-events: none;
  }

  .countdown-ring {
    position: relative;
    width: 110px;
    height: 110px;
  }

  .countdown-ring svg {
    position: absolute;
    inset: 0;
    transform: rotate(-90deg);
  }

  .countdown-ring-track {
    fill: none;
    stroke: rgba(255,255,255,0.08);
    stroke-width: 6;
  }

  .countdown-ring-fill {
    fill: none;
    stroke: #00c8ff;
    stroke-width: 6;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.95s linear;
    filter: drop-shadow(0 0 6px rgba(0,200,255,0.7));
  }

  .countdown-number {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Orbitron', monospace;
    font-size: 2.8rem;
    font-weight: 900;
    color: #fff;
    text-shadow: 0 0 24px rgba(0,200,255,0.8);
    animation: countPop 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }

  @keyframes countPop {
    from { transform: scale(0.5); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }

  .countdown-label {
    margin-top: 14px;
    font-family: 'Orbitron', monospace;
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 5px;
    color: rgba(0,200,255,0.6);
    text-transform: uppercase;
  }

  @keyframes winFlash {
    0%   { opacity: 1; }
    100% { opacity: 0; }
  }

  /* TRICK WINNER BANNER */
  .trick-winner-banner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.88);
    border: 2px solid #ffd700;
    border-radius: 12px;
    padding: 10px 22px;
    text-align: center;
    z-index: 50;
    animation: popIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
    pointer-events: none;
    white-space: nowrap;
  }

  @keyframes popIn {
    from { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
    to   { transform: translate(-50%, -50%) scale(1);   opacity: 1; }
  }

  .banner-winner { font-size: 1rem; font-weight: 700; color: #ffd700; letter-spacing: 1px; }
  .banner-sub    { font-size: 0.65rem; color: rgba(255,255,255,0.55); letter-spacing: 2px; margin-top: 2px; }

  /* SEATS */
  .seat {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }

  .seat-bottom { bottom: 3px; left: 50%; transform: translateX(-50%); }
  .seat-btm-l  { bottom: 42px; left: -10px; }
  .seat-btm-r  { bottom: 42px; right: -10px; align-items: flex-end; }
  .seat-top-l  { top: 42px; left: -10px; }
  .seat-top-r  { top: 42px; right: -10px; align-items: flex-end; }
  .seat-top    { top: 8px; left: 50%; transform: translateX(-50%); }

  /* PLAYER CHIP */
  .player-card {
    display: flex;
    align-items: center;
    gap: 7px;
    background: rgba(8,8,22,0.82);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 30px;
    padding: 4px 10px 4px 4px;
    backdrop-filter: blur(8px);
    width: max-content;
    max-width: 110px;
    transition: border-color 0.25s, box-shadow 0.25s;
  }

  .player-card.is-turn {
    border-color: #f59e0b;
    box-shadow: 0 0 0 2px rgba(245,158,11,0.28), 0 0 16px rgba(245,158,11,0.22);
    animation: turn-pulse 1.3s ease-in-out infinite;
  }

  @keyframes turn-pulse {
    0%,100% { box-shadow: 0 0 0 2px rgba(245,158,11,0.25), 0 0 10px rgba(245,158,11,0.15); }
    50%      { box-shadow: 0 0 0 3px rgba(245,158,11,0.5),  0 0 24px rgba(245,158,11,0.35); }
  }

  .player-card.is-me  { border-color: rgba(34,197,94,0.5); }
  .player-card.team-a { border-left: 3px solid #60a5fa; }
  .player-card.team-b { border-left: 3px solid #f87171; }

  .player-avatar-circle {
    width: 30px; height: 30px;
    border-radius: 50%;
    background: linear-gradient(135deg, #374151, #1f2937);
    border: 2px solid rgba(255,255,255,0.14);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.95rem;
    flex-shrink: 0;
  }

  .player-avatar-circle.is-me { background: linear-gradient(135deg,#14532d,#166534); border-color:#22c55e; }

  .player-name {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: rgba(255,255,255,0.85);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 76px;
  }

  .player-name.is-me { color: #4ade80; }

  .player-team-badge {
    font-size: 0.52rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: rgba(255,255,255,0.35);
  }

  /* OPP HAND */
  .opp-hand { display: flex; gap: 4px; }

  .opp-hand-card {
    width: 28px; height: 40px;
    border-radius: 5px;
    background: linear-gradient(155deg, #1e3a6e 0%, #0d1f40 60%, #07132a 100%);
    border: 1px solid rgba(100,160,255,0.22);
    box-shadow: 1px 2px 5px rgba(0,0,0,0.45);
    position: relative;
    overflow: hidden;
  }

  .opp-hand-card::after {
    content: '';
    position: absolute;
    inset: 3px;
    border-radius: 2px;
    background-image:
      repeating-linear-gradient(45deg,  rgba(100,160,255,0.08) 0, rgba(100,160,255,0.08) 1px, transparent 0, transparent 50%),
      repeating-linear-gradient(-45deg, rgba(100,160,255,0.08) 0, rgba(100,160,255,0.08) 1px, transparent 0, transparent 50%);
    background-size: 6px 6px;
    border: 1px solid rgba(100,160,255,0.1);
  }

  /* EMPTY SEAT */
  .empty-seat-card {
    display: flex;
    align-items: center;
    gap: 7px;
    background: rgba(0,0,0,0.22);
    border: 1px dashed rgba(255,255,255,0.1);
    border-radius: 30px;
    padding: 4px 10px 4px 4px;
    opacity: 0.4;
  }

  .empty-avatar-circle {
    width: 30px; height: 30px;
    border-radius: 50%;
    border: 1.5px dashed rgba(255,255,255,0.18);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.85rem;
    color: rgba(255,255,255,0.3);
  }

  .empty-seat-label { font-size: 0.62rem; color: rgba(255,255,255,0.3); letter-spacing: 1px; }

  /* MY HAND AREA */
  .my-hand-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin-top: 18px;
    width: min(780px, 96vw);
  }

  .hand-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0 4px;
  }

  .hand-title { font-size: 0.62rem; letter-spacing: 3px; color: rgba(0,200,255,0.5); text-transform: uppercase; font-weight: 600; }

  .turn-badge {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 2px;
    color: #f59e0b;
    background: rgba(245,158,11,0.1);
    border: 1px solid rgba(245,158,11,0.32);
    border-radius: 20px;
    padding: 2px 9px;
    animation: blink 1.1s ease-in-out infinite;
  }

  .hand-cards {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    flex-wrap: wrap;
    justify-content: center;
  }

  /* CARD */
  .my-card {
    position: relative;
    width: 60px;
    height: 84px;
    border-radius: 8px;
    background: #f9f6ee;
    border: 1px solid #d1c9b8;
    box-shadow: 0 5px 16px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.3);
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s;
    user-select: none;
    flex-shrink: 0;
    padding: 4px 5px;
    display: flex;
    flex-direction: column;
  }

  .my-card:hover:not(.invalid) { transform: translateY(-18px); box-shadow: 0 22px 36px rgba(0,0,0,0.6); }
  .my-card.selected { transform: translateY(-24px); box-shadow: 0 0 0 3px #22c55e, 0 22px 40px rgba(34,197,94,0.35); }
  .my-card.invalid  { opacity: 0.32; cursor: not-allowed; filter: grayscale(0.5); }

  .card-corner { display: flex; flex-direction: column; line-height: 1.15; }

  .card-corner.btm-right {
    position: absolute;
    bottom: 4px; right: 5px;
    transform: rotate(180deg);
  }

  .c-rank { font-size: 0.85rem; font-weight: 700; line-height: 1; }
  .c-suit { font-size: 0.65rem; line-height: 1; }

  .c-center {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.4rem;
    opacity: 0.12;
    pointer-events: none;
  }

  /* Ten highlight */
  .my-card.is-ten::before {
    content: '10';
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.4rem;
    font-weight: 900;
    letter-spacing: 1px;
    color: #f59e0b;
    opacity: 0;
    pointer-events: none;
  }

  .my-card.is-ten {
    box-shadow: 0 5px 16px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(245,158,11,0.45);
  }

  .suit-red   { color: #dc2626; }
  .suit-black { color: #111827; }

  /* ACTION BUTTONS */
  .action-row {
    display: flex;
    gap: 10px;
    margin-top: 4px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .btn-action {
    padding: 8px 22px;
    border-radius: 8px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.18s;
    border: 1px solid;
  }

  .btn-play {
    color: #4ade80;
    border-color: rgba(74,222,128,0.4);
    background: rgba(74,222,128,0.07);
  }

  .btn-play:not(:disabled):hover {
    border-color: #4ade80;
    background: rgba(74,222,128,0.14);
    box-shadow: 0 0 16px rgba(74,222,128,0.2);
    transform: translateY(-1px);
  }

  .btn-play:disabled { opacity: 0.3; cursor: not-allowed; }

  /* SUIT HINT */
  .suit-hint {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 2px;
    color: rgba(255,200,0,0.7);
    background: rgba(255,200,0,0.07);
    border: 1px solid rgba(255,200,0,0.2);
    border-radius: 20px;
    padding: 2px 10px;
    text-align: center;
  }

  /* GAME OVER OVERLAY */
  .game-over-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.82);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 300;
    animation: fadeIn 0.4s ease;
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .game-over-card {
    background: linear-gradient(160deg, #0d1f10, #091509);
    border: 1px solid rgba(0,255,100,0.2);
    border-radius: 20px;
    padding: 2.5rem 3rem;
    text-align: center;
    max-width: 420px;
    width: 90vw;
    box-shadow: 0 0 60px rgba(0,255,100,0.1);
    animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }

  .go-trophy { font-size: 3.5rem; margin-bottom: 0.5rem; }

  .go-title {
    font-family: 'Orbitron', monospace;
    font-size: 1.6rem;
    font-weight: 900;
    letter-spacing: 4px;
    color: #ffd700;
    margin-bottom: 0.25rem;
  }

  .go-subtitle {
    font-size: 0.75rem;
    letter-spacing: 3px;
    color: rgba(255,255,255,0.3);
    margin-bottom: 1.5rem;
    text-transform: uppercase;
  }

  .go-scores {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 1.5rem;
  }

  .go-score-box {
    flex: 1;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 0.75rem 1rem;
  }

  .go-score-box.winner-box { border-color: rgba(255,215,0,0.4); background: rgba(255,215,0,0.06); }

  .go-score-team { font-size: 0.65rem; letter-spacing: 2px; color: rgba(255,255,255,0.4); margin-bottom: 0.25rem; }
  .go-score-tens { font-size: 2rem; font-weight: 700; }
  .go-score-players { font-size: 0.65rem; color: rgba(255,255,255,0.35); margin-top: 0.25rem; }

  .go-btn {
    background: linear-gradient(135deg, rgba(0,255,100,0.15), rgba(0,200,80,0.2));
    border: 1px solid rgba(0,255,100,0.4);
    border-radius: 10px;
    padding: 0.75rem 2rem;
    color: #00ff88;
    font-family: 'Orbitron', monospace;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 2px;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 0.5rem;
  }

  .go-btn:hover { box-shadow: 0 0 20px rgba(0,255,100,0.25); color: #fff; }

  /* ERROR TOAST */
  .error-toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(200,30,30,0.92);
    border: 1px solid rgba(255,80,80,0.4);
    border-radius: 10px;
    padding: 10px 20px;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    z-index: 400;
    animation: slideUp 0.3s ease;
    pointer-events: none;
  }

  @keyframes slideUp { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }

  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

  /* TEAM PANEL */
  .team-panel {
    display: flex;
    gap: 8px;
    margin-top: 8px;
    font-size: 0.68rem;
    letter-spacing: 1px;
  }

  .team-tag {
    padding: 3px 10px;
    border-radius: 12px;
    font-weight: 700;
  }

  .team-tag.team-a { background: rgba(96,165,250,0.12); border: 1px solid rgba(96,165,250,0.3); color: #93c5fd; }
  .team-tag.team-b { background: rgba(248,113,113,0.12); border: 1px solid rgba(248,113,113,0.3); color: #fca5a5; }


`;

// ════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════

const rotatePlayers = (players, me) => {
  const i = players.indexOf(me);
  if (i <= 0) return players;
  return [...players.slice(i), ...players.slice(0, i)];
};

const getSuitClass = (suit) =>
  ["♥", "♦"].includes(suit) ? "suit-red" : "suit-black";

const SEAT_CLASSES = [
  "seat-bottom",
  "seat-btm-l",
  "seat-btm-r",
  "seat-top-l",
  "seat-top-r",
  "seat-top",
];
const TRICK_SLOT_LABELS = ["You", "Left", "Right", "Top"];
const TOP_SEATS = new Set(["seat-top-l", "seat-top-r", "seat-top"]);
const SIDE_BOT_SEATS = new Set(["seat-btm-l", "seat-btm-r"]);

// ════════════════════════════════════════════
//  CARD COMPONENT
// ════════════════════════════════════════════

// const CardFace = ({ card, small = false }) => {
//   if (!card) return null;
//   const sc = getSuitClass(card.suit);
//   const sz = small
//     ? { rank: "0.72rem", suit: "0.58rem", center: "1.1rem" }
//     : { rank: "0.85rem", suit: "0.65rem", center: "1.4rem" };

//   return (
//     <>
//       <div className="card-corner">
//         <span className={`c-rank ${sc}`} style={{ fontSize: sz.rank }}>
//           {card.rank}
//         </span>
//         <span className={`c-suit ${sc}`} style={{ fontSize: sz.suit }}>
//           {card.suit}
//         </span>
//       </div>
//       <span className={`c-center ${sc}`} style={{ fontSize: sz.center }}>
//         {card.suit}
//       </span>
//       <div className="card-corner btm-right">
//         <span className={`c-rank ${sc}`} style={{ fontSize: sz.rank }}>
//           {card.rank}
//         </span>
//         <span className={`c-suit ${sc}`} style={{ fontSize: sz.suit }}>
//           {card.suit}
//         </span>
//       </div>
//     </>
//   );
// };

// ==========================================
//  COUNTDOWN OVERLAY
// ==========================================

const CIRCUMFERENCE = 2 * Math.PI * 46; // r=46

const CountdownOverlay = ({ value }) => {
  // stroke-dashoffset goes from 0 (full ring) down to CIRCUMFERENCE (empty)
  const offset = CIRCUMFERENCE - (value / 3) * CIRCUMFERENCE;
  return (
    <div className="countdown-overlay">
      <div className="countdown-ring">
        <svg viewBox="0 0 100 100" width="110" height="110">
          <circle className="countdown-ring-track" cx="50" cy="50" r="46" />
          <circle
            className="countdown-ring-fill"
            cx="50"
            cy="50"
            r="46"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="countdown-number" key={value}>
          {value}
        </div>
      </div>
      <div className="countdown-label">Game starting</div>
    </div>
  );
};

// ==========================================
//  GAME OVER SCREEN
// ════════════════════════════════════════════

const GameOverScreen = ({ result, onBack }) => {
  const isDraw = !result.winner;
  return (
    <div className="game-over-overlay">
      <div className="game-over-card">
        <div className="go-trophy">{isDraw ? "🤝" : "🏆"}</div>
        <div className="go-title">
          {isDraw ? "DRAW!" : `TEAM ${result.winner} WINS!`}
        </div>
        <div className="go-subtitle">
          Game Complete · {result.tensA + result.tensB} Tens Played
        </div>

        <div className="go-scores">
          <div
            className={`go-score-box ${result.winner === "A" ? "winner-box" : ""}`}
          >
            <div className="go-score-team">TEAM A</div>
            <div className="go-score-tens" style={{ color: "#60a5fa" }}>
              {result.tensA} 🃏
            </div>
            <div className="go-score-players">{result.teamA.join(" & ")}</div>
          </div>
          <div
            className={`go-score-box ${result.winner === "B" ? "winner-box" : ""}`}
          >
            <div className="go-score-team">TEAM B</div>
            <div className="go-score-tens" style={{ color: "#f87171" }}>
              {result.tensB} 🃏
            </div>
            <div className="go-score-players">{result.teamB.join(" & ")}</div>
          </div>
        </div>

        <button className="go-btn" onClick={onBack}>
          ← Back to Lobby
        </button>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════

const GamePlayground = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [socket, setSocket] = useState(null);
  const [players, setPlayers] = useState(location.state?.players || []);
  const [teams, setTeams] = useState({ A: [], B: [] });
  const [currentTurn, setCurrentTurn] = useState("");
  const [myHand, setMyHand] = useState([]);
  const [validCardIds, setValidCardIds] = useState(null); // null = all valid
  const [selectedCard, setSelectedCard] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentTrick, setCurrentTrick] = useState([]); // [{player, card}]
  const [leadSuit, setLeadSuit] = useState(null);
  const [trickNumber, setTrickNumber] = useState(1);
  const [score, setScore] = useState({ A: 0, B: 0 });
  const [trickWinner, setTrickWinner] = useState(null); // shown briefly
  const [gameOver, setGameOver] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDealing, setIsDealing] = useState(false);
  const [dealingCards, setDealingCards] = useState([]);
  // const [countdown, setCountdown] = useState(null); // 3 | 2 | 1 | null
  const countdown = null;
  const [pendingHand, setPendingHand] = useState(null);
  const pendingHandRef = useRef(null);
  // All-players-joined phase: full-screen overlay with countdown
  const [joinCountdown, setJoinCountdown] = useState(null); // 5..1 | null
  const [joinPlayers, setJoinPlayers] = useState([]);
  const seatRefs = useRef({});
  const tableRef = useRef(null);
  const trickWinnerTimer = useRef(null);
  const countdownRef = useRef(null);
  const joinCountdownRef = useRef(null);
  const gameStartedRef = useRef(false);
  const joinDoneRef = useRef(false);
  const token = localStorage.getItem("token");
  const myUsername = token
    ? JSON.parse(atob(token.split(".")[1])).username
    : "";
  const myTeam = teams.A.includes(myUsername)
    ? "A"
    : teams.B.includes(myUsername)
      ? "B"
      : null;
  const rotated = rotatePlayers(players, myUsername);
  const isMyTurn = currentTurn === myUsername;

  // Keep a ref to rotated so the deal-hand socket handler (closure) can read
  // the LIVE player list without being stale.
  const rotatedRef = useRef(rotated);
  useEffect(() => {
    rotatedRef.current = rotated;
  }, [rotated]);

  // Keep pendingHandRef in sync so startDealingAnimation never reads a stale closure
  useEffect(() => {
    pendingHandRef.current = pendingHand;
  }, [pendingHand]);

  // Show error toast for 2.5s
  const showError = useCallback((msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 2500);
  }, []);

  const startDealingAnimation = useCallback(() => {
    if (!tableRef.current) return;

    const tableRect = tableRef.current.getBoundingClientRect();
    const cards = [];
    const liveRotated = rotatedRef.current;

    for (let i = 0; i < 52; i++) {
      const player = liveRotated[i % 4];
      const seatEl = seatRefs.current[player];

      if (!seatEl) continue;

      const rect = seatEl.getBoundingClientRect();

      cards.push({
        id: i,
        x: rect.left + rect.width / 2 - tableRect.left,
        y: rect.top + rect.height / 2 - tableRect.top,
        delay: i * 60,
      });
    }

    setIsDealing(true);
    setDealingCards(cards);

    setTimeout(
      () => {
        setMyHand(pendingHandRef.current);
        setIsDealing(false);
        setDealingCards([]);
        setPendingHand(null);
      },
      52 * 60 + 500,
    );
  }, []);

  useEffect(() => {
    if (!token) return navigate("/");

    const s = io(SOCKET_BASE, {
      auth: { token },
      transports: ["websocket"],
    });

    s.on("connect", () => {
      setConnected(true);
      s.emit("join-room", roomId);
    });

    s.on("disconnect", () => setConnected(false));

    // s.on("room-update", (d) => setPlayers(d.players || []));

    s.on("game-started", (data) => {
      gameStartedRef.current = true;
      setPlayers(data.players);
    });

    s.on("room-update", (d) => {
      if (!gameStartedRef.current) {
        setPlayers(d.players || []);
      }
    });
    // Receive private hand — 3-2-1 countdown then CSS-transition card deal
    // s.on("deal-hand", (hand) => {
    //   setSelectedCard(null);
    //   setPendingHand(hand);

    //   // ── Phase A: 3-2-1 countdown overlay on the table ──
    //   setCountdown(3);
    //   const t1 = setTimeout(() => setCountdown(2), 1000);
    //   const t2 = setTimeout(() => setCountdown(1), 2000);

    //   // ── Phase B: start dealing after countdown ──
    //   const t3 = setTimeout(() => {
    //     setCountdown(null);

    //     if (!tableRef.current) return;
    //     const tableRect = tableRef.current.getBoundingClientRect();
    //     const cx = tableRect.width / 2 - 18; // center x minus half-card
    //     const cy = tableRect.height / 2 - 26; // center y minus half-card

    //     // rotatedRef.current is always the live player array (no stale closure)
    //     const liveRotated = rotatedRef.current;
    //     const rotations = Array.from(
    //       { length: 52 },
    //       (_, i) => ((i * 137.5) % 30) - 15,
    //     );

    //     const cards = [];
    //     for (let i = 0; i < 52; i++) {
    //       const player = liveRotated[i % Math.max(liveRotated.length, 1)];
    //       const seatEl = seatRefs.current[player];
    //       if (!seatEl) continue;

    //       const seatRect = seatEl.getBoundingClientRect();
    //       const finalX =
    //         seatRect.left + seatRect.width / 2 - tableRect.left - 18;
    //       const finalY =
    //         seatRect.top + seatRect.height / 2 - tableRect.top - 26;

    //       cards.push({
    //         id: i,
    //         startX: cx,
    //         startY: cy,
    //         finalX,
    //         finalY,
    //         rot: rotations[i],
    //         delay: i * 70,
    //         animate: false, // starts at center, not yet transitioned
    //       });
    //     }

    //     // 1) Mount cards at their START position (center of table)
    //     setIsDealing(true);
    //     setDealingCards(cards);

    //     // 2) After two rAF ticks the DOM has painted the start state.
    //     //    Flip animate=true so the CSS transition fires for each card.
    //     requestAnimationFrame(() => {
    //       requestAnimationFrame(() => {
    //         setDealingCards((prev) =>
    //           prev.map((c) => ({ ...c, animate: true })),
    //         );
    //       });
    //     });
    //   }, 3000);

    //   // ── Phase C: show real hand after all cards have landed ──
    //   const STAGGER_TOTAL = 52 * 70; // last card starts flying at this ms
    //   const FLIGHT_MS = 500; // transition duration
    //   const TOTAL = 3000 + STAGGER_TOTAL + FLIGHT_MS + 400;

    //   const t4 = setTimeout(() => {
    //     setMyHand(hand);
    //     setIsDealing(false);
    //     setDealingCards([]);
    //     setPendingHand(null);
    //   }, TOTAL);

    //   countdownRef.current = [t1, t2, t3, t4];
    // });
    s.on("deal-hand", (hand) => {
      setPendingHand(hand);
      pendingHandRef.current = hand; // keep ref in sync immediately
      // Only animate if the join countdown has already finished
      if (joinDoneRef.current) {
        startDealingAnimation();
      }
    });

    // Live hand + valid-card updates after each play
    s.on("hand-update", ({ hand, validCards }) => {
      setMyHand(hand);
      setValidCardIds(validCards ?? null);
      setSelectedCard(null);
    });

    // Trick state from server (lead suit, current trick, whose turn, score)
    s.on("trick-update", (data) => {
      setCurrentTrick(data.currentTrick || []);
      setLeadSuit(data.leadSuit);
      setTrickNumber(data.trickNumber);
      setScore(data.score || { A: 0, B: 0 });
      if (data.teams) setTeams(data.teams);
    });

    s.on("turn-update", setCurrentTurn);

    // A card was played (live update)
    s.on("card-played", ({ player, card, trickPosition }) => {
      setCurrentTrick((prev) => {
        const exists = prev.some((t) => t.player === player);
        if (exists) return prev;
        return [...prev, { player, card }];
      });
    });

    // Trick resolved
    s.on("trick-result", (data) => {
      setScore({ A: data.tensA, B: data.tensB });
      setTrickWinner({ name: data.winner, team: data.winnerTeam });

      // Clear winner banner after 1.8s
      if (trickWinnerTimer.current) clearTimeout(trickWinnerTimer.current);
      trickWinnerTimer.current = setTimeout(() => {
        setTrickWinner(null);
        setCurrentTrick([]);
        setLeadSuit(null);
      }, 1800);
    });

    // game-started fires in two cases:
    //   1. Lobby → navigation trigger (sets players/teams)
    //   2. GamePlayground re-join re-sync (same, just refresh state)
    s.on("game-started", (data) => {
      if (data.teams) setTeams(data.teams);
      if (data.players) setPlayers(data.players);
    });

    // All players have joined — show full-screen countdown before cards are dealt
    s.on("all-players-joined", ({ players: joinedPlayers, dealDelayMs }) => {
      setJoinPlayers(joinedPlayers || []);
      joinDoneRef.current = false; // reset
      const totalSecs = Math.round((dealDelayMs || 5000) / 1000);
      setJoinCountdown(totalSecs);
      const timers = [];
      for (let i = 1; i < totalSecs; i++) {
        timers.push(
          setTimeout(() => setJoinCountdown(totalSecs - i), i * 1000),
        );
      }
      timers.push(
        setTimeout(() => {
          setJoinCountdown(null);
          setJoinPlayers([]);
          joinDoneRef.current = true;
          // Only animate if deal-hand already arrived
          if (pendingHandRef.current) {
            startDealingAnimation();
          }
        }, totalSecs * 1000),
      );
      joinCountdownRef.current = timers;
    });

    s.on("invalid-move", ({ reason }) => showError(reason));
    s.on("error", showError);

    s.on("game-over", (result) => {
      setGameOver(result);
    });

    s.on("player-disconnected", ({ username }) => {
      showError(`${username} disconnected`);
    });

    setSocket(s);
    const trickTimer = trickWinnerTimer.current;
    const countdownTimers = countdownRef.current;
    const joinTimers = joinCountdownRef.current;
    return () => {
      if (trickTimer) clearTimeout(trickTimer);

      if (countdownTimers) countdownTimers.forEach((t) => clearTimeout(t));

      if (joinTimers) joinTimers.forEach((t) => clearTimeout(t));

      s.close();
    };
  }, [roomId, token, navigate, showError, startDealingAnimation]);

  const isAnimating = joinCountdown !== null || countdown !== null || isDealing;

  const playCard = () => {
    if (!selectedCard || !socket || !isMyTurn || isAnimating) return;
    socket.emit("play-card", { roomId, card: selectedCard });
    setSelectedCard(null);
  };

  const handleCardClick = (card) => {
    if (isAnimating) return;
    if (!isMyTurn) return showError("It's not your turn!");
    if (validCardIds && !validCardIds.includes(card.id)) {
      return showError(`Must follow suit: ${leadSuit}`);
    }
    setSelectedCard((prev) => (prev?.id === card.id ? null : card));
  };

  // ── Seat renderer ──
  const renderSeat = (seatClass, playerName) => {
    const isMe = playerName === myUsername;
    const isTurn = playerName === currentTurn;
    // const count = myHand?.length || 13; // approximate for opponents
    const isTop = TOP_SEATS.has(seatClass);
    const isSide = SIDE_BOT_SEATS.has(seatClass);
    const pTeam = teams.A.includes(playerName) ? "A" : "B";

    if (!playerName) {
      return (
        <div className={`seat ${seatClass}`} key={seatClass}>
          <div className="empty-seat-card">
            <div className="empty-avatar-circle">👤</div>
            <span className="empty-seat-label">Waiting…</span>
          </div>
        </div>
      );
    }

    // const cardCount = isMe
    //   ? myHand?.length
    //   : Math.max(1, 13 - (trickNumber - 1));

    const cards = !isMe && (
      <></>
      // <div className="opp-hand">
      //   {Array.from({ length: Math.min(cardCount, 8) }).map((_, i) => (
      //     <div className="opp-hand-card" key={i} />
      //   ))}
      // </div>
    );

    const chip = (
      <div
        className={`player-card ${isTurn ? "is-turn" : ""} ${isMe ? "is-me" : ""} team-${pTeam}`}
      >
        <div className={`player-avatar-circle ${isMe ? "is-me" : ""}`}>
          {isMe ? "😎" : "👤"}
        </div>
        <div>
          <div className={`player-name ${isMe ? "is-me" : ""}`}>
            {isMe ? `${playerName} ★` : playerName}
          </div>
          <div className="player-team-badge">TEAM {pTeam}</div>
        </div>
      </div>
    );

    return (
      <div
        className={`seat ${seatClass}`}
        ref={(el) => {
          if (playerName) seatRefs.current[playerName] = el;
        }}
        key={seatClass}
      >
        {isTop && cards}
        {chip}
        {(isSide || seatClass === "seat-bottom") && cards}
      </div>
    );
  };

  // ── Trick area ──
  // Map: slot index → rotated player index
  // rotated[0]=me(bottom), rotated[1]=left, rotated[2]=right, rotated[3]=top(4-player)
  const trickCardMap = {};
  currentTrick.forEach(({ player, card }) => {
    const idx = rotated.indexOf(player);
    if (idx >= 0) trickCardMap[idx] = card;
  });

  const renderTrickArea = () => (
    <div className="trick-area">
      <div className="trick-label">Current Trick</div>
      <div className="trick-cards-grid">
        {[3, 1, 2, 0].map((slotIdx, gridPos) => {
          const card = trickCardMap[slotIdx];
          const sc = card ? getSuitClass(card.suit) : null;
          const isWinner = trickWinner && rotated[slotIdx] === trickWinner.name;
          return (
            <div className="trick-slot" key={gridPos}>
              {card ? (
                <div className="trick-card">
                  {isWinner && <div className="trick-winner-overlay" />}
                  <div className="card-corner">
                    <span
                      className={`c-rank ${sc}`}
                      style={{ fontSize: "0.78rem" }}
                    >
                      {card.rank}
                    </span>
                    <span
                      className={`c-suit ${sc}`}
                      style={{ fontSize: "0.62rem" }}
                    >
                      {card.suit}
                    </span>
                  </div>
                  <span
                    className={`c-center ${sc}`}
                    style={{ fontSize: "1.1rem" }}
                  >
                    {card.suit}
                  </span>
                  <div className="card-corner btm-right">
                    <span
                      className={`c-rank ${sc}`}
                      style={{ fontSize: "0.78rem" }}
                    >
                      {card.rank}
                    </span>
                    <span
                      className={`c-suit ${sc}`}
                      style={{ fontSize: "0.62rem" }}
                    >
                      {card.suit}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="trick-slot-label">
                  {rotated[slotIdx] || TRICK_SLOT_LABELS[gridPos]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── My hand card ──
  const renderHandCard = (card, i) => {
    const isInvalid =
      isMyTurn && validCardIds && !validCardIds.includes(card.id);
    const isSelected = selectedCard?.id === card.id;
    const isTen = card.rank === "10";
    const sc = getSuitClass(card.suit);

    return (
      <div
        key={card.id || i}
        className={[
          "my-card",
          isSelected ? "selected" : "",
          isInvalid ? "invalid" : "",
          isTen ? "is-ten" : "",
        ].join(" ")}
        onClick={() => handleCardClick(card)}
        title={isInvalid ? `Must follow suit: ${leadSuit}` : ""}
      >
        <div className="card-corner">
          <span className={`c-rank ${sc}`}>{card.rank}</span>
          <span className={`c-suit ${sc}`}>{card.suit}</span>
        </div>
        <span className={`c-center ${sc}`}>{card.suit}</span>
        <div className="card-corner btm-right">
          <span className={`c-rank ${sc}`}>{card.rank}</span>
          <span className={`c-suit ${sc}`}>{card.suit}</span>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════
  return (
    <>
      <style>{styles}</style>

      {/* Full-screen overlay: shown when all players join, counts down to deal */}
      {joinCountdown !== null && (
        <div className="join-countdown-overlay">
          <div className="join-countdown-title">
            ✅ All Players Joined!
            <br />
            <span
              style={{
                fontSize: "0.75rem",
                color: "rgba(0,255,136,0.5)",
                letterSpacing: 3,
              }}
            >
              Cards deal in {joinCountdown}s
            </span>
          </div>
          <div className="join-countdown-players">
            {joinPlayers.map((p) => (
              <div className="join-player-chip" key={p}>
                👤 {p}
              </div>
            ))}
          </div>
          <div
            className="countdown-ring"
            style={{ width: 130, height: 130, position: "relative" }}
          >
            <svg
              viewBox="0 0 100 100"
              width="130"
              height="130"
              style={{
                position: "absolute",
                inset: 0,
                transform: "rotate(-90deg)",
              }}
            >
              <circle className="countdown-ring-track" cx="50" cy="50" r="46" />
              <circle
                className="countdown-ring-fill"
                cx="50"
                cy="50"
                r="46"
                strokeDasharray={2 * Math.PI * 46}
                strokeDashoffset={(1 - joinCountdown / 5) * 2 * Math.PI * 46}
                style={{
                  stroke: "#00ff88",
                  filter: "drop-shadow(0 0 8px rgba(0,255,136,0.8))",
                }}
              />
            </svg>
            <div
              className="countdown-number"
              key={joinCountdown}
              style={{
                color: "#00ff88",
                textShadow: "0 0 24px rgba(0,255,136,0.9)",
              }}
            >
              {joinCountdown}
            </div>
          </div>
          <div
            className="countdown-label"
            style={{ marginTop: 16, color: "rgba(0,255,136,0.5)" }}
          >
            DEALING CARDS SOON
          </div>
        </div>
      )}

      {gameOver && (
        <GameOverScreen result={gameOver} onBack={() => navigate("/lobby")} />
      )}

      {errorMsg && <div className="error-toast">⚠ {errorMsg}</div>}

      {/* Trick winner banner */}
      {trickWinner && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            zIndex: 250,
            pointerEvents: "none",
          }}
        >
          <div className="trick-winner-banner">
            <div className="banner-winner">🏅 {trickWinner.name}</div>
            <div className="banner-sub">
              WON THE TRICK · TEAM {trickWinner.team}
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="game-nav">
        <div className="nav-brand">🃏 Dehla Pakad</div>

        <div className="nav-center">
          <div className="score-pill">
            <span className="score-a">Team A: {score.A} 🃏</span>
            <span className="score-sep">|</span>
            <span className="score-b">Team B: {score.B} 🃏</span>
          </div>
          <div className="trick-pill">Trick {trickNumber}/13</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="room-pill">{roomId}</div>
          <div
            className="live-dot"
            style={{ color: connected ? "#22c55e" : "#f87171" }}
          >
            {connected ? "LIVE" : "OFFLINE"}
          </div>
        </div>
      </nav>

      <div className="game-root">
        {/* TABLE */}
        <div className="table-scene" ref={tableRef}>
          <div className="table-rail" />
          <div className="table-felt">{renderTrickArea()}</div>

          {/* Countdown overlay - rendered inside table-felt or over the table */}
          {countdown !== null && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 50,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CountdownOverlay value={countdown} />
            </div>
          )}

          {/* Dealing animation — cards slide from center to each seat via CSS transition */}
          {isDealing && (
            <div className="dealing-layer">
              {dealingCards.map((card) => {
                const x = card.animate ? card.finalX : card.startX;
                const y = card.animate ? card.finalY : card.startY;
                const scale = card.animate ? 1 : 0.4;
                const opacity = card.animate ? 1 : 0;
                const rotate = card.animate ? card.rot : 0;
                return (
                  <div
                    key={card.id}
                    className="deal-card"
                    style={{
                      top: 0,
                      left: 0,
                      transitionDelay: `${card.delay}ms`,
                      transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)`,
                      opacity,
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Player seats */}
          {SEAT_CLASSES.map((sc, i) => renderSeat(sc, rotated[i] || null))}
        </div>

        {/* MY HAND */}
        <div className="my-hand-area">
          <div className="hand-header">
            <div className="hand-title">
              {isAnimating
                ? joinCountdown !== null
                  ? "All players joined — get ready!"
                  : countdown !== null
                    ? "Get ready..."
                    : "Dealing cards..."
                : `Your Hand (${myHand?.length} cards)`}
              {myTeam && !isAnimating && (
                <span style={{ marginLeft: 8, opacity: 0.5 }}>
                  · Team {myTeam}
                </span>
              )}
            </div>
            {isMyTurn && !isAnimating && (
              <div className="turn-badge">▶ YOUR TURN</div>
            )}
          </div>

          {/* Lead suit hint */}
          {isMyTurn && leadSuit && !isAnimating && (
            <div className="suit-hint">
              Lead Suit: {leadSuit} — Follow if you can!
            </div>
          )}

          <div className="hand-cards">
            {isAnimating ? (
              /* Show face-down placeholders while dealing */
              Array.from({ length: 13 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 60,
                    height: 84,
                    borderRadius: 8,
                    background:
                      "linear-gradient(155deg,#1e3a6e 0%,#0d1f40 60%,#07132a 100%)",
                    border: "1px solid rgba(100,160,255,0.22)",
                    boxShadow: "0 5px 16px rgba(0,0,0,0.55)",
                    opacity: countdown !== null ? 0.15 : 0.5 + (i / 13) * 0.4,
                    transition: `opacity ${i * 80}ms ease`,
                    flexShrink: 0,
                  }}
                />
              ))
            ) : (
              <>
                {myHand?.map((card, i) => renderHandCard(card, i))}
                {myHand.length === 0 && (
                  <div
                    style={{
                      color: "rgba(255,255,255,0.25)",
                      fontSize: "0.8rem",
                      letterSpacing: "2px",
                    }}
                  >
                    No cards left
                  </div>
                )}
              </>
            )}
          </div>

          {!isAnimating && (
            <div className="action-row">
              <button
                className="btn-action btn-play"
                disabled={!selectedCard || !isMyTurn}
                onClick={playCard}
              >
                {selectedCard
                  ? `Play ${selectedCard.suit}${selectedCard.rank}`
                  : "Select a Card"}
              </button>
            </div>
          )}

          {/* Team info */}
          {teams.A.length > 0 && (
            <div className="team-panel">
              <div className="team-tag team-a">
                Team A: {teams.A.join(" & ")}
              </div>
              <div className="team-tag team-b">
                Team B: {teams.B.join(" & ")}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GamePlayground;
