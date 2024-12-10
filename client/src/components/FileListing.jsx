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

function FileListing() {
  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    // Simulate fetching data from peers
    const fetchedFiles = [
      { id: 1, name: "example.pdf", size: "1MB", owner: "Peer1" },
      { id: 2, name: "sample.txt", size: "200KB", owner: "Peer2" },
      { id: 3, name: "test.jpg", size: "500KB", owner: "Peer3" },
    ];
    setFiles(fetchedFiles);
  };

  const downloadFile = (fileName) => {
    console.log(`Downloading ${fileName}`);
    // Add download logic here
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredFiles = files.filter(
    (file) =>
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.size.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.owner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box width="80%" margin="auto" marginTop="20px">
      <Input
        placeholder="Search files..."
        value={searchTerm}
        onChange={handleSearchChange}
        marginBottom="10px"
        borderColor="blue.600" // Set the border color to a darker blue
        borderWidth="2px" // Make the border thicker
        _focus={{
          // Customizes the border color on focus
          borderColor: "blue.300",
        }}
      />
      <Button colorScheme="blue" onClick={fetchFiles} marginBottom="10px">
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
          {filteredFiles.map((file) => (
            <Tr key={file.id}>
              <Td>{file.name}</Td>
              <Td>{file.size}</Td>
              <Td>{file.owner}</Td>
              <Td>
                <Button
                  colorScheme="blue"
                  size="sm"
                  onClick={() => downloadFile(file.name)}
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
