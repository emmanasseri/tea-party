import { io } from "socket.io-client";

class GossipManager {
  constructor(port, initialPeers, mainIo) {
    this.port = port;
    this.address = `http://localhost:${port}/peers`;
    this.nodeId = null;

    // nodeId -> { socket, address (string) }
    this.peers = new Map();

    // address -> socket (pending until nodeId known)
    this.pendingPeers = new Map();

    this.client = null; // single UI client's socket
    this.allFiles = new Map(); // fileName -> fileData

    this.uiNamespace = mainIo.of("/ui");
    this.peerNamespace = mainIo.of("/peers");

    this.setupUIListeners(this.uiNamespace);
    this.setupPeerListeners(this.peerNamespace);

    this.initialPeers = initialPeers;
  }

  setupUIListeners(uiNamespace) {
    uiNamespace.on("connection", (UISocket) => {
      console.log(`[${this.port}] UI client connected: ${UISocket.id}`);
      this.client = UISocket;

      UISocket.on("set-own-node-identity", ({ nodeId }) => {
        console.log(`[${this.port}] Setting my node ID to: ${nodeId}`);
        this.nodeId = nodeId;

        // Connect to initial peers given by port
        this.initialPeers.forEach((peerPort) =>
          this.connectToPeerByPort(peerPort)
        );

        // Broadcast our nodeId to currently connected peers
        this.peers.forEach(({ socket: peerSocket }, peerId) => {
          if (peerId !== this.nodeId && peerSocket) {
            peerSocket.emit("node-identity", {
              nodeId: this.nodeId,
              address: this.address,
            });
            this.sendPeerList(peerSocket);
          }
        });
      });

      UISocket.on("new-personal-file-upload", (fileData) => {
        console.log(`[${this.port}] UI uploaded file: ${fileData.name}`);
        fileData.owner = this.nodeId;
        fileData.lastModified = Date.now();
        this.handleFileMetadata(null, fileData, true);
      });

      UISocket.on("download-request-from-ui", ({ fileName, ownerId }) => {
        console.log(
          `[${this.port}] UI requested download of ${fileName} from ${ownerId}`
        );
        this.handleOutgoingDownloadRequest(fileName, ownerId);
      });
    });
  }

  setupPeerListeners(peerNamespace) {
    this.startBroadcastingPeerList();
    console.log("Beginning the 10 second periodic peer list broadcast.");
    peerNamespace.on("connection", (peerSocket) => {
      console.log(`[${this.port}] Peer connected: ${peerSocket.id}`);

      peerSocket.on("node-identity", ({ nodeId, address }) => {
        if (nodeId === this.nodeId) return;
        console.log(
          `[${this.port}] (In Socket) Heard a new node-identity at ${address} called ${nodeId}`
        );
        this.handleIncomingNodeIdentity(peerSocket, nodeId, address);
      });

      peerSocket.on("shared-peer-list", (peerList) => {
        console.log(
          `[${this.port}] Received peer list from a peer: ${JSON.stringify(
            peerList
          )}`
        );

        // Make sure peerList is an array
        if (!Array.isArray(peerList)) {
          console.log(
            `[${this.port}] Received peerList is not an array. Ignoring.`
          );
          return;
        }

        // peerList: [{ nodeId: "...", socket: null }]
        // We only add new peers by their nodeId if not known and not ourselves.
        peerList.forEach(({ nodeId }) => {
          if (nodeId && nodeId !== this.nodeId && !this.peers.has(nodeId)) {
            console.log(`[${this.port}] Adding new peer: ${nodeId}`);
            // Store the peer by nodeId, socket: null for now (no direct connection)
            this.peers.set(nodeId, { socket: null, address: null });
          }
        });

        // After updating, emit the updated peer list to the UI client if available
        if (this.client) {
          this.client.emit("update-peer-list", Array.from(this.peers.keys()));
        }

        console.log(
          `[${this.port}] Updated peer list: ${Array.from(this.peers.keys())}`
        );
      });

      peerSocket.on("update-file-metadata", (fileData) => {
        console.log(
          `[${this.port}] Received update-file-metadata from a peer: ${fileData.name}`
        );
        this.handleFileMetadata(socket, fileData, false);
      });

      peerSocket.on("new-file-upload", (fileData) => {
        console.log(
          `[${this.port}] Received new-file-upload from a peer: ${fileData.name}`
        );
        this.handleFileMetadata(socket, fileData, true);
      });

      peerSocket.on(
        "incoming-download-request",
        ({ fileName, requesterId }) => {
          console.log(
            `[${this.port}] Received incoming-download-request from ${requesterId} for ${fileName}`
          );
          this.handleIncomingDownloadRequest(fileName, requesterId);
        }
      );

      peerSocket.on("disconnect", () => {
        console.log(`[${this.port}] Peer disconnected: ${socket.id}`);
        this.removePeerBySocket(socket);
      });
    });
  }

