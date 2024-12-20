# Decentralized P2P File Sharing System

A decentralized peer-to-peer (P2P) file sharing application utilizing a gossip protocol and blockchain wallet authentication. Built with Socket.IO, this system enables real-time file sharing and sets the foundation for rewarding peers through tipping mechanisms.

![UI](https://github.com/emmanasseri/tea-party/blob/72b90e53cd8890167b11eff7b6eb90b607c9b229/splash-image.png)

## Features

- **Decentralized Network:** Each node acts as both server and client, promoting a resilient and scalable architecture.
- **Gossip Protocol:** Efficiently disseminates peer information across the network.
- **Blockchain Wallet Authentication:** Users connect via blockchain wallets (MetaMask, Coinbase, OKX) using RainbowKit.
- **Real-Time UI:** Visual indicators for active peers and seamless file upload/download functionality.
- **Future-Ready:** Designed to support peer tipping and rewards for network contributions.

## Technologies Used

- **Socket.IO:** Real-time, bidirectional communication over TCP (WebSockets and HTTP Long Polling).
- **Gossip Protocol:** For peer discovery and information sharing.
- **Blockchain Integration:** RainbowKit for wallet connections (MetaMask, Coinbase, OKX).
- **Frontend:** Browser-based UI displaying network activity and managing file operations.

## Setup & Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/emmanasseri/tea-party.git
   cd tea-party
   ```

2. **Install Dependencies:**
   ```bash
   yarn install
   ```

3. **Run Peers Locally:**
   - **Green Peer (Port 8085):**
     ```bash
     node server/src/network/server.js 8085
     ```
   - **Blue Peer (Port 8083, connects to Green Peer):**
     ```bash
     node server/src/network/server.js 8083 8085
     ```
   - **Red Peer (Port 8081, connects to Green Peer):**
     ```bash
     node server/src/network/server.js 8081 8085
     ```

4. **Access the UI:**
   While the UI should open automatically, you can also manually navigate to `http://localhost:PORT` (replace `PORT` with 8085, 8083, or 8081).

## Usage

- **Connect Wallet:** Use RainbowKit to connect any blockchain wallet.
- **View Peers:** Active peers are displayed as teacup icons with their node ID and network address.
- **Upload Files:** Add files to the network; they are announced to all peers and searchable in the UI.
- **Download Files:** Request and retrieve files from connected peers through the UI.


## Protocols

- **Primary:** WebSockets over TCP for reliable, real-time communication.
- **Fallback:** HTTP Long Polling over TCP for environments where WebSockets are unavailable.

## Future Work

- **Enhanced Decentralization:** Improve peer discovery to reduce dependencies on initial nodes.
- **Reward System:** Develop tipping features to incentivize peer contributions.
- **Scalability:** Expand testing to larger networks for performance assessment.
- **Security:** Implement advanced measures to safeguard data integrity and user privacy.
