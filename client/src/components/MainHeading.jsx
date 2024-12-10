// src/components/MainHeading.js
import React from "react";
import { Heading, Text } from "@chakra-ui/react";

function MainHeading() {
  return (
    <>
      <Heading as="h1" mb="4" size="xl" mt="20">
        Home Page
      </Heading>
      <Text fontSize="lg" mb="10">
        You are connected! Explore the files and network.
      </Text>
    </>
  );
}

export default MainHeading;
