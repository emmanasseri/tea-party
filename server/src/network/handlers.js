// server/src/network/handlers.js
const clients = new Map(); // Track connected clients and their files

function handleFileAnnouncement(ws, fileList) {
  clients.get(ws).files = fileList;
  console.log(`Updated files for client: ${ws}`);
}

function handleFileRequest(ws, fileName) {
  const peer = Array.from(clients.entries()).find(([_, data]) =>
    data.files.includes(fileName)
  );
  if (peer) {
    ws.send(`Request file ${fileName} from ${peer[0]}`);
  } else {
    ws.send("File not found.");
  }
}
module.exports = { handleFileAnnouncement, handleFileRequest };
