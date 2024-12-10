// src/components/Header.js
import { Box, Image } from "@chakra-ui/react";
import React from "react";

function Header() {
  return (
    <Box alignItems="center" my={2}>
      <Image
        src="/tea_party.png"
        alt="Tea Party Logo"
        maxW="600px"
        objectFit="contain"
      />
    </Box>
  );
}

export default Header;
