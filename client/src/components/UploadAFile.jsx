import React, { useCallback } from "react";
import { Box, Button } from "@chakra-ui/react";
import { useDropzone } from "react-dropzone";

function UploadAFile({ socket }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      console.log("Files dropped:", acceptedFiles);
      const file = acceptedFiles[0];

      const fileData = {
        name: file.name,
        size: file.size,
        owner: "Owner Name", // Example owner
      };

      console.log("Attempting to send file data:", fileData);
      console.log(
        "Socket connected status:",
        socket ? socket.connected : "No socket instance"
      );

      if (socket && socket.connected) {
        socket.emit("new-personal-file-upload", fileData);
        console.log("File data sent to the server.");
      } else {
        console.log("Socket is not connected.");
      }
    },
    [socket]
  );

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
    multiple: false,
  });

  return (
    <Box
      {...getRootProps()}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      p="6"
      mt="20"
    >
      <input {...getInputProps()} />
      <Button colorScheme="blue" size="md" onClick={open}>
        Upload a File
      </Button>
    </Box>
  );
}

export default UploadAFile;
