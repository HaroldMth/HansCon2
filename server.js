const express = require('express');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DB1_PATH = './db1.json'; // Rooms data
const DB2_PATH = './db2.json'; // Messages and online users

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize JSON files if they don't exist
if (!fs.existsSync(DB1_PATH)) fs.writeFileSync(DB1_PATH, JSON.stringify({ rooms: [] }));
if (!fs.existsSync(DB2_PATH)) fs.writeFileSync(DB2_PATH, JSON.stringify({ messages: {}, online: {} }));

// Routes

// Get all rooms
app.get('/rooms', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DB1_PATH, 'utf-8'));
    res.json(data.rooms);
});

// Create a new room
app.post('/create-room', (req, res) => {
    const { name, password } = req.body;

    // Validate password format (min 8 characters, 1 uppercase, 1 lowercase, 1 digit)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            message: 'Password must be at least 8 characters long, contain one uppercase letter, one lowercase letter, and one digit.'
        });
    }

    const data = JSON.parse(fs.readFileSync(DB1_PATH, 'utf-8'));
    let roomName = name;

    // Ensure unique room name
    while (data.rooms.some((room) => room.name === roomName)) {
        roomName = `${name}-${Math.floor(1000 + Math.random() * 9000)}`; // Append a random 4-digit number
    }

    data.rooms.push({ name: roomName, password });
    fs.writeFileSync(DB1_PATH, JSON.stringify(data, null, 2));

    res.status(201).json({ message: `Room created successfully with name: ${roomName}` });
});

// Join a room
app.post('/join-room', (req, res) => {
    const { name, password } = req.body;
    const data = JSON.parse(fs.readFileSync(DB1_PATH, 'utf-8'));
    const room = data.rooms.find((r) => r.name === name && r.password === password);

    if (!room) {
        return res.status(403).json({ message: 'Invalid room name or password' });
    }
    res.status(200).json({ message: 'Access granted' });
});

// WebSocket for live chat
io.on('connection', (socket) => {
    socket.on('join', ({ room, username }) => {
        socket.join(room);

        const db2 = JSON.parse(fs.readFileSync(DB2_PATH, 'utf-8'));

        // Add user to online list
        if (!db2.online[room]) db2.online[room] = [];
        db2.online[room].push(username);
        fs.writeFileSync(DB2_PATH, JSON.stringify(db2, null, 2));

        // Notify users in the room
        io.to(room).emit('user-joined', username);
        io.to(room).emit('update-users', db2.online[room]);

        // Listen for messages
        socket.on('message', (msg) => {
            if (!db2.messages[room]) db2.messages[room] = [];
            db2.messages[room].push(msg);
            fs.writeFileSync(DB2_PATH, JSON.stringify(db2, null, 2));

            io.to(room).emit('message', msg);
        });

        // Handle user disconnect
        socket.on('disconnect', () => {
            db2.online[room] = db2.online[room].filter((user) => user !== username);
            fs.writeFileSync(DB2_PATH, JSON.stringify(db2, null, 2));

            io.to(room).emit('update-users', db2.online[room]);
            io.to(room).emit('user-left', username);
        });
    });
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
