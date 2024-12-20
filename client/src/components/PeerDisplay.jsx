import React from "react";
import { Box, Image, HStack, VStack, Text } from "@chakra-ui/react";

const PeerDisplay = ({ peerList }) => {
  // Function to truncate the wallet address
  const truncateAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  return (
    <Box
      position="relative"
      width="70vw"
      display="flex"
      justifyContent="center"
      alignItems="center"
      p={4}
    >
      <Image src="table.png" alt="Table" />
      <HStack
        position="absolute"
        width="50vw"
        paddingBottom={7}
        justifyContent="space-evenly"
        bottom="50%"
      >
        {peerList.map((peer, index) => (
          <VStack key={index} alignItems="center">
            <Image src="peer.gif" alt="Teacup" maxH={"80px"} />
            <Text fontSize="sm" color="white" fontWeight="bold">
              {truncateAddress(peer.nodeId)}
            </Text>
            <Text fontSize="xs" color="white" fontWeight="bold">
              {peer.address}
            </Text>
          </VStack>
        ))}
      </HStack>
    </Box>
  );
};

export default PeerDisplay;
