// server/src/network/server.js
const WebSocket = require("ws");
const GossipManager = require("./gossip");
const FileHandler = require("./handlers");

const port = process.argv[2] || 8080;
const initialPeers = process.argv.slice(3);

const wss = new WebSocket.Server({ port: port });
const gossipManager = new GossipManager(port, initialPeers);
const fileHandler = new FileHandler(gossipManager);

wss.on("connection", function connection(ws) {
  console.log(`[${port}] A new client connected.`);

  ws.on("message", function incoming(message) {
    try {
      const data = JSON.parse(message);
      console.log(`[${port}] Received: ${JSON.stringify(data)}`);

      // Handling different message types
      switch (data.type) {
        case "announceFiles":
          fileHandler.announceFiles(ws, data.files);
          break;
        case "requestFile":
          fileHandler.handleFileRequest(ws, data.fileName);
          break;
        case "greeting":
        case "peerList":
          // Handle gossip-related messages
          gossipManager.handleMessage(message);
          break;
        default:
          console.log(`[${port}] Unknown message type received: ${data.type}`);
      }
    } catch (e) {
      console.error(`[${port}] Error handling message: ${e}`);
    }
  });

  // Send a greeting message as JSON
  ws.send(
    JSON.stringify({
      type: "greeting",
      message: "Welcome to the Tea Party P2P Network!",
    })
  );
});

console.log(`[${port}] Server running on ws://localhost:${port}`);
