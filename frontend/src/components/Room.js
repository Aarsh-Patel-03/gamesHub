import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import {
    Container, Typography, Button, Box, List, ListItem,
    ListItemText, Paper, AppBar, Toolbar, IconButton,
    Alert, TextField, Chip
} from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const SOCKET_BASE = 'http://localhost:5000';

const Room = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [socket, setSocket] = useState(null);
    const [players, setPlayers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // 🎮 Game states
    const [gameState, setGameState] = useState(null);
    const [currentTurn, setCurrentTurn] = useState('');

    const token = localStorage.getItem('token');

    const myUsername = token
        ? JSON.parse(atob(token.split('.')[1])).username
        : '';

    useEffect(() => {
        if (!token || !roomId) return navigate('/lobby');

        const newSocket = io(SOCKET_BASE, {
            auth: { token },
            transports: ['websocket']
        });

        newSocket.on('connect', () => {
            newSocket.emit('join-room', roomId);
        });

        // ✅ FIXED: correct structure
        newSocket.on('room-update', (data) => {
            setPlayers(data.players || []);
        });

        newSocket.on('player-joined', (player) =>
            setError(`${player} joined!`)
        );

        newSocket.on('player-left', (player) =>
            setError(`${player} left`)
        );

        newSocket.on('error', setError);

        // 💬 Chat
        newSocket.on('chat-message', (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        // 🎮 Game start
        newSocket.on('game-started', (data) => {
            setGameState(data);
            setPlayers(data.players);
            setCurrentTurn(data.currentPlayer);
        });

        // 🔄 Game sync
        newSocket.on('game-update', (data) => {
            setGameState(data);
            setPlayers(data.players);
            setCurrentTurn(data.currentPlayer);
        });

        setSocket(newSocket);

        return () => newSocket.close();
    }, [roomId, token, navigate]);

    // 💬 Send chat
    const sendChat = () => {
        if (message.trim() && socket) {
            socket.emit('chat-message', {
                roomId,
                message: message.trim()
            });
            setMessage('');
        }
    };

    // 🎴 Play card
    const playCard = (card) => {
        if (!socket) return;

        socket.emit('play-card', { roomId, card });
    };

    const leaveRoom = () => {
        socket?.emit('leave-room', roomId);
        navigate('/lobby');
    };

    const logout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    if (!socket?.connected)
        return <Alert severity="info">Joining room...</Alert>;

    const isMyTurn = currentTurn === myUsername;
    const myHand = gameState?.hands?.[myUsername] || [];

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <IconButton color="inherit" onClick={() => navigate('/lobby')}>
                        <ArrowBackIcon />
                    </IconButton>

                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Room: {roomId}
                    </Typography>

                    <IconButton color="inherit" onClick={logout}>
                        <ExitToAppIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>

            <Container sx={{ mt: 2 }}>

                {/* Alerts */}
                {error && (
                    <Alert severity="info" sx={{ mb: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                {/* Players */}
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6">
                        Players ({players.length}/4)
                    </Typography>

                    <List dense>
                        {players.map((player, i) => (
                            <ListItem key={i} selected={player === currentTurn}>
                                <ListItemText
                                    primary={`${player} ${player === gameState?.host ? '👑' : ''}`}
                                    secondary={player === currentTurn ? 'TURN' : ''}
                                />
                            </ListItem>
                        ))}
                    </List>

                    <Button variant="contained" onClick={leaveRoom} fullWidth>
                        Leave Room
                    </Button>
                </Paper>

                {/* 🎮 Game Area */}
                {gameState ? (
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6">
                            Current Turn: {currentTurn}
                        </Typography>

                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Table: {gameState.table?.map(t => t.card).join(', ') || 'Empty'}
                        </Typography>

                        <Typography variant="subtitle1">Your Cards</Typography>

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {myHand.map((card, i) => (
                                <Chip
                                    key={i}
                                    label={card}
                                    onClick={() => isMyTurn && playCard(card)}
                                    clickable={isMyTurn}
                                    color={isMyTurn ? 'primary' : 'default'}
                                />
                            ))}
                        </Box>
                    </Paper>
                ) : (
                    <Paper sx={{ mt: 4, p: 4, textAlign: 'center' }}>
                        <Typography variant="h5">Waiting for game...</Typography>
                        <Typography>Host will start the game</Typography>
                    </Paper>
                )}

                {/* 💬 Chat */}
                <Paper sx={{ p: 2, height: 250, overflow: 'auto', mb: 3 }}>
                    <Typography variant="h6">Chat</Typography>

                    {messages.map((msg, i) => (
                        <Typography key={i} variant="body2">
                            <b>{msg.username}</b>: {msg.message}
                        </Typography>
                    ))}
                </Paper>

                <Box sx={{ display: 'flex' }}>
                    <TextField
                        fullWidth
                        label="Chat message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                    />
                    <Button variant="contained" onClick={sendChat} sx={{ ml: 1 }}>
                        Send
                    </Button>
                </Box>

            </Container>
        </>
    );
};

export default Room;