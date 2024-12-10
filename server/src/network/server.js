// Importing modules using ES6 import syntax
import express from "express";
import http from "http";
import { Server as SocketIO } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import open from "open";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server);

const port = process.argv[2] || 8080;
const initialPeers = process.argv.slice(3);

app.use(express.static(path.join(__dirname, "../../../client/build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../../client/build/index.html"));
});

io.on("connection", (socket) => {
  console.log("A client connected via Socket.IO");

  socket.emit("message", "Hello from the server!");

  socket.on("client message", (msg) => {
    console.log(`Received message from client: ${msg}`);
    socket.emit("message", `Received your message: ${msg}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Use top-level await to open the browser once the server is ready
server.listen(port, async () => {
  console.log(`Server running on http://localhost:${port}`);
  await open(`http://localhost:${port}`);
  console.log("Browser opened successfully.");
});
