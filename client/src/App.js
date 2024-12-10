import React, { useState } from "react";
import { Box, Button, Heading, Text } from "@chakra-ui/react";

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
  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-r, blue.400, pink.400)"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      color="white"
    >
      <Heading as="h1" mb="4" size="xl">
        Home Page
      </Heading>
      <Text fontSize="lg">
        You are connected! Explore the files and network.
      </Text>
    </Box>
  );
}

export default App;
