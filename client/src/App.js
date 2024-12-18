import React, { useState, useEffect } from "react";
import { Box, Button, Text, keyframes } from "@chakra-ui/react";
import Header from "./components/Header";
import FileListing from "./components/FileListing";
import MainHeading from "./components/MainHeading";
import PeerDisplay from "./components/PeerDisplay";
import UploadAFile from "./components/UploadAFile";
import useSocket from "./services/websocketService";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

const gradientShift = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

function App() {
  const { address, isConnected } = useAccount();
  const { socket, peers, networkFiles } = useSocket();

  useEffect(() => {
    if (isConnected && address && socket) {
      console.log("Wallet connected with address:", address);
      // Once wallet is connected, send the node identity to the server
      socket.emit("node-identity", { nodeId: address });
    }
  }, [isConnected, address, socket]);

  console.log("Current peers:", peers);
  console.log("Current files:", networkFiles);

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      flexDirection="column"
      p="6"
      background="linear-gradient(270deg, #FBB6CE, #9F7AEA, #FBB6CE)"
      backgroundSize="400% 400%"
      animation={`${gradientShift} 20s ease infinite`}
    >
      <Header />
      <MainHeading />

      <>
        <ConnectButton />
        <PeerDisplay peerList={peers} />
        <UploadAFile socket={socket} />
        <FileListing fileList={networkFiles} />
      </>
    </Box>
  );
}

export default App;