  connectToPeerByPort(peerPort) {
    if (!this.nodeId) {
      console.log(
        `[${this.port}] Delaying connection to ${peerPort} until nodeId is set`
      );
      return;
    }
    if (peerPort === this.port.toString()) {
      console.log(`[${this.port}] Skipping self port ${peerPort}`);
      return;
    }

    const address = `http://localhost:${peerPort}/peers`;
    console.log(`[${this.port}] Attempting to connect to peer at ${address}`);

    const peerSocket = io(address);

    peerSocket.on("connect", () => {
      console.log(`[${this.port}] Connected to peer at ${peerPort}`);
      // Store in pending until nodeId known
      this.pendingPeers.set(peerPort);

      // Send our nodeId if we have it
      if (this.nodeId) {
        console.log(
          `[${this.port}] Sending this info to peers about myself: nodeId=${this.nodeId}, address=${this.address}`
        );
        peerSocket.emit(
          "node-identity",
          { nodeId: this.nodeId },
          { address: this.address }
        );
        this.sendPeerList(peerSocket);
      }
    });

    peerSocket.on("node-identity", ({ nodeId, address }) => {
      if (nodeId === this.nodeId) return;
      console.log(
        `[${this.port}] (In Peer Socket) Heard a new node-identity at ${address} called ${nodeId}`
      );
      this.handleIncomingNodeIdentity(peerSocket, nodeId, address);
    });

    // Updated to "shared-peer-list" for consistency
    peerSocket.on("shared-peer-list", (peerList) => {
      console.log(
        `[${this.port}] Received peer list from ${address}: ${JSON.stringify(
          peerList
        )}`
      );

      if (!Array.isArray(peerList)) {
        console.log(
          `[${this.port}] Received peerList is not an array. Ignoring.`
        );
        return;
      }

      this.updatePeers(peerList);
      if (this.client) {
        this.client.emit("update-peer-list", Array.from(this.peers.keys()));
      }
    });

    peerSocket.on("incoming-download-request", ({ fileName, requesterId }) => {
      console.log(
        `[${this.port}] incoming-download-request from ${requesterId} for ${fileName}`
      );
      this.handleIncomingDownloadRequest(fileName, requesterId);
    });

    peerSocket.on("update-file-metadata", (fileData) => {
      console.log(
        `[${this.port}] update-file-metadata from ${address}: ${fileData.name}`
      );
      this.handleFileMetadata(peerSocket, fileData, false);
    });

    peerSocket.on("new-file-upload", (fileData) => {
      console.log(
        `[${this.port}] new-file-upload from ${address}: ${fileData.name}`
      );
      this.handleFileMetadata(peerSocket, fileData, true);
    });

    peerSocket.on("disconnect", () => {
      console.log(`[${this.port}] Disconnected from peer at ${address}`);
      this.removePeerBySocket(peerSocket);
    });

    peerSocket.on("error", (error) => {
      console.log(
        `[${this.port}] Error connecting to ${address}: ${error.message}`
      );
    });
  }

  broadcastFullPeerList() {
    const peerArray = Array.from(this.peers.keys());
    console.log(`[${this.port}] Broadcasting full peer list: ${peerArray}`);
    this.client.emit("update-peer-list", peerArray);
  }

  handleIncomingNodeIdentity(socket, nodeId, address) {
    if (nodeId === this.nodeId) return;

    if (this.peers.has(nodeId)) {
      // Update existing peer info if needed
      const peerInfo = this.peers.get(nodeId);
      if (peerInfo.socket !== socket) {
        peerInfo.socket = socket;
        if (address) peerInfo.address = address;
        this.peers.set(nodeId, peerInfo);
      }
    } else {
      // New peer
      if (address && this.pendingPeers.has(address)) {
        this.pendingPeers.delete(address);
      }

      this.peers.set(nodeId, address);
    }

    console.log(
      `[${this.port}] Peer identified as ${nodeId} at address: ${address}`
    );
    this.sendPeerList(socket);
  }

