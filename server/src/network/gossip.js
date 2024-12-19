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

    // Connect to initial peers given by port numbers
    this.connectToInitialPeers();
  }

  connectToInitialPeers() {
    console.log(
      `\n[${this.port}] Connecting to initial peers: ${this.initialPeers}`
    );
    this.initialPeers.forEach((peerPort) => {
      const peerAddress = `http://localhost:${peerPort}/peers`;
      const tryConnect = () => {
        if (this.nodeId && peerPort) {
          this.makeNewFriend(null, peerAddress);
        } else {
          console.log(
            `[${this.port}] Node ID not set, retrying connection to ${peerAddress} in 5 seconds`
          );
          setTimeout(tryConnect, 5000); // Retry every 5 seconds
        }
      };
      tryConnect();
    });
  }

  setupUIListeners(uiNamespace) {
    uiNamespace.on("connection", (UISocket) => {
      console.log(`[${this.port}] UI client connected: ${UISocket.id}`);
      this.client = UISocket;

      UISocket.on("set-own-node-identity", ({ nodeId }) => {
        console.log(`[${this.port}] Setting my node ID to: ${nodeId}`);
        this.nodeId = nodeId;

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
          `\n[${this.port}] Heard of a new node-identity at ${address} called ${nodeId}`
        );
        this.handleIncomingNodeIdentity(peerSocket, nodeId, address);
      });

      peerSocket.on("shared-peer-list", (peerList) => {
        console.log(`\n[${this.port}] Received this peer list:`);
        peerList.forEach(({ nodeId, address }) => {
          console.log(`  - Node ID: ${nodeId}, Address: ${address}`);
        });

        // Make sure peerList is an array
        if (!Array.isArray(peerList)) {
          console.log(
            `[${this.port}] Received peerList is not an array. Ignoring.`
          );
          return;
        }

        peerList.forEach(({ nodeId, address }) => {
          if (
            nodeId &&
            address !== this.address &&
            nodeId !== this.nodeId &&
            !this.peers.has(nodeId) &&
            nodeId !== null &&
            address !== null
          ) {
            console.log(`[${this.port}] Adding new peer: ${nodeId}`);
            this.peers.set(nodeId, { address, socket: null });
          }
        });

        // After updating, emit the updated peer list to the UI client if available
        // if (this.client) {
        //   this.client.emit("update-peer-list", Array.from(this.peers.keys()));
        // }
        this.updateUIWithPeerList();

        console.log(
          `\n[${this.port}] Updated peer list: ${Array.from(this.peers.keys())}`
        );
      });

      peerSocket.on("update-file-metadata", (fileData) => {
        console.log(
          `\n[${this.port}] Received update-file-metadata from a peer: ${fileData.name}`
        );
        this.handleFileMetadata(peerSocket, fileData, false);
      });

      peerSocket.on("new-file-upload", (fileData) => {
        console.log(
          `\n[${this.port}] Received new-file-upload from a peer: ${fileData.name}`
        );
        this.handleFileMetadata(peerSocket, fileData, true);
      });

      peerSocket.on(
        "incoming-download-request",
        ({ fileName, requesterId }) => {
          console.log(
            `\n[${this.port}] Received incoming-download-request from ${requesterId} for ${fileName}`
          );
          this.handleIncomingDownloadRequest(fileName, requesterId);
        }
      );

      peerSocket.on("disconnect", () => {
        console.log(`\n[${this.port}] Peer disconnected: ${peerSocket.id}`);
        this.removePeerBySocket(peerSocket);
      });
    });
  }

  setupIndividualPeerListeners(socket, nodeId, address) {
    socket.on("connect", () => {
      // if (nodeId === null) {
      //   console.log("Made it to peer listener set up but nodeId is null");
      // } else
      if (
        //nodeId &&
        address !== this.address &&
        nodeId !== this.nodeId &&
        !this.peers.has(nodeId) &&
        address !== null
      ) {
        console.log(`[${this.port}] Connected to peer at ${address}`);
        this.peers.set(nodeId, { address, socket });

        // Send node identity to the new peer
        socket.emit("node-identity", {
          nodeId: this.nodeId,
          address: this.address,
        });

        // Send the peer list to the new peer
        this.sendPeerList(socket);
      }
    });

    socket.on("node-identity", ({ nodeId, address }) => {
      if (nodeId === this.nodeId) return;
      console.log(
        `[${this.port}] (In Peer Socket) Heard a new node-identity at ${address} called ${nodeId}`
      );
      this.handleIncomingNodeIdentity(socket, nodeId, address);
    });

    socket.on("shared-peer-list", (peerList) => {
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
      // if (this.client) {
      //   this.client.emit("update-peer-list", Array.from(this.peers.keys()));
      // }
      this.updateUIWithPeerList();
    });

    socket.on("incoming-download-request", ({ fileName, requesterId }) => {
      console.log(
        `[${this.port}] incoming-download-request from ${requesterId} for ${fileName}`
      );
      this.handleIncomingDownloadRequest(fileName, requesterId);
    });

    socket.on("update-file-metadata", (fileData) => {
      console.log(
        `[${this.port}] update-file-metadata from ${address}: ${fileData.name}`
      );
      this.handleFileMetadata(socket, fileData, false);
    });

    socket.on("new-file-upload", (fileData) => {
      console.log(
        `[${this.port}] new-file-upload from ${address}: ${fileData.name}`
      );
      this.handleFileMetadata(socket, fileData, true);
    });

    socket.on("disconnect", () => {
      console.log(`[${this.port}] Disconnected from peer at ${address}`);
      this.removePeerBySocket(socket);
    });

    socket.on("error", (error) => {
      console.log(
        `[${this.port}] Error connecting to ${address}: ${error.message}`
      );
    });
  }

  connectToPeer(peerAddress) {
    if (!this.nodeId) {
      console.log(
        `[${this.port}] Delaying connection to ${peerAddress} until nodeId is set`
      );
      return;
    }

    console.log(
      `[${this.port}] Attempting to connect to peer at ${peerAddress}`
    );

    // something needs to be done here. this null nodeId is messing shit up
    // or should i deal with null nodeIds on the front end?
    this.makeNewFriend(null, peerAddress);
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

  broadcastFullPeerList() {
    const peerArray = Array.from(this.peers.keys());
    console.log(`\n[${this.port}] Broadcasting full peer list: ${peerArray}`);
    //this.client.emit("update-peer-list", peerArray);
    this.updateUIWithPeerList();
  }
  makeNewFriend(nodeId, address) {
    // create socket connection with peer
    const socket = io(address);
    this.setupIndividualPeerListeners(socket, nodeId, address);
  }

  updateUIWithPeerList() {
    if (this.client) {
      const peerList = Array.from(this.peers.entries()).map(
        ([nodeId, { address }]) => ({
          nodeId,
          address,
        })
      );
      this.client.emit("update-peer-list", peerList);
    }
  }

  handleIncomingNodeIdentity(socket, nodeId, address) {
    if (nodeId === this.nodeId) return;

    if (this.peers.has(nodeId)) {
      // Update existing peer info if needed
      const peerInfo = this.peers.get(nodeId);
      if (peerInfo.socket !== socket || peerInfo.address !== address) {
        this.peers.set(nodeId, { address, socket });
      }
    } else {
      // New peer
      if (address && this.pendingPeers.has(address)) {
        this.pendingPeers.delete(address);
      }

      this.makeNewFriend(nodeId, address);
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
      `\n[${this.port}] Sending peer list to a peer: ${JSON.stringify(
        peerArray
      )}`
    );

    peerSocket.emit("shared-peer-list", peerArray);
  }

  updatePeers(newPeers) {
    let newPeerAdded = false;

    newPeers.forEach(({ nodeId, address }) => {
      if (
        nodeId &&
        address !== this.address &&
        nodeId !== this.nodeId &&
        !this.peers.has(nodeId) &&
        nodeId !== null &&
        address !== null
      ) {
        console.log(
          `[${this.port}] Found a new friend! adding ${nodeId} at address ${address}`
        );

        // Add the new peer with nodeId, address, and socket: null for now
        this.peers.set(nodeId, { address, socket: null });
        newPeerAdded = true;
      }
    });

    if (newPeerAdded) {
      console.log(
        `[${this.port}] Updated peer list: ${JSON.stringify(
          Array.from(this.peers.entries()).map(([nodeId, { address }]) => ({
            nodeId,
            address,
          }))
        )}`
      );
      if (this.client) {
        // this.client.emit("update-peer-list", Array.from(this.peers.keys()));
        this.updateUIWithPeerList();
      }

      // After updating peers, broadcast the full peer list to all connected peers.
      this.peers.forEach(({ socket, address }, nodeId) => {
        if (!socket && address) {
          // Try to connect if socket is not established
          this.connectToPeer(address);
        } else if (socket) {
          console.log(`[${this.port}] Sending peer list to: ${nodeId}`);
          this.sendPeerList(socket);
        } else {
          console.log(
            `[${this.port}] No active socket or address for ${nodeId}, skipping sendPeerList.`
          );
        }
      });
    } else {
      console.log(
        `[${this.port}] No new peers added, not broadcasting peer list.`
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
