import React from "react";
import { Box, Image, HStack } from "@chakra-ui/react";

const PeerDisplay = ({ peerList }) => {
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
        {peerList.map((teacup, index) => (
          <Image key={index} src="peer.gif" alt="Teacup" maxH={"80px"} />
        ))}
      </HStack>
    </Box>
  );
};

export default PeerDisplay;
