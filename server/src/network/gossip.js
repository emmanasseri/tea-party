import { io } from "socket.io-client";

class GossipManager {
  constructor(port, initialPeers, mainIo) {
    this.port = port;
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
    uiNamespace.on("connection", (socket) => {
      console.log(`[${this.port}] UI client connected: ${socket.id}`);
      this.client = socket;

      socket.on("set-own-node-identity", ({ nodeId }) => {
        console.log(`[${this.port}] Setting my node ID to: ${nodeId}`);
        this.nodeId = nodeId;

        // Connect to initial peers given by port
        this.initialPeers.forEach((peerPort) =>
          this.connectToPeerByPort(peerPort)
        );

        // Broadcast our nodeId to currently connected peers
        this.peers.forEach(({ socket: peerSocket }, peerId) => {
          if (peerId !== this.nodeId && peerSocket) {
            peerSocket.emit("node-identity", { nodeId: this.nodeId });
            this.sendPeerList(peerSocket);
          }
        });
      });

      socket.on("new-file-upload-ui", (fileData) => {
        console.log(`[${this.port}] UI uploaded file: ${fileData.name}`);
        fileData.owner = this.nodeId;
        fileData.lastModified = Date.now();
        this.handleFileMetadata(null, fileData, true);
      });

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

        this.handleIncomingNodeIdentity(socket, nodeId);
      });

      socket.on("shared-peer-list", (peerList) => {
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

      socket.on("disconnect", () => {
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
      console.log(`[${this.port}] Connected to peer at ${address}`);
      // Store in pending until nodeId known
      this.pendingPeers.set(address, peerSocket);

      // Send our nodeId if we have it
      if (this.nodeId) {
        peerSocket.emit("node-identity", { nodeId: this.nodeId });
        this.sendPeerList(peerSocket);
      }
    });

    peerSocket.on("node-identity", ({ nodeId }) => {
      console.log(
        `[${this.port}] Heard a new node-identity from ${address}: ${nodeId}`
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

  handleIncomingNodeIdentity(socket, nodeId, address = null) {
    if (nodeId === this.nodeId) return;

    if (!address) {
      address = this.findAddressBySocket(socket);
    }

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
      this.peers.set(nodeId, { socket, address: address || "unknown" });
    }

    console.log(
      `[${this.port}] Peer identified as ${nodeId} at address: ${address}`
    );
    this.sendPeerList(socket);
  }

  sendPeerList(peerSocket) {
    // Start by including ourselves in the peer list
    const peerArray = [
      { nodeId: this.nodeId, port: this.port.toString() }, // Ensure port is a string
    ];

    // Add known peers with their nodeId and port (if determinable)
    for (const [nodeId, { socket, address }] of this.peers.entries()) {
      let port = null;
      if (address && typeof address === "string") {
        // Attempt to parse the port from the address (e.g. "http://localhost:8081/peers")
        const match = address.match(/http:\/\/localhost:(\d+)\//);
        if (match && match[1]) {
          port = match[1];
        }
      }

      peerArray.push({ nodeId, port });
    }

    console.log(
      `[${this.port}] Sending peer list to a peer: ${JSON.stringify(peerArray)}`
    );

    peerSocket.emit("shared-peer-list", peerArray);
  }

  updatePeers(newPeers) {
    // newPeers is expected to be an array of { nodeId }
    let newPeerAdded = false;

    newPeers.forEach(({ nodeId }) => {
      if (nodeId && nodeId !== this.nodeId && !this.peers.has(nodeId)) {
        console.log(`[${this.port}] Adding new peer by nodeId: ${nodeId}`);
        this.peers.set(nodeId, { socket: null, address: null });
        newPeerAdded = true;
      }
    });

    if (newPeerAdded) {
      console.log(
        `[${this.port}] Updated peer list: ${Array.from(this.peers.keys())}`
      );
      if (this.client) {
        this.client.emit("update-peer-list", Array.from(this.peers.keys()));
      }
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
}

export default GossipManager;
