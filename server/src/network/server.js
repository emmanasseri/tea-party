import express from "express";
import http from "http";
import { Server as SocketIO } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import open from "open";
import GossipManager from "./gossip.js"; // Assuming ES modules are configured

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server);

const port = process.argv[2] || 8080;
const initialPeers = process.argv.slice(3);
const gossipManager = new GossipManager(port, initialPeers, io); // Pass the Socket.IO instance

app.use(express.static(path.join(__dirname, "../../../client/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../../client/build/index.html"));
});

io.on("connection", (socket) => {
  console.log(`[${port}] A client connected via Socket.IO`);
  socket.on("disconnect", () => console.log(`[${port}] Client disconnected`));
});

server.listen(port, async () => {
  console.log(`Server running on http://localhost:${port}`);
  try {
    await open(`http://localhost:${port}`);
  } catch (err) {
    console.error("Failed to open browser:", err);
  }
});

setInterval(() => {
  const peerList = Array.from(gossipManager.peers); // Assuming `peers` is a Set of active peers
  io.emit("update-peer-list", peerList);
  console.log("Broadcasting updated peer list:", peerList);
}, 10000); // Broadcast every 10 seconds
