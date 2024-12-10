import io from "socket.io-client";
import { useEffect, useState } from "react";

const socket = io("/clients"); // Connect to the '/clients' namespace if used on server

// Emit a message immediately upon connection
socket.on("connect", () => {
  console.log("Connected to server as client");
  socket.emit("message", "Hello from client");
});

// React hook for managing Socket.IO in components
export const useSocket = () => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("disconnected");

  useEffect(() => {
    // Set the status based on socket connection state
    socket.on("connect", () => {
      console.log("Socket.IO Connected");
      setStatus("connected");
    });

    socket.on("disconnect", () => {
      console.log("Socket.IO Disconnected");
      setStatus("disconnected");
    });

    socket.on("error", (error) => {
      console.error("Socket.IO Error:", error);
      setStatus("error");
    });

    // Example of handling a custom message from server
    socket.on("message", (message) => {
      console.log("Message from server:", message);
      setData(message);
    });

    // Cleanup on component unmount or when connection changes
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("error");
      socket.off("message");
    };
  }, []);

  useEffect(() => {
    const socket = io();
    socket.on("new-peer", (data) => {
      console.log("New peer data:", data);
      // Update your state or UI here
    });
  }, []);

  return { data, status };
};
