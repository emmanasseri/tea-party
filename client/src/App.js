import React, { useState } from "react";
import { Box, Button, keyframes } from "@chakra-ui/react";
import Header from "./components/Header";
import FileListing from "./components/FileListing";
import MainHeading from "./components/MainHeading";
import PeerDisplay from "./components/PeerDisplay";
import UploadAFile from "./components/UploadAFile";
import useSocket from "./services/websocketService";

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
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const { socket, peers, status, networkFiles } = useSocket();

  const handleWalletConnect = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        const address = accounts[0];
        setWalletAddress(address);
        setIsWalletConnected(true);

        // Emit the wallet address to the server as a "new peer" announcement
        socket.emit("peer-announcement", address);
        console.log("address: ", address);
      } catch (error) {
        console.error("User rejected connection or another error:", error);
      }
    } else {
      console.error("MetaMask is not installed.");
    }
  };

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
      {isWalletConnected ? (
        <>
          <Text fontSize="lg" mb="10">
            You are connected! Explore the files and network.
          </Text>
          <PeerDisplay peerList={peers} />
          <UploadAFile socket={socket} />
          <FileListing fileList={networkFiles} />
        </>
      ) : (
        <Button colorScheme="blue" size="lg" onClick={handleWalletConnect}>
          Connect Wallet
        </Button>
      )}
    </Box>
  );
}

export default App;
