import React, { useState, useEffect } from "react";
import { Box, Button, Heading, Text } from "@chakra-ui/react";
import HomePage from "./components/Homepage";

function App() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  const handleWalletConnect = () => {
    setIsWalletConnected(true);
  };

  if (!isWalletConnected) {
    // Render the "Connect Wallet" button centered on the screen
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Button colorScheme="teal" size="lg" onClick={handleWalletConnect}>
          Connect Wallet
        </Button>
      </Box>
    );
  }

  // If the wallet is connected, render the homepage with a gradient background
  return <HomePage />;
}

export default App;
