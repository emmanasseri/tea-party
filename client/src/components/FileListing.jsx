import React, { useState, useEffect } from "react";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Box,
  Input,
} from "@chakra-ui/react";
import useSocket from "../services/websocketService";

function FileListing({ fileList }) {
  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { socket } = useSocket();

  // Update local state whenever fileList prop changes
  useEffect(() => {
    console.log("FileListing received updated fileList:", fileList);
    setFiles(fileList);
  }, [fileList]);

  const downloadFile = (fileName, ownerId) => {
    console.log(`Attempting to download: ${fileName} from owner: ${ownerId}`);
    socket.emit("download-request-from-ui", { fileName, ownerId });
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredFiles = files.filter(
    (file) =>
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (file.size &&
        file.size.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (file.owner &&
        file.owner.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Box width="80%" margin="auto" marginTop="20px">
      <Input
        placeholder="Search files..."
        value={searchTerm}
        onChange={handleSearchChange}
        marginBottom="10px"
        borderColor="blue.600"
        borderWidth="2px"
        _focus={{ borderColor: "blue.300" }}
      />
      <Button
        colorScheme="blue"
        onClick={() => console.log("Refresh Files button clicked")}
        marginBottom="10px"
      >
        Refresh Files
      </Button>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th color="blue.800">File Name</Th>
            <Th color="blue.800">Size</Th>
            <Th color="blue.800">Ownership</Th>
            <Th color="blue.800">Download</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredFiles.map((file, index) => (
            <Tr key={file.id || index}>
              <Td>{file.name}</Td>
              <Td>{file.size || "N/A"}</Td>
              <Td>{file.owner || "Unknown"}</Td>
              <Td>
                <Button
                  colorScheme="blue"
                  size="sm"
                  onClick={() => downloadFile(file.name, file.owner)}
                >
                  Download
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

export default FileListing;
