import { io } from "socket.io-client";

class GossipManager {
  constructor(port, initialPeers, mainIo) {
    this.port = port;
    this.nodeId = null;
    this.peers = new Set(initialPeers); // Initially, these might be ports or known nodeIds
    this.clients = new Map(); // nodeId -> Socket.IO client (or temporary)
    this.allFiles = new Map(); // fileName -> fileData

    // Create namespaces
    this.uiNamespace = mainIo.of("/ui");
    this.peerNamespace = mainIo.of("/peers");

    // Listen for UI clients
    this.setupUIListeners(this.uiNamespace);
    // Listen for peer connections
    this.setupPeerListeners(this.peerNamespace);

    // We'll connect to initial peers after we have a nodeId from the UI.
    // Store initial peers and connect after nodeId is available:
    this.initialPeers = initialPeers;
  }

  setupUIListeners(uiNamespace) {
    uiNamespace.on("connection", (socket) => {
      console.log(`[${this.port}] UI client connected: ${socket.id}`);

      // UI sets node identity once wallet is connected
      socket.on("node-identity", ({ nodeId }) => {
        console.log(`[${this.port}] UI provided nodeId: ${nodeId}`);
        this.nodeId = nodeId;

        // Now that we have a nodeId, attempt to connect to initial peers
        this.initialPeers.forEach((peer) => this.connectToPeer(peer));

        // Also broadcast our nodeId to currently connected peers (if any)
        this.clients.forEach((client, key) => {
          // key is either a peer identifier
          client.emit("node-identity", { nodeId: this.nodeId });
          this.sendPeerList(client);
        });
      });

      // UI triggers a new file upload
      socket.on("new-file-upload-ui", (fileData) => {
        console.log(`[${this.port}] UI uploaded file: ${fileData.name}`);
        fileData.owner = this.nodeId;
        fileData.lastModified = Date.now();
        this.handleFileMetadata(null, fileData, true);
      });

      // UI triggers a download request
      socket.on("download-request-ui", ({ fileName, ownerId }) => {
        console.log(
          `[${this.port}] UI requested download of ${fileName} from ${ownerId}`
        );
        this.handleOutgoingDownloadRequest(fileName, ownerId);
      });
    });
  }

  setupPeerListeners(peerNamespace) {
    peerNamespace.on("connection", (socket) => {
      console.log(`[${this.port}] Peer connected: ${socket.id}`);

      socket.on("node-identity", ({ nodeId }) => {
        console.log(
          `[${this.port}] Received node-identity from ${socket.id}: ${nodeId}`
        );
        if (nodeId === this.nodeId) return; // Avoid adding self

        if (!this.peers.has(nodeId)) {
          this.peers.add(nodeId);
          this.clients.set(nodeId, socket);
          console.log(`[${this.port}] Added new peer (incoming): ${nodeId}`);

          if (this.nodeId) {
            socket.emit("node-identity", { nodeId: this.nodeId });
          }
          this.sendPeerList(socket);
        }
      });

      socket.on("peerList", (peerList) => {
        console.log(
          `[${this.port}] Received peer list from a peer: ${JSON.stringify(
            peerList
          )}`
        );
        this.updatePeers(peerList);
      });

      socket.on("update-file-metadata", (fileData) => {
        console.log(
          `[${this.port}] Received update-file-metadata from a peer: ${fileData.name}`
        );
        this.handleFileMetadata(socket, fileData, false);
      });

      socket.on("new-file-upload", (fileData) => {
        console.log(
          `[${this.port}] Received new-file-upload from a peer: ${fileData.name}`
        );
        this.handleFileMetadata(socket, fileData, true);
      });

      socket.on("incoming-download-request", ({ fileName, requesterId }) => {
        console.log(
          `[${this.port}] Received incoming-download-request from ${requesterId} for ${fileName}`
        );
        this.handleIncomingDownloadRequest(fileName, requesterId);
      });
    });
  }

