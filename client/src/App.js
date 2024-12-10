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
  const { socket, peers, status } = useSocket(); // Get peers and connection status from the hook

  const handleWalletConnect = () => {
    setIsWalletConnected(true);
  };

  console.log("Current peers:", peers); // Log the dynamic list of peers

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      flexDirection="column"
      p="6"
      mt="20"
      background="linear-gradient(270deg, #FBB6CE, #9F7AEA, #FBB6CE)"
      backgroundSize="400% 400%"
      animation={`${gradientShift} 20s ease infinite`}
    >
      <Header />
      <MainHeading />
      {isWalletConnected ? (
        <>
          <PeerDisplay peerList={peers} />
          <UploadAFile socket={socket} />
          <FileListing />
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
