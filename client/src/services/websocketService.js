import io from "socket.io-client";
import { useEffect, useState } from "react";

const useSocket = () => {
  const [peers, setPeers] = useState([]);
  const [status, setStatus] = useState("disconnected");

  useEffect(() => {
    const socket = io("/", {
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      console.log("Socket.IO Connected");
      setStatus("connected");
    });

    // Listen for the correct event from the server
    socket.on("update-peer-list", (updatedPeers) => {
      console.log("Received updated peer list:", updatedPeers);
      setPeers(updatedPeers);
    });

    socket.on("disconnect", () => {
      console.log("Socket.IO Disconnected");
      setStatus("disconnected");
    });

    socket.on("error", (error) => {
      console.error("Socket.IO Error:", error);
      setStatus("error");
    });

    return () => {
      socket.off("connect");
      socket.off("update-peer-list");
      socket.off("disconnect");
      socket.off("error");
      socket.close();
    };
  }, []);

  return { peers, status };
};

export default useSocket;
