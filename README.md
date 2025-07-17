# 🔐 HashIt: Decentralized Document Security Platform

**HashIt** is a decentralized application (DApp) that demonstrates how to securely store, manage, **notarize**, and verify documents using a powerful combination of **IPFS**, **Zero-Knowledge Proofs (ZKPs)**, and the **Ethereum blockchain**. It provides a **privacy-first**, **verifiable**, and **tamper-resistant** solution for document management.

> ⚠️ All blockchain transactions are done on the **Ethereum Sepolia testnet** for demonstration purposes.

---

## 🌟 Key Features

- 🔒 **End-to-End Encrypted**: Files are encrypted on the client-side before upload using a user-provided password.
- 🛡️ **Zero-Knowledge Proofs**: Generate a cryptographic proof of ownership using a secret key—proving ownership without revealing the key.
- 🧾 **Decentralized Notarization**: Each document uploaded is cryptographically anchored to the blockchain, acting as an **irrefutable timestamped notarization**.
- 🌐 **Decentralized Storage**: Documents are uploaded to **IPFS**, a peer-to-peer storage network that ensures censorship resistance and high availability.
- ⛓️ **Blockchain Anchoring**: Records including the IPFS CID, ZKP commitment hash, and original file hash are stored immutably on the **Ethereum blockchain**.
- ✅ **On-Chain Verification**: Prevents duplicate uploads and allows anyone to verify a document’s authenticity using on-chain data.
- 💼 **Personal Document Vault**: Users can view and manage all their uploaded documents via their connected wallet address.

---

## 🧾 About Notarization

**HashIt provides a decentralized alternative to traditional notarization.**

- Each document registered is uniquely identified via a SHA-256 hash.
- The blockchain entry acts as a **public, immutable timestamped record**, proving the document existed at a specific time.
- No central authority is required—**the Ethereum network serves as a decentralized notary**.
- Combined with ZKP-based proof of ownership, this allows for legally sound, tamper-evident certification of documents such as:
  - Agreements
  - Certificates
  - Research papers
  - Designs or IP claims

By anchoring document hashes to a smart contract, **HashIt transforms notarization into a self-sovereign, transparent, and censorship-resistant process**.

---

## 🛠️ How It Works

### 📤 Upload Process

1. **File Hashing**  
   - Calculates the SHA-256 hash of the original (unencrypted) file.

2. **Duplicate Check**  
   - Queries the smart contract to check for existing entries with the same hash to avoid redundant uploads.

3. **Client-Side Encryption (Optional)**  
   - Users may encrypt the file using a password before uploading.

4. **IPFS Upload**  
   - Uploads the (encrypted or plain) file to IPFS and gets a **CID (Content Identifier)**.

5. **ZKP Generation**  
   - A "Secret Key" is provided by the user.
   - The original file hash and secret key are used to generate a **ZKP commitment hash** using a SNARK circuit (groth16).

6. **Blockchain Transaction**  
   - Stores the following data on the `DocumentZKPStorage` smart contract:
     - IPFS CID
     - ZKP Commitment Hash
     - Original File Hash
     - Encryption Status  
   - Requires a small gas fee on the Sepolia testnet.

---

### ✅ Verification Process

1. **Provide Proofs**  
   - User provides the original file and the same "Secret Key" used during upload.

2. **Local Re-computation**  
   - Recomputes:
     - File SHA-256 hash
     - ZKP commitment hash using file hash + secret key

3. **On-Chain Comparison**  
   - Fetches the stored record for the file hash from the blockchain.
   - Compares the stored ZKP hash with the recomputed one.

4. **Successful Verification**  
   - If hashes match, the user is confirmed as the legitimate owner of the document.

---

## 📚 Tech Stack

- **Frontend**: React, TypeScript, Web3.js/Ethers.js
- **ZKP**: SnarkJS, Groth16, Circom (for generating/verifying ZKPs)
- **Smart Contract**: Solidity deployed on Ethereum Sepolia
- **Storage**: IPFS (via Web3.Storage, NFT.Storage, or local IPFS node)
- **Encryption**: Web Crypto API

---

## ⚙️ Smart Contract Functions

- `addDocument(fileHash, zkCommitment, cid, isEncrypted)`  
  Adds document metadata and proof on-chain.

- `getDocumentDetails(fileHash)`  
  Retrieves stored document details.

- `documentExists(fileHash)`  
  Returns true if a document with the given file hash exists.

---

## 🧪 Testnet

- Network: **Ethereum Sepolia**
- Faucet: [https://sepoliafaucet.com](https://sepoliafaucet.com)
- Block Explorer: [https://sepolia.etherscan.io](https://sepolia.etherscan.io)

---


## 👩‍💻 Author

Created with ❤️ by **Silicon Valley Rejects**