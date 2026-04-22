# Decentralized Compute Marketplace

A full-stack decentralized protocol where users can post computational tasks, workers execute them, and results are delivered securely using smart contracts, cryptography, and token-based incentives without requiring trust in any central authority.

---

## Overview

This project is a decentralized gig and compute marketplace that combines:

- Smart contracts for trust and settlement  
- Worker nodes for execution  
- Cryptography for privacy  
- IPFS for decentralized storage  
- Frontend for user interaction  
- Backend for orchestration  

---

## Key Features

- Trustless job execution using smart contracts  
- Token-based payments, staking, and incentives  
- End-to-end encrypted computation results  
- Off-chain storage using IPFS  
- Validator-based verification system  
- Tokenomics with burn, rewards, and staking  

---

## System Architecture

```
Frontend (React)
      ↓
Backend (FastAPI)
      ↓
Smart Contracts (Solidity)
      ↓
Blockchain (EVM)

Worker Nodes (Python)
      ↓
Encryption Layer
      ↓
IPFS Storage
```

---

## Actors

### Requester
- Posts jobs  
- Pays using tokens  
- Receives encrypted results  

### Worker
- Stakes tokens  
- Executes tasks  
- Submits encrypted output  

### Validator
- Stakes tokens  
- Votes on correctness  
- Earns rewards or gets penalized  

---

## Workflow

```
1. User creates job → tokens locked (escrow)
2. Worker accepts job → stakes tokens
3. Worker executes task
4. Result is encrypted
5. Encrypted data uploaded to IPFS
6. CID stored on blockchain
7. Validators verify result
8. Smart contract releases payment
9. User retrieves and decrypts result
```

---

## Encryption Model

The system uses hybrid encryption:

- AES is used to encrypt result data  
- RSA is used to encrypt the AES key  

```
Worker:
  result → AES encrypt → ciphertext
         → RSA encrypt AES key
         → upload to IPFS

Requester:
  fetch CID → decrypt AES key → decrypt result
```

Only the requester can access the result.

---

## Storage (IPFS)

- Encrypted results are stored on IPFS  
- Blockchain stores only the CID (content identifier)  
- This ensures scalability and immutability  

---

## Tokenomics

The system uses a native ERC-20 token.

### Token Utility
- Payment for jobs  
- Staking for workers  
- Staking for validators  

### Fee Distribution
- Burn reduces supply  
- Validator rewards incentivize correctness  
- Treasury supports protocol sustainability  

---

## Tech Stack

- Blockchain: Solidity, Hardhat  
- Backend: Python, FastAPI, web3.py  
- Worker Nodes: Python  
- Storage: IPFS (via Pinata)  
- Frontend: React, TypeScript, ethers.js  
- Cryptography: RSA and AES  

---

## Project Structure

```
project-root/
│
├── contracts/         # Smart contracts
├── backend/           # FastAPI server
├── worker/            # Worker node
├── crypto/            # Encryption logic
├── frontend/          # React app
├── docs/              # Architecture and design
```

---

## Setup Instructions

### 1. Start Blockchain

```
cd contracts
npx hardhat node
```

---

### 2. Deploy Contracts

```
npx hardhat run script/deploy.ts --network localhost
```

---

### 3. Run Backend

```
cd backend
uvicorn app.main:app --reload
```

---

### 4. Run Worker

```
cd worker
python worker.py
```

---

### 5. Run Frontend

```
cd frontend
npm install
npm run dev
```

---

## MVP Limitations

- Basic validator logic  
- No time-based dispute windows  
- Simplified pricing mechanism  
- Backend still handles orchestration  

---

## Future Improvements

- DAO-based governance  
- On-chain validator selection  
- Zero-knowledge proof verification  
- Client-side encryption and decryption  
- Multi-worker execution  
- Advanced tokenomics  

---

## Why This Matters

This system removes the need to trust:

- centralized platforms  
- workers  
- intermediaries  

By combining smart contracts, cryptography, and economic incentives, it enables a trustless compute economy.

---

## Summary

A decentralized protocol where work is executed by distributed nodes, verified economically, stored on IPFS, and encrypted so only the requester can access the result.

---

## License

MIT License