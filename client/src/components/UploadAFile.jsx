import React, { useCallback } from "react";
import { Box, Button } from "@chakra-ui/react";
import { useDropzone } from "react-dropzone";

function UploadAFile({ socket }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      console.log("Files dropped:", acceptedFiles);
      const file = acceptedFiles[0]; // Since `multiple: false`, only one file is handled

      // Prepare file metadata to send over WebSocket
      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      };

      // Send file metadata to the server via WebSocket
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "announceFile", file: fileData }));
      }
    },
    [socket] // Include socket in the dependency array
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
      <Button colorScheme="teal" size="md" onClick={open}>
        Upload a File
      </Button>
    </Box>
  );
}

export default UploadAFile;
