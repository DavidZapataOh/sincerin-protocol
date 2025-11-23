# 🔒 Sincerin Protocol

<div align="center">

**Private Token Transfers on Stellar**

[![Stellar](https://img.shields.io/badge/Stellar-Testnet-orange)](https://www.stellar.org/)
[![Soroban](https://img.shields.io/badge/Soroban-Smart%20Contracts-blue)](https://soroban.stellar.org/)
[![License](https://img.shields.io/badge/License-ISC-green)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Alpha-yellow)](https://github.com/DavidZapataOh/sincerin-protocol)

_Zero-knowledge privacy for Stellar token transfers_

[Website](#) • [Documentation](#) • [Contract](#) • [Twitter](https://x.com/sincerinprotocol)

</div>

---

## 📖 Overview

**Sincerin Protocol** is a privacy layer for the Stellar network that enables private, untraceable token transfers using Soroban smart contracts and multi-layer encryption. Businesses can now transfer tokens without exposing financial activity while maintaining full on-chain auditability.

### The Problem

Public blockchains expose all transactions—anyone can see balances, payment recipients, and transaction history. For enterprises handling sensitive financial operations, this transparency creates:

- **Security Risks**: Exposed financial data vulnerable to attacks
- **Competitive Disadvantages**: Competitors can analyze transaction patterns
- **Compliance Challenges**: Privacy regulations require data protection

### Our Solution

Sincerin Protocol brings **zero-knowledge privacy** to Stellar through:

- **Encrypted User Indices**: Break the direct link between addresses and balances
- **Encrypted Balances**: All amounts encrypted with AES-256-GCM
- **Dual-Encrypted Keys**: Separate encryption for user and server access
- **On-Chain Storage**: All encrypted data stored on-chain for transparency

---

## ✨ Features

### 🔐 Privacy Layers

- **Encrypted User Index**: User addresses mapped to encrypted indices, breaking address-balance linkage
- **Encrypted Balance**: Actual balances encrypted with random symmetric keys (AES-256-GCM)
- **Dual-Encrypted Keys**: Symmetric keys encrypted separately for both user and server
- **Zero-Knowledge Architecture**: Cryptographic privacy without compromising auditability

### 💼 Core Functionality

- **Convert to Private**: Transform public tokens (USDC) into encrypted private tokens
- **Private Transfers**: Send tokens privately without exposing transaction details
- **Real-Time Balance**: View encrypted private balances with automatic decryption
- **Multi-Wallet Support**: Compatible with Albedo, Freighter, Lobstr, xBull, Rabet, Hana, and Klever

### 🏗️ Architecture

- **Frontend**: Modern Next.js application with real-time balance updates
- **Smart Contracts**: Soroban contracts handling encryption logic and storage
- **Backend**: Event-driven server processing deposits and encrypting balances
- **On-Chain Storage**: All encrypted data stored on Stellar blockchain

---

## 🏗️ Architecture

### System Components

```
┌─────────────────┐
│   Frontend      │  Next.js + React + Stellar Wallets Kit
│   (Next.js)     │  Real-time balance fetching & decryption
└────────┬────────┘
         │
         │ Wallet Connection
         │ Transaction Signing
         ▼
┌─────────────────┐
│  Soroban        │  Encrypted Token Contract
│  Smart Contract │  - request_deposit()
│                 │  - store_deposit()
│                 │  - get_encrypted_balance()
└────────┬────────┘
         │
         │ Events
         ▼
┌─────────────────┐
│   Backend       │  Node.js + Express
│   Event Listener│  - AES-256-GCM encryption
│                 │  - Balance processing
│                 │  - On-chain storage
└─────────────────┘
```

### Data Flow

1. **User Initiates Convert**

   - Frontend transfers USDC to encrypted token contract
   - Calls `request_deposit()` with encrypted user index
   - Contract emits `deposit_requested` event

2. **Backend Processing**

   - Event listener detects deposit request
   - Generates/retrieves symmetric key for user
   - Encrypts balance with AES-256-GCM
   - Encrypts keys for user and server separately

3. **On-Chain Storage**

   - Backend calls `store_deposit()` on contract
   - Contract stores encrypted data on-chain
   - Emits `balance_stored` event

4. **Balance Retrieval**
   - Frontend fetches encrypted balance from contract
   - Decrypts using user's address-derived key
   - Displays private balance in UI

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Rust and Stellar CLI (for contract deployment)
- Stellar Testnet account with XLM

### Installation

```bash
# Clone the repository
git clone https://github.com/DavidZapataOh/sincerin-protocol.git
cd sincerin-protocol

# Install frontend dependencies
cd front
pnpm install

# Install backend dependencies
cd ../back
pnpm install
```

### Frontend Setup

```bash
cd front

# Create .env.local (optional, uses defaults)
# STELLAR_NETWORK=TESTNET
# SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# Run development server
pnpm dev
```

Visit `http://localhost:3000` to access the application.

### Backend Setup

```bash
cd back

# Create .env file
cat > .env << EOF
CONTRACT_ID=CC72T3L7KMCVJ2FSW4XIZCQFRNXCVLQGVR7AYMMMFWRQHHEWOFV4TDNS
SOURCE_SECRET_KEY=your_server_secret_key
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
POLL_INTERVAL_MS=5000
EOF

# Start event listener
pnpm dev:encrypted
```

### Smart Contract Deployment

See [contracts/encrypted-token/README.md](contracts/encrypted-token/README.md) for detailed deployment instructions.

```bash
cd contracts/encrypted-token

# Build contract
stellar contract build

# Deploy to testnet
./deploy.sh

# Initialize contract
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account default \
  --network testnet \
  -- initialize \
  --server_manager <SERVER_MANAGER_ADDRESS> \
  --token_contract CABTCWWBVH4LFOFDZJXYMUC5H4MGV3IS2UI6R5PVBTPLDFK7PV7JPJR2
```

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS v4
- **Wallet Integration**: Stellar Wallets Kit
- **Blockchain**: Stellar SDK v14.3.3
- **Encryption**: crypto-js
- **Animations**: framer-motion

### Backend

- **Runtime**: Node.js
- **Framework**: Express
- **Language**: TypeScript
- **Blockchain**: Stellar SDK v14.3.3
- **Encryption**: Node.js crypto (AES-256-GCM)

### Smart Contracts

- **Platform**: Soroban
- **Language**: Rust
- **SDK**: soroban-sdk v22.0.1
- **Network**: Stellar Testnet

---

## 📋 Contract Details

### Deployed Contract

- **Contract ID**: `CC72T3L7KMCVJ2FSW4XIZCQFRNXCVLQGVR7AYMMMFWRQHHEWOFV4TDNS`
- **Network**: Stellar Testnet
- **Explorer**: [View on Stellar Expert](https://testnet.stellar.expert/contract/CC72T3L7KMCVJ2FSW4XIZCQFRNXCVLQGVR7AYMMMFWRQHHEWOFV4TDNS)

### Supported Tokens

- **USDC**: `CABTCWWBVH4LFOFDZJXYMUC5H4MGV3IS2UI6R5PVBTPLDFK7PV7JPJR2` (Testnet)

### Contract Functions

#### User Functions

- `authenticate_user(user: Address, encrypted_index: Bytes)` - Authenticate user with encrypted index
- `request_deposit(user: Address, amount: i128, encrypted_index: Bytes)` - Request deposit and convert to private

#### Server Functions

- `store_deposit(...)` - Store encrypted balance data (server-only)

#### View Functions

- `get_user_index_by_address(user_address: Address) -> Bytes` - Get user's encrypted index
- `get_encrypted_balance(user_index: BytesN<32>) -> EncryptedBalance` - Get encrypted balance
- `encrypted_supply() -> i128` - Get total encrypted supply
- `get_server_manager() -> Address` - Get server manager address
- `get_token_contract() -> Address` - Get token contract address

---

## 🔒 Security

### Encryption Standards

- **Balance Encryption**: AES-256-GCM
- **Key Encryption**: AES-256-CBC (hash-based, deterministic)
- **User Index**: SHA-256 hash of signed message, encrypted for server

### Privacy Guarantees

- ✅ Address-balance linkage broken via encrypted indices
- ✅ All balances encrypted on-chain
- ✅ Keys encrypted separately for user and server
- ✅ No plaintext financial data stored on-chain

### Security Considerations

⚠️ **Current Implementation**: This is an alpha/testnet version for demonstration purposes.

**For Production:**

- Replace hash-based encryption with proper ECIES
- Use hardware security modules (HSM) for server keys
- Implement key rotation mechanisms
- Add rate limiting and access controls
- Conduct comprehensive security audits
- Consider Stellar's native multisig for server key management

---

## 📊 Project Structure

```
sincerin-protocol/
├── front/                    # Next.js frontend application
│   ├── app/                  # App Router pages
│   │   ├── page.tsx         # Landing page
│   │   └── app/             # Application pages
│   │       └── page.tsx     # Main app (Convert/Transfer)
│   ├── components/          # React components
│   ├── lib/                  # Utilities
│   │   ├── stellar.ts       # Stellar SDK integration
│   │   └── stellarWalletsKit.ts
│   └── hooks/               # React hooks
│
├── back/                     # Node.js backend
│   └── src/
│       ├── index-encrypted.ts    # Main server entry
│       ├── services/
│       │   ├── EncryptionService.ts
│       │   ├── EventListener.ts
│       │   └── StellarEncryptedTokenService.ts
│       └── utils/
│
└── contracts/                # Soroban smart contracts
    └── encrypted-token/
        ├── src/
        │   └── lib.rs       # Main contract
        └── deploy.sh        # Deployment script
```

---

## 🧪 Testing

### Frontend

```bash
cd front
pnpm dev
```

### Backend

```bash
cd back
pnpm dev:encrypted
```

### Smart Contract

```bash
cd contracts/encrypted-token
cargo test
```

---

## 📈 Roadmap

### ✅ Completed (Alpha)

- [x] Soroban smart contract deployment
- [x] Frontend wallet integration
- [x] Convert functionality (Public → Private)
- [x] Encrypted balance storage on-chain
- [x] Real-time balance fetching and decryption
- [x] Backend event listener
- [x] Multi-wallet support

### 🚧 In Progress

- [ ] Withdrawal mechanism (Private → Public)
- [ ] Full zero-knowledge proof integration
- [ ] Multi-token support
- [ ] Production security hardening

### 🔮 Future

- [ ] Mainnet deployment
- [ ] Additional token support
- [ ] Advanced privacy features
- [ ] Governance mechanism

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License.

---

## 👥 Team

**Sincerines**

- **David Zapata** – Smart Contract & ZK Developer
- **Alejandro Soto** – Fullstack Developer
- **Tomas del Manzo** – Fullstack Developer
- **Lautaro Suarez** – Business Development

---

## 🔗 Links

- **GitHub**: [github.com/DavidZapataOh/sincerin-protocol](https://github.com/DavidZapataOh/sincerin-protocol)
- **Twitter**: [@sincerinprotocol](https://x.com/sincerinprotocol)
- **Contract**: [Stellar Expert](https://testnet.stellar.expert/contract/CAOT53NBANPMUDQ7G43MYFZ3MATHO5IY73KGJZWWIBNFWVF5OFHV7UFH)
- **WebPage**: [Web](https://sincerin-protocol.vercel.app)

---

## ⚠️ Disclaimer

This software is provided "as is" without warranty of any kind. This is an alpha version deployed on Stellar Testnet for demonstration purposes. Do not use with real funds on mainnet until a security audit has been completed.

---

<div align="center">

**Built with ❤️ for the Stellar ecosystem**

[Stellar](https://www.stellar.org/) • [Soroban](https://soroban.stellar.org/) • [Stellar Wallets Kit](https://github.com/creit-tech/stellar-wallets-kit)

</div>
