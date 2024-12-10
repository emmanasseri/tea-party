const WebSocket = require("ws");

// Retrieve port number from command line arguments or use default
const port = process.argv[2] || 8080;

const wss = new WebSocket.Server({ port: port });

wss.on("connection", function connection(ws) {
  console.log(`A new client connected on port ${port}.`);
  ws.on("message", function incoming(message) {
    console.log(`Received on port ${port}: ${message}`);
  });
  ws.send(`Welcome to the Tea Party P2P Network on port ${port}!`);
});

console.log(`Server running on ws://localhost:${port}`);
