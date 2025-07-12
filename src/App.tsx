import React, { useState, useEffect, useRef } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import type { Signer } from 'ethers';
import * as snarkjs from 'snarkjs';
import * as circomlibjs from '@railgun-community/circomlibjs';
import './App.css';

// --- Configuration ---
const CONTRACT_ADDRESS = "0x5A82BA99Db40bd4da085E7E8e43F168Ae1DeDc20"; // Replace with your contract address
const CONTRACT_ABI = [
  { "inputs": [{ "internalType": "string", "name": "_ipfsCID", "type": "string" }, { "internalType": "bytes32", "name": "_zkpCommitmentHash", "type": "bytes32" }], "name": "addDocument", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "uint256", "name": "documentId", "type": "uint256" }, { "indexed": false, "internalType": "string", "name": "ipfsCID", "type": "string" }, { "indexed": false, "internalType": "bytes32", "name": "zkpCommitmentHash", "type": "bytes32" }, { "indexed": true, "internalType": "address", "name": "uploader", "type": "address" }], "name": "DocumentAdded", "type": "event" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "documents", "outputs": [{ "internalType": "string", "name": "ipfsCID", "type": "string" }, { "internalType": "bytes32", "name": "zkpCommitmentHash", "type": "bytes32" }, { "internalType": "address", "name": "uploader", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_documentId", "type": "uint256" }], "name": "getDocumentDetails", "outputs": [{ "internalType": "string", "name": "", "type": "string" }, { "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getTotalDocuments", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "nextDocumentId", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
];
const PUBLIC_SEPOLIA_RPC_URL = "https://rpc.sepolia.org";
const WASM_PATH = './myposeidon.wasm';
const ZKEY_PATH = './circuit_final.zkey';

declare global {
  interface Window { ethereum?: any; }
}

const App: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [generatedZkpCommitmentHash, setGeneratedZkpCommitmentHash] = useState<string>("");
  const [ipfsCidInput, setIpfsCidInput] = useState<string>("");
  const [secretKeyInput, setSecretKeyInput] = useState<string>("MyTopSecretKey123");
  const [retrieveDocumentId, setRetrieveDocumentId] = useState<string>("");
  const [verifySecretKeyInput, setVerifySecretKeyInput] = useState<string>("");
  const [targetCommitmentInput, setTargetCommitmentInput] = useState<string>("");
  const [zkpStatus, setZkpStatus] = useState<string>("");
  const [zkpSpinner, setZkpSpinner] = useState<boolean>(false);
  const [storeStatus, setStoreStatus] = useState<string>("");
  const [newDocumentId, setNewDocumentId] = useState<string>("");
  const [retrievedCid, setRetrievedCid] = useState<string>("");
  const [retrievedZkpCommitment, setRetrievedZkpCommitment] = useState<string>("");
  const [retrievedFileContent, setRetrievedFileContent] = useState<React.ReactNode>(null);
  const [verificationStatus, setVerificationStatus] = useState<string>("");
  const [verificationColor, setVerificationColor] = useState<string>("#333");
  const logRef = useRef<HTMLDivElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const log = (message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [...prevLogs, `${timestamp}: ${message}`]);
  };

  useEffect(() => { logRef.current?.scrollTo(0, logRef.current.scrollHeight); }, [logs]);
  useEffect(() => { connectWallet(); }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      setSelectedFile(event.target.files[0]);
      setUploadStatus(`Selected: ${event.target.files[0].name}`);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return log("Please select a file first.", true);
    setIsUploading(true);
    setUploadStatus(`Uploading "${selectedFile.name}"...`);
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const response = await fetch('http://localhost:4000/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      log(`File uploaded to IPFS. CID: ${data.cid}`);
      setUploadStatus(`Success! CID: ${data.cid}`);
      setIpfsCidInput(data.cid);
    } catch (error: any) {
      log(`File upload failed: ${error.message}`, true);
      setUploadStatus(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) return log("MetaMask not detected!", true);
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);
      setProvider(browserProvider);
      const currentSigner = await browserProvider.getSigner();
      setSigner(currentSigner);
      const network = await browserProvider.getNetwork();
      if (network.name !== 'sepolia') log(`Please switch to Sepolia network.`, true);
      setContract(new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, currentSigner));
      log(`Wallet connected to ${network.name}: ${await currentSigner.getAddress()}`);
    } catch (error: any) {
      log(`Wallet connection error: ${error.message}`, true);
    }
  };

  const generateZKP = async () => {
    if (!secretKeyInput) return log("Please enter a secret key.", true);
    setZkpStatus("Generating...");
    setZkpSpinner(true);
    try {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(secretKeyInput);
      let circuitPreimageInput = 0n;
      for (let i = 0; i < bytes.length; i++) {
        circuitPreimageInput = (circuitPreimageInput << 8n) + BigInt(bytes[i]);
      }
      const input = { "preimage": circuitPreimageInput.toString() };
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM_PATH, ZKEY_PATH);
      const commitmentHash = "0x" + BigInt(publicSignals[0]).toString(16).padStart(64, '0');
      setGeneratedZkpCommitmentHash(commitmentHash);
      setZkpStatus("Generated!");
      log("ZKP generated successfully.");
    } catch (error: any) {
      log(`ZKP generation error: ${error.message}`, true);
      setZkpStatus("Error");
    } finally {
      setZkpSpinner(false);
    }
  };

  const storeCidAndZKPOnBlockchain = async () => {
    if (!contract) return log("Contract not initialized.", true);
    if (!ipfsCidInput) return log("IPFS CID is missing.", true);
    if (!generatedZkpCommitmentHash) return log("ZKP commitment is missing.", true);

    setStoreStatus("Waiting for transaction...");
    try {
      const tx = await contract.addDocument(ipfsCidInput, generatedZkpCommitmentHash);
      log(`Transaction sent: ${tx.hash}`);
      setStoreStatus(`Sent: ${tx.hash.substring(0, 12)}...`);
      await tx.wait();
      setStoreStatus(`Success! Confirmed.`);
      log("Transaction confirmed on blockchain.");
    } catch (error: any) {
      log(`Blockchain store error: ${error.message}`, true);
      setStoreStatus("Error");
    }
  };

  // ... (rest of the functions: retrieve and verify)
  const retrieveContentAndZKPFromBlockchainAndIPFS = async () => {
    let readProvider = provider;
    if (!readProvider) {
      log("Using public RPC for read operation.", true);
      readProvider = new ethers.JsonRpcProvider(PUBLIC_SEPOLIA_RPC_URL);
    }
    const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);
    if (!retrieveDocumentId) return log("Please enter a Document ID.", true);

    setRetrievedCid("Fetching...");
    setRetrievedZkpCommitment("Fetching...");
    try {
      const [ipfsCID, zkpCommitmentHash] = await readOnlyContract.getDocumentDetails(retrieveDocumentId);
      if (!ipfsCID) throw new Error(`Document ID ${retrieveDocumentId} not found.`);
      setRetrievedCid(ipfsCID);
      setRetrievedZkpCommitment(zkpCommitmentHash);
      setTargetCommitmentInput(zkpCommitmentHash);
      log(`Retrieved details for doc ID ${retrieveDocumentId}.`);

      const ipfsGatewayUrl = `https://ipfs.io/ipfs/${ipfsCID}`;
      const response = await fetch(ipfsGatewayUrl);
      if (!response.ok) throw new Error(`IPFS fetch failed: ${response.statusText}`);
      const link = <a href={ipfsGatewayUrl} target="_blank" rel="noopener noreferrer">View on IPFS</a>;
      setRetrievedFileContent(<div>{link}</div>);
    } catch (error: any) {
      log(error.message, true);
      setRetrievedCid("Error");
      setRetrievedZkpCommitment("Error");
    }
  };

  const verifySecretKnowledge = async () => {
    if (!verifySecretKeyInput || !targetCommitmentInput) return log("Missing secret or commitment hash.", true);
    setVerificationStatus("Verifying...");
    try {
      const poseidon = await circomlibjs.buildPoseidon();
      const encoder = new TextEncoder();
      const bytes = encoder.encode(verifySecretKeyInput);
      let circuitPreimageInput = 0n;
      for (let i = 0; i < bytes.length; i++) {
        circuitPreimageInput = (circuitPreimageInput << 8n) + BigInt(bytes[i]);
      }
      const poseidonHash = poseidon.F.toString(poseidon([circuitPreimageInput]));
      const calculatedCommitmentHash = '0x' + BigInt(poseidonHash).toString(16).padStart(64, '0');

      if (calculatedCommitmentHash.toLowerCase() === targetCommitmentInput.toLowerCase()) {
        setVerificationStatus("SUCCESS!");
        setVerificationColor("green");
      } else {
        setVerificationStatus("FAILED!");
        setVerificationColor("red");
      }
    } catch (error: any) {
      setVerificationStatus("Error");
      log(`Verification error: ${error.message}`, true);
    }
  };

  return (
    <div className="container">
      <h1>IPFS + Sepolia + ZKP Demo</h1>
      <p>Full-stack DApp to upload to a local IPFS node, store on-chain, and verify.</p>
      <hr />

      <h2>1. Upload File to Local IPFS Node</h2>
      <div className="upload-section">
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleFileUpload} disabled={isUploading || !selectedFile}>
          {isUploading ? 'Uploading...' : 'Upload to IPFS'}
        </button>
        <p>Status: <span>{uploadStatus}</span></p>
      </div>

      <h2>2. Generated IPFS CID</h2>
      <p>The CID from your uploaded file will appear here automatically.</p>
      <input type="text" placeholder="Upload file to auto-fill..." value={ipfsCidInput} onChange={e => setIpfsCidInput(e.target.value)} />

      <div className="zkp-section">
        <h3>3. Generate Zero-Knowledge Proof (ZKP)</h3>
        <input type="password" placeholder="e.g., 'MyTopSecretKey123'" value={secretKeyInput} onChange={e => setSecretKeyInput(e.target.value)} />
        <button onClick={generateZKP}>Generate ZKP and Commitment</button>
        <p>Status: {zkpStatus} {zkpSpinner && <span className="loading-spinner"></span>}</p>
        <p>Commitment Hash: <span>{generatedZkpCommitmentHash}</span></p>
      </div>

      <h2>4. Store CID & ZKP Commitment on Sepolia</h2>
      <button onClick={storeCidAndZKPOnBlockchain}>Store on Blockchain</button>
      <p>Tx Status: <span>{storeStatus}</span></p>

      <hr />

      <h2>5. Retrieve from Sepolia & IPFS</h2>
      <input type="number" placeholder="Enter Document ID (e.g., 0)" value={retrieveDocumentId} onChange={e => setRetrieveDocumentId(e.target.value)} />
      <button onClick={retrieveContentAndZKPFromBlockchainAndIPFS}>Retrieve Details</button>
      <p>Retrieved CID: <span>{retrievedCid}</span></p>
      <p>Retrieved ZKP Commitment: <span>{retrievedZkpCommitment}</span></p>
      <div id="retrievedFileContent">{retrievedFileContent}</div>

      <div className="zkp-section">
        <h3>6. Verify Knowledge of Secret</h3>
        <input type="password" placeholder="Enter Secret Key to Verify" value={verifySecretKeyInput} onChange={e => setVerifySecretKeyInput(e.target.value)} />
        <input type="text" placeholder="Commitment hash (auto-filled on retrieve)" value={targetCommitmentInput} onChange={e => setTargetCommitmentInput(e.target.value)} />
        <button onClick={verifySecretKnowledge}>Verify Secret</button>
        <p>Status: <span style={{ color: verificationColor }}>{verificationStatus}</span></p>
      </div>

      <hr />
      <h2>Log Output</h2>
      <div id="logOutput" className="info-box" ref={logRef}>
        {logs.map((logMsg, index) => <p key={index}>{logMsg}</p>)}
      </div>
    </div>
  );
};

export default App;