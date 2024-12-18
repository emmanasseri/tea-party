// src/components/MainHeading.js
import React from "react";
import { Heading, Text } from "@chakra-ui/react";

function MainHeading() {
  return (
    <>
      <Heading as="h1" mb="4" size="xl" mt="20">
        Hello!
      </Heading>
      <Text fontSize="lg" mb="10">
        Welcome to Tea Party, a decentralized file sharing system.
      </Text>
    </>
  );
}

export default MainHeading;
