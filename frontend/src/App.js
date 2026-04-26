import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Container } from "@mui/material";
import Login from "./components/Login";
import Register from "./components/Register";
import Lobby from "./components/Lobby";
import GamePlayground from "./components/GamePlayground";
import Room from "./components/Room";
import { useState, useEffect } from "react";
import "./App.css";

const App = () => {
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    const handleStorage = () => setToken(localStorage.getItem("token"));
    window.addEventListener("storage", handleStorage);
    // Poll for localStorage changes (same tab)
    const interval = setInterval(() => {
      const newToken = localStorage.getItem("token");
      if (newToken !== token) setToken(newToken);
    }, 100);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [token]);

  return (
    <Router>
      <Container sx={{ py: 0, px: 0 }} ClassName="main-container">
        <Routes>
          <Route
            path="/"
            element={token ? <Navigate to="/lobby" /> : <Login />}
          />
          <Route path="/register" element={<Register />} />
          <Route
            path="/lobby"
            element={token ? <Lobby /> : <Navigate to="/" />}
          />
          <Route
            path="/play/:roomId"
            element={token ? <GamePlayground /> : <Navigate to="/" />}
          />
          <Route
            path="/room/:roomId"
            element={token ? <Room /> : <Navigate to="/" />}
          />
        </Routes>
      </Container>
    </Router>
  );
};

export default App;