  sendPeerList(peerSocket) {
    const peerArray = Array.from(this.peers.entries()).map(
      ([nodeId, { address }]) => ({
        nodeId,
        address,
      })
    );

    peerArray.push({ nodeId: this.nodeId, address: this.address });

    console.log(
      `[${this.port}] Sending peer list to a peer: ${JSON.stringify(peerArray)}`
    );

    peerSocket.emit("shared-peer-list", peerArray);
  }
  updatePeers(newPeers) {
    let newPeerAdded = false;

    newPeers.forEach(({ nodeId, port }) => {
      if (nodeId && nodeId !== this.nodeId && !this.peers.has(nodeId)) {
        console.log(
          `[${this.port}] Found a new friend! adding ${nodeId} at port ${port}`
        );

        // Add the new peer with nodeId and port
        this.peers.set(nodeId, { address: `http://localhost:${port}/peers` });
        newPeerAdded = true;
      }
    });
    console.log(
      `[${this.port}] Current peer list after addition: ${JSON.stringify(
        Array.from(this.peers.entries())
      )}`
    );

    if (newPeerAdded) {
      console.log(
        `[${this.port}] Updated peer list: ${JSON.stringify(
          Array.from(this.peers.entries())
        )}`
      );
      if (this.client) {
        this.client.emit("update-peer-list", Array.from(this.peers.keys()));
      }
    }

    // After updating peers, broadcast the full peer list to all connected peers.
    this.peers.forEach(({ socket }, nodeId) => {
      console.log("Socket = ", socket);
      if (socket) {
        console.log(`[${this.port}] Sending peer list to: ${nodeId}`);
        this.sendPeerList(socket);
      } else {
        console.log(
          `[${this.port}] No active socket for ${nodeId}, skipping sendPeerList.`
        );
      }
    });
  }

  handleFileMetadata(socket, fileData, isOrigin) {
    const existingFile = this.allFiles.get(fileData.name);
    if (!existingFile || existingFile.lastModified < fileData.lastModified) {
      this.allFiles.set(fileData.name, fileData);
      console.log(`[${this.port}] Updated file metadata for: ${fileData.name}`);

      if (isOrigin) {
        this.broadcastFileMetadata(fileData);
      }

      // Update UI
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
    this.peers.forEach(({ socket }) => {
      if (socket) {
        socket.emit("update-file-metadata", fileData);
      }
    });
  }

  handleOutgoingDownloadRequest(fileName, ownerId) {
    if (!this.nodeId) {
      console.log(`[${this.port}] Cannot request download, no nodeId set yet.`);
      return;
    }

    const ownerPeer = this.peers.get(ownerId);
    if (!ownerPeer || !ownerPeer.socket) {
      console.log(
        `[${this.port}] Owner ${ownerId} not found or not connected.`
      );
      return;
    }

    console.log(
      `[${this.port}] Sending incoming-download-request to ${ownerId} for ${fileName}`
    );
    ownerPeer.socket.emit("incoming-download-request", {
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

    const requesterPeer = this.peers.get(requesterId);
    if (!requesterPeer || !requesterPeer.socket) {
      console.log(
        `[${this.port}] Requester ${requesterId} not found or not connected.`
      );
      return;
    }

    console.log(
      `[${this.port}] Sending file-transfer for ${fileName} to ${requesterId}`
    );
    requesterPeer.socket.emit("file-transfer", { fileName, fileData });
  }

  removePeerBySocket(socket) {
    // Check pending first
    const pendingAddress = this.findPendingAddressBySocket(socket);
    if (pendingAddress) {
      this.pendingPeers.delete(pendingAddress);
      return;
    }

    // Check known peers
    for (let [nodeId, { socket: s }] of this.peers.entries()) {
      if (s === socket) {
        this.peers.delete(nodeId);
        return;
      }
    }
  }

  findAddressBySocket(socket) {
    for (let [address, s] of this.pendingPeers.entries()) {
      if (s === socket) return address;
    }
    for (let [nodeId, { socket: s, address }] of this.peers.entries()) {
      if (s === socket) return address;
    }
    return null;
  }

  findPendingAddressBySocket(socket) {
    for (let [address, s] of this.pendingPeers.entries()) {
      if (s === socket) return address;
    }
    return null;
  }

  // every 10 seconds, broadcast the full peer list
  startBroadcastingPeerList() {
    setInterval(() => {
      this.peers.forEach(({ socket }, nodeId) => {
        if (socket) {
          console.log(`[${this.port}] Sending peer list to: ${nodeId}`);
          this.sendPeerList(socket);
        } else {
          console.log(
            `[${this.port}] No active socket for ${nodeId}, skipping sendPeerList.`
          );
        }
      });
    }, 10000);
  }
}

export default GossipManager;
