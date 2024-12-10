// server/src/network/gossip.js
const WebSocket = require("ws");

class GossipManager {
  constructor(port, initialPeers) {
    this.port = port;
    this.peers = new Set(initialPeers);
    this.clients = new Map(); // WebSocket connections to other peers

    this.peers.forEach((peer) => this.connectToPeer(peer));
  }

  connectToPeer(peer) {
    if (peer === this.port.toString()) return; // Don't connect to self
    const url = `ws://localhost:${peer}`;
    const client = new WebSocket(url);

    client.on("open", () => {
      console.log(`[${this.port}] Connected to peer at ${url}`);
      this.clients.set(peer, client);
      this.sendPeerList(client);
    });

    client.on("message", (message) => {
      this.handleMessage(message);
    });

    client.on("error", (error) => {
      console.log(
        `[${this.port}] Error connecting to ${url}: ${error.message}`
      );
    });
  }

  sendPeerList(client) {
    const peerList = Array.from(this.peers);
    client.send(JSON.stringify({ type: "peerList", peers: peerList }));
    console.log(`[${this.port}] Sent peer list to ${client.url}`);
  }

  handleMessage(message) {
    try {
      const data = JSON.parse(message);

      if (data.type === "peerList") {
        console.log(`[${this.port}] Received peer list from a peer`);
        this.updatePeers(data.peers);
      } else if (data.type === "greeting") {
        console.log(`[${this.port}] Received greeting: ${data.message}`);
        // Handle greeting logic or simply ignore since it's just a welcome message.
      } else {
        console.log(
          `[${this.port}] Received unknown message type: ${data.type}`
        );
      }
    } catch (error) {
      console.log(`[${this.port}] Non-JSON message received: ${message}`);
    }
  }

  updatePeers(newPeers) {
    let newPeerAdded = false;
    newPeers.forEach((peer) => {
      if (!this.peers.has(peer) && peer !== this.port.toString()) {
        this.peers.add(peer);
        this.connectToPeer(peer);
        newPeerAdded = true;
      }
    });
    if (newPeerAdded) {
      console.log(
        `[${this.port}] Updated peer list: ${Array.from(this.peers)}`
      );
    }
  }
}

module.exports = GossipManager;
