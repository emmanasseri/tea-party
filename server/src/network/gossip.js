import { io } from "socket.io-client";

class GossipManager {
  constructor(port, initialPeers, socketServer) {
    this.port = port;
    this.peers = new Set(initialPeers);
    this.io = socketServer;
    this.clients = new Map();
    this.allFiles = new Map(); // Store all known file metadata

    initialPeers.forEach((peer) => this.connectToPeer(peer));
    this.setupPeerConnectionListener();
  }

  setupPeerConnectionListener() {
    this.io.on("connection", (socket) => {
      socket.on("peer-announcement", (newPeer) => {
        this.handleNewPeer(newPeer);
      });

      socket.on("new-file-upload", (fileData) => {
        this.handleFileMetadata(socket, fileData, true);
      });

      socket.on("update-file-metadata", (fileData) => {
        this.handleFileMetadata(socket, fileData, false);
      });
    });
  }

  handleFileMetadata(socket, fileData, isOrigin) {
    console.log(
      `Received file data from [${socket.id}]: ${JSON.stringify(fileData)}`
    );
    const existingFile = this.allFiles.get(fileData.name);
    if (
      !existingFile ||
      (existingFile && existingFile.lastModified < fileData.lastModified)
    ) {
      this.allFiles.set(fileData.name, fileData);

      if (isOrigin) {
        this.broadcastFileMetadata(fileData);
      }
    } else {
      console.log(`File data for ${fileData.name} is already up-to-date.`);
    }
  }

  broadcastFileMetadata(fileData) {
    console.log(`Broadcasting file metadata: ${JSON.stringify(fileData)}`);
    this.clients.forEach((client) => {
      client.emit("update-file-metadata", fileData);
    });
  }
  connectToPeer(peer) {
    if (peer === this.port.toString() || this.clients.has(peer)) return;

    const url = `http://localhost:${peer}`;
    const client = io(url);

    client.on("connect", () => {
      console.log(`[${this.port}] Connected to new peer on port ${peer}`);
      this.clients.set(peer, client);
      client.emit("peer-announcement", this.port);
    });

    client.on("disconnect", () => {
      console.log(`[${this.port}] Disconnected from peer at port ${peer}`);
      this.clients.delete(peer);
      this.peers.delete(peer);
    });

    client.on("error", (error) => {
      console.error(`[${this.port}] Error with peer at port ${peer}:`, error);
    });
  }

  broadcastNewPeer(newPeer) {
    this.clients.forEach((client, peer) => {
      if (peer !== newPeer.toString()) {
        client.emit("peer-announcement", newPeer);
      }
    });
  }

  handleNewPeer(newPeer) {
    if (!this.peers.has(newPeer) && newPeer !== this.port.toString()) {
      this.peers.add(newPeer);
      this.connectToPeer(newPeer);
    }
  }
}

export default GossipManager;
