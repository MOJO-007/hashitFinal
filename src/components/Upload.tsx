import React, { useState } from 'react';
import * as snarkjs from 'snarkjs';
import { ViewProps } from '../types';
import { encryptFile } from '../utils/crypto';

const WASM_PATH = './myposeidon.wasm';
const ZKEY_PATH = './circuit_final.zkey';

const Upload: React.FC<ViewProps> = ({ contract, log, setView }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cid, setCid] = useState("");
    const [password, setPassword] = useState("");
    const [isEncrypted, setIsEncrypted] = useState(false);
    const [zkpHash, setZkpHash] = useState("");
    const [storeStatus, setStoreStatus] = useState("Waiting for details...");

    const processAndUpload = async () => {
        if (!file) return log("Please select a file.", true);
        if (isEncrypted && !password) return log("Password is required for encryption.", true);
        setIsProcessing(true);
        log(isEncrypted ? "Encrypting file..." : "Processing file...");
        try {
            const fileToUpload = isEncrypted ? await encryptFile(file, password) : file;
            log("Uploading to IPFS...");
            const formData = new FormData();
            formData.append('file', fileToUpload, file.name);
            const response = await fetch('http://localhost:4000/upload', { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setCid(data.cid);
            log(`✅ IPFS Upload Success. CID: ${data.cid}`);
        } catch (e: any) { log(`Error: ${e.message}`, true); } finally { setIsProcessing(false); }
    };

    const generateZKP = async () => {
        if (!password) return log("Password is required to generate ZKP.", true);
        setIsProcessing(true);
        log("Generating ZKP commitment...");
        try {
            const input = { preimage: BigInt(new TextEncoder().encode(password).reduce((a, b) => (a << 8n) + BigInt(b), 0n)).toString() };
            const { publicSignals } = await snarkjs.groth16.fullProve(input, WASM_PATH, ZKEY_PATH);
            const hash = '0x' + BigInt(publicSignals[0]).toString(16).padStart(64, '0');
            setZkpHash(hash);
            log(`✅ ZKP Hash Generated: ${hash}`);
        } catch (e: any) { log(`ZKP Error: ${e.message}`, true); } finally { setIsProcessing(false); }
    };

    const storeOnChain = async () => {
        if (!cid || !zkpHash || !contract) return log("CID and ZKP Hash are required.", true);
        setIsProcessing(true);
        setStoreStatus("Sending transaction to wallet...");
        try {
            const tx = await contract.addDocument(cid, zkpHash, isEncrypted);
            setStoreStatus("Waiting for confirmation...");
            await tx.wait();
            setStoreStatus("✅ Success! Document registered on-chain.");
            log("Transaction confirmed on blockchain.");
        } catch (e: any) { log(`Blockchain Error: ${e.message}`, true); setStoreStatus("Transaction failed.") } finally { setIsProcessing(false); }
    };

    return (
        <div className="view-container">
            <button onClick={() => setView('home')} className="back-button">← Back to Dashboard</button>
            <h2>Upload a Document</h2>
            <h3>1. Select File & Set Password</h3>
            <input type="file" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
            <div className="checkbox-container">
                <input type="checkbox" id="encryptUpload" checked={isEncrypted} onChange={(e) => setIsEncrypted(e.target.checked)} />
                <label htmlFor="encryptUpload">Encrypt this file before uploading</label>
            </div>
            <input type="password" placeholder="Password (for Encryption and/or ZKP)" value={password} onChange={(e) => setPassword(e.target.value)} />
            <h3>2. Process File</h3>
            <button onClick={processAndUpload} disabled={!file || isProcessing}>1. Upload to IPFS</button>
            <button onClick={generateZKP} disabled={!password || isProcessing}>2. Generate ZKP Hash</button>
            <p>IPFS CID: <span>{cid || "N/A"}</span></p>
            <p>ZKP Hash: <span>{zkpHash || "N/A"}</span></p>
            <h3>3. Store on Blockchain</h3>
            <button onClick={storeOnChain} disabled={!cid || !zkpHash || isProcessing}>Store on Blockchain</button>
            <p>Status: <span>{storeStatus}</span></p>
        </div>
    );
};
export default Upload;