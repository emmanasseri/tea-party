import { io } from "socket.io-client";
class GossipManager {
  constructor(port, initialPeers, socketServer) {
    this.port = port;
    this.peers = new Set(initialPeers); // Initialize with any known peers
    this.io = socketServer; // Socket.IO server instance
    this.clients = new Map(); // Active connections

    // Initialize connections to initial peers and set up listening
    this.peers.forEach((peer) => this.connectToPeer(peer));
    this.setupPeerConnectionListener();
  }

  setupPeerConnectionListener() {
    this.io.on("connection", (socket) => {
      // When a new peer announces itself
      socket.on("peer-announcement", (newPeer) => {
        this.handleNewPeer(newPeer);
      });
    });
  }

  connectToPeer(peer) {
    if (peer === this.port.toString() || this.clients.has(peer)) return; // Avoid self-connection and duplicates

    const url = `http://localhost:${peer}`;
    const client = io(url);

    client.on("connect", () => {
      console.log(`[${this.port}] Connected to new peer on port ${peer}`);
      this.clients.set(peer, client);
      // Announce to this new peer
      client.emit("peer-announcement", this.port);
      // Broadcast to other peers about this new connection
      this.broadcastNewPeer(peer);
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
    // Notify all connected peers about the new peer
    this.clients.forEach((client, peer) => {
      if (peer !== newPeer.toString()) {
        // Avoid sending back to the same peer
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
