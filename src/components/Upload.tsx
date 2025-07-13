// src/components/Upload.tsx

import React, { useState } from 'react';
import * as snarkjs from "snarkjs";
import type { ViewProps } from '../types';
import { encryptFile, sha256 } from '../utils/crypto';

// These paths assume the wasm/zkey files are in your `public` directory
const WASM_PATH = './myposeidon.wasm';
const ZKEY_PATH = './circuit_final.zkey';

const Upload: React.FC<ViewProps> = ({ contract, log, setView }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cid, setCid] = useState("");
    const [password, setPassword] = useState("");
    const [isEncrypted, setIsEncrypted] = useState(false);
    const [zkpHash, setZkpHash] = useState("");
    const [originalFileHash, setOriginalFileHash] = useState("");

    const handleProcessAndUpload = async () => {
        if (!file) return log("Please select a file.", true);
        if (isEncrypted && !password) return log("Password is required for encryption.", true);

        setIsProcessing(true);
        log("Processing file...");
        try {
            log("1. Calculating SHA-256 hash of the original file...");
            const originalHash = await sha256(file);
            setOriginalFileHash(originalHash);
            log(`✅ Original File Hash: ${originalHash}`);

            const fileToUpload = isEncrypted ? await encryptFile(file, password) : file;
            if (isEncrypted) log("2. File encrypted successfully.");

            log("3. Uploading file to IPFS...");
            const formData = new FormData();
            formData.append('file', fileToUpload, file.name);
            const response = await fetch('http://localhost:4000/upload', { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setCid(data.cid);
            log(`✅ IPFS Upload Success. CID: ${data.cid}`);

        } catch (e: any) { log(`Error: ${e.message}`, true); }
        finally { setIsProcessing(false); }
    };

    // --- THIS IS THE CORRECTED FUNCTION ---
    const generateZKP = async () => {
        if (!password) {
            return log("Password is required to generate ZKP.", true);
        }

        setIsProcessing(true);
        log("Generating ZKP commitment...");
        try {
            // Step 1: Convert the password string to a hex representation.
            const encoder = new TextEncoder();
            const passBytes = encoder.encode(password);
            let hexString = '0x';
            passBytes.forEach((byte) => {
                hexString += byte.toString(16).padStart(2, '0');
            });

            // Step 2: Convert the hex string to a BigInt. This is the circuit input.
            const preimage = BigInt(hexString);

            // The input object for snarkjs must match the signal name in your .circom file
            const input = {
                preimage: preimage
            };

            // Step 3: Generate the proof and get the public signals.
            const { publicSignals } = await snarkjs.groth16.fullProve(input, WASM_PATH, ZKEY_PATH);

            // The public signal (the Poseidon hash) is the ZKP commitment.
            const commitmentHash = '0x' + BigInt(publicSignals[0]).toString(16).padStart(64, '0');

            setZkpHash(commitmentHash);
            log(`✅ ZKP Hash Generated: ${commitmentHash}`);

        } catch (error: any) {
            console.error("ZKP Generation Error:", error);
            log(`ZKP generation failed: ${error.message}`, true);
        } finally {
            setIsProcessing(false);
        }
    };

    const storeOnChain = async () => {
        if (!cid || !zkpHash || !originalFileHash || !contract) return log("CID, ZKP Hash, and Original File Hash are required.", true);
        setIsProcessing(true);
        log("Sending transaction to wallet...");
        try {
            const tx = await contract.addDocument(cid, zkpHash, isEncrypted, originalFileHash);
            await tx.wait();
            log("✅ Success! Document registered on-chain.");
        } catch (e: any) { log(`Blockchain Error: ${e.message}`, true); }
        finally { setIsProcessing(false); }
    };

    return (
        <div className="view-container">
            <button onClick={() => setView('home')} className="back-button">← Back to Dashboard</button>
            <h2>Upload Document</h2>

            <h3>1. Select File & Password</h3>
            <input type="file" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
            <div className="checkbox-container">
                <input type="checkbox" id="encrypt" checked={isEncrypted} onChange={e => setIsEncrypted(e.target.checked)} />
                <label htmlFor="encrypt">Encrypt file before uploading</label>
            </div>
            <input type="password" placeholder="Password (for Encryption and/or ZKP)" value={password} onChange={e => setPassword(e.target.value)} />

            <h3>2. Process File & Generate ZKP</h3>
            <button onClick={handleProcessAndUpload} disabled={!file || isProcessing}>1. Hash & Upload to IPFS</button>
            <button onClick={generateZKP} disabled={!password || isProcessing}>2. Generate ZKP Hash</button>
            <p>Original File Hash: <span>{originalFileHash || 'N/A'}</span></p>
            <p>Stored IPFS CID: <span>{cid || 'N/A'}</span></p>
            <p>ZKP Hash: <span>{zkpHash || 'N/A'}</span></p>

            <h3>3. Store on Blockchain</h3>
            <button onClick={storeOnChain} disabled={!cid || !zkpHash || !originalFileHash || isProcessing}>Store on Blockchain</button>
        </div>
    );
};
export default Upload;