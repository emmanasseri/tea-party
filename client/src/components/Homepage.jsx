import React, { useState, useEffect } from "react";
import { Box, Heading, Text, keyframes } from "@chakra-ui/react";
import Header from "./Header";
import MainHeading from "./MainHeading";
import UploadAFile from "./UploadAFile";
import FileListing from "./FileListing";
import PeerDisplay from "./PeerDisplay";

function HomePage() {
  const [socket, setSocket] = useState(null);
  //const [peerList, setPeerList] = useState([]);
  useEffect(() => {
    // Dynamically determine the WebSocket server port if deployed, defaults to 8080 for local development
    const port = window.location.port || 8080;
    const client = new WebSocket(`ws://localhost:${port}`);
    setSocket(client);

    return () => client.close();
  }, []);
  const peerList = [
    "peer1",
    "peer2",
    "peer3",
    "peer4",
    "peer5",
    "peer6",
    "peer7",
    "peer8",
    "peer9",
    "peer10",
  ];
  return (
    <Box
      minH="100vh"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      p="6"
      mt="20"
    >
      <Header />
      <MainHeading />
      <PeerDisplay peerList={peerList} />
      <UploadAFile socket={socket} />
      <FileListing />
    </Box>
  );
}

export default HomePage;
