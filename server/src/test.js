const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.argv[2] || 8080;

// Serve static files (React app)
app.use(express.static(path.join(__dirname, '../../client/build')));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/build/index.html'));
});


// Namespace for client connections
const clients = io.of('/clients');
clients.on('connection', function(socket) {
    console.log("Client connected", socket.id);

    socket.on('message', (msg) => {
        console.log(`Message from client ${socket.id}: ${msg}`);
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected ${socket.id}`);
    });
});

// Namespace for peer connections
const peers = io.of('/peers');
peers.on('connection', function(socket) {
    console.log("Peer connected", socket.id);

    // Example of handling a P2P message
    socket.on('p2p message', (msg) => {
        console.log(`Message from peer ${socket.id}: ${msg}`);
        // Emitting a message to all peers except the sender
        socket.broadcast.emit('p2p message', msg);
    });

    socket.on('disconnect', () => {
        console.log(`Peer disconnected ${socket.id}`);
    });
});