  connectToPeer(peer) {
    if (!this.nodeId) {
      console.log(
        `[${this.port}] Delaying connection to ${peer} until nodeId is set`
      );
      return;
    }
    if (peer === this.port.toString()) return; // Don't connect to self

    const url = `http://localhost:${peer}/peers`;
    console.log(`[${this.port}] Attempting to connect to peer at ${url}`);

    const client = io(url);

    client.on("connect", () => {
      console.log(`[${this.port}] Connected to peer at ${url}`);
      this.clients.set(peer, client);

      // Once connected, send our nodeId if we have it
      if (this.nodeId) {
        client.emit("node-identity", { nodeId: this.nodeId });
        this.sendPeerList(client);
      }
    });

    client.on("node-identity", ({ nodeId }) => {
      console.log(
        `[${this.port}] Received node-identity from ${url}: ${nodeId}`
      );
      if (nodeId !== this.nodeId && !this.peers.has(nodeId)) {
        this.peers.add(nodeId);
        this.clients.set(nodeId, client);
        console.log(`[${this.port}] Added peer ${nodeId} from ${url}`);

        // If we have our nodeId, send it back
        if (this.nodeId) {
          client.emit("node-identity", { nodeId: this.nodeId });
        }
        this.sendPeerList(client);
      }
    });

    client.on("peerList", (peerList) => {
      console.log(
        `[${this.port}] Received peer list from ${url}: ${JSON.stringify(
          peerList
        )}`
      );
      this.updatePeers(peerList);
    });

    client.on("incoming-download-request", ({ fileName, requesterId }) => {
      console.log(
        `[${this.port}] Received incoming-download-request from ${requesterId} for ${fileName}`
      );
      this.handleIncomingDownloadRequest(fileName, requesterId);
    });

    client.on("update-file-metadata", (fileData) => {
      console.log(
        `[${this.port}] Received update-file-metadata from ${url}: ${fileData.name}`
      );
      this.handleFileMetadata(client, fileData, false);
    });

    client.on("new-file-upload", (fileData) => {
      console.log(
        `[${this.port}] Received new-file-upload from ${url}: ${fileData.name}`
      );
      this.handleFileMetadata(client, fileData, true);
    });

    client.on("disconnect", () => {
      console.log(`[${this.port}] Disconnected from peer at ${url}`);
      this.clients.delete(peer);
    });

    client.on("error", (error) => {
      console.log(
        `[${this.port}] Error connecting to ${url}: ${error.message}`
      );
    });
  }

  sendPeerList(client) {
    const peerList = Array.from(this.peers);
    console.log(
      `[${this.port}] Sending peer list to a peer: ${JSON.stringify(peerList)}`
    );
    client.emit("peerList", peerList);
  }

  updatePeers(newPeers) {
    let newPeerAdded = false;
    newPeers.forEach((peer) => {
      if (peer !== this.nodeId && !this.peers.has(peer)) {
        this.peers.add(peer);
        console.log(
          `[${this.port}] Connecting to newly discovered peer: ${peer}`
        );
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

  handleFileMetadata(socket, fileData, isOrigin) {
    const existingFile = this.allFiles.get(fileData.name);
    if (!existingFile || existingFile.lastModified < fileData.lastModified) {
      this.allFiles.set(fileData.name, fileData);
      console.log(`[${this.port}] Updated file metadata for: ${fileData.name}`);

      if (isOrigin) {
        this.broadcastFileMetadata(fileData);
      }

      // Update UI (front-ends)
      this.uiNamespace.emit(
        "update-network-file-list",
        Array.from(this.allFiles.values())
      );
    } else {
      console.log(
        `[${this.port}] File ${fileData.name} is already up-to-date.`
      );
    }
  }

  broadcastFileMetadata(fileData) {
    console.log(`[${this.port}] Broadcasting file metadata: ${fileData.name}`);
    this.clients.forEach((client) => {
      client.emit("update-file-metadata", fileData);
    });
  }

  handleOutgoingDownloadRequest(fileName, ownerId) {
    if (!this.nodeId) {
      console.log(`[${this.port}] Cannot request download, no nodeId set yet.`);
      return;
    }

    const ownerSocket = this.clients.get(ownerId);
    if (!ownerSocket) {
      console.log(`[${this.port}] Owner ${ownerId} not found among clients.`);
      return;
    }

    console.log(
      `[${this.port}] Sending incoming-download-request to ${ownerId} for ${fileName}`
    );
    ownerSocket.emit("incoming-download-request", {
      fileName,
      requesterId: this.nodeId,
    });
  }

  handleIncomingDownloadRequest(fileName, requesterId) {
    console.log(
      `[${this.port}] Handling incoming download request for ${fileName} from ${requesterId}`
    );
    const fileData = this.allFiles.get(fileName);
    if (!fileData) {
      console.log(`[${this.port}] File ${fileName} not found.`);
      return;
    }

    const requesterSocket = this.clients.get(requesterId);
    if (!requesterSocket) {
      console.log(
        `[${this.port}] Requester ${requesterId} not found among clients.`
      );
      return;
    }

    console.log(
      `[${this.port}] Sending file-transfer for ${fileName} to ${requesterId}`
    );
    requesterSocket.emit("file-transfer", { fileName, fileData });
  }
}

export default GossipManager;
