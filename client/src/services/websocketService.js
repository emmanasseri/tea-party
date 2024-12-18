import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [peers, setPeers] = useState([]);
  const [status, setStatus] = useState("disconnected");
  const [networkFiles, setNetworkFiles] = useState([]);

  useEffect(() => {
    // Connect to the /ui namespace
    const newSocket = io("/ui", {
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("UI Socket.IO Connected");
      setStatus("connected");
    });

    newSocket.on("update-peer-list", (updatedPeers) => {
      console.log("Received updated peer list:", updatedPeers);
      setPeers(updatedPeers);
    });

    newSocket.on("initial-file-list", (fileList) => {
      console.log("Received initial file list:", fileList);
      setNetworkFiles(fileList);
    });

    newSocket.on("update-network-file-list", (updatedNetworkFiles) => {
      console.log("Received updated file list:", updatedNetworkFiles);
      setNetworkFiles(updatedNetworkFiles);
    });

    newSocket.on("disconnect", () => {
      console.log("UI Socket.IO Disconnected");
      setStatus("disconnected");
    });

    newSocket.on("error", (error) => {
      console.error("Socket.IO Error:", error);
      setStatus("error");
    });

    return () => {
      newSocket.off("connect");
      newSocket.off("update-peer-list");
      newSocket.off("disconnect");
      newSocket.off("error");
      newSocket.close();
    };
  }, []);

  return { socket, peers, status, networkFiles };
};

export default useSocket;
