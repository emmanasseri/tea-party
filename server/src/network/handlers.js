class FileHandler {
  constructor(gossipManager) {
    this.gossipManager = gossipManager;
    this.files = new Map(); // Tracks files available on this node
  }

  announceFiles(socket, fileData) {
    this.gossipManager.handleFileMetadata(socket, fileData);
    console.log(
      `Announced file from [${socket.id}]: ${JSON.stringify(fileData)}`
    );
  }

  handleFileRequest(socket, fileName) {
    const fileData = this.gossipManager.allFiles.get(fileName);
    if (fileData) {
      console.log(`File ${fileName} requested, directing to download.`);
      socket.emit("fileLocation", fileData);
    } else {
      console.log(`File ${fileName} not found.`);
      socket.emit("fileNotFound", { fileName });
    }
  }

  findPeerWithFile(fileName) {
    for (let [ws, files] of this.files) {
      if (files.some((file) => file.name === fileName)) {
        return ws.id; // Assume each socket has a unique ID
      }
    }
    return null;
  }

  broadcastFileList() {
    const allFiles = Array.from(this.files.values()).flat();
    this.gossipManager.io.emit("updateFileList", allFiles); // Assuming the GossipManager has access to the io instance
  }
}

module.exports = FileHandler;
