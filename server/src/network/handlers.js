// server/src/network/handlers.js
class FileHandler {
  constructor(gossipManager) {
    this.gossipManager = gossipManager; // Dependency injection of Gossip Manager
    this.files = new Map(); // Tracks files available on this node
  }

  announceFiles(ws, fileList) {
    // Announce local files to the network
    this.files.set(ws, fileList);
    console.log(
      `[${ws._socket.remoteAddress}:${ws._socket.remotePort}] Updated files for this client: ${fileList}`
    );
    // Optionally broadcast file list to all connected peers
    this.broadcastFileList();
  }

  handleFileRequest(ws, fileName) {
    // Attempt to find a peer that has the requested file
    const peer = this.findPeerWithFile(fileName);
    if (peer) {
      console.log(
        `[${ws._socket.remoteAddress}:${ws._socket.remotePort}] File ${fileName} requested. Directing to peer.`
      );
      ws.send(`Request file ${fileName} from ${peer}`);
    } else {
      console.log(
        `[${ws._socket.remoteAddress}:${ws._socket.remotePort}] File ${fileName} not found.`
      );
      ws.send("File not found.");
    }
  }

  findPeerWithFile(fileName) {
    // Check own files first
    if (Array.from(this.files.values()).flat().includes(fileName)) {
      return `localhost:${this.gossipManager.port}`;
    }
    // Check files from all known peers
    for (let [peer, client] of this.gossipManager.clients) {
      if (
        this.gossipManager.peersFiles[peer] &&
        this.gossipManager.peersFiles[peer].includes(fileName)
      ) {
        return `localhost:${peer}`;
      }
    }
    return null;
  }

  broadcastFileList() {
    // Send updated file list to all peers
    const fileList = Array.from(this.files.values()).flat();
    this.gossipManager.clients.forEach((client) => {
      client.send(JSON.stringify({ type: "updateFileList", files: fileList }));
    });
  }
}

module.exports = FileHandler;
