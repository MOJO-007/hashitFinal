// src/components/Verify.tsx

import React, { useState } from 'react';
import * as snarkjs from 'snarkjs';
import type { ViewProps, Document } from '../types';
import { sha256 } from '../utils/crypto';

// These paths assume the wasm/zkey files are in your `public` directory
const WASM_PATH = './myposeidon.wasm';
const ZKEY_PATH = './circuit_final.zkey';

const Verify: React.FC<ViewProps> = ({ contract, log, setView }) => {
    // State for Section 1: Verify File Authenticity
    const [file, setFile] = useState<File | null>(null);
    const [isFileVerifying, setIsFileVerifying] = useState(false);
    const [fileVerificationResult, setFileVerificationResult] = useState<string | null>(null);

    // State for Section 2: ZKP Password Verification
    const [cidToVerify, setCidToVerify] = useState("");
    const [password, setPassword] = useState("");
    const [isZkpVerifying, setIsZkpVerifying] = useState(false);
    const [zkpVerificationResult, setZkpVerificationResult] = useState<string | null>(null);


    const handleVerifyFile = async () => {
        if (!file || !contract) return log("Please select a file and connect wallet.", true);
        setIsFileVerifying(true);
        setFileVerificationResult("Processing...");
        try {
            log("Calculating SHA-256 hash of local file...");
            const localHash = await sha256(file);
            log(`Checking blockchain for original file hash: ${localHash}`);
            const doc = await contract.getDocumentByOriginalHash(localHash);

            if (doc.uploader === "0x0000000000000000000000000000000000000000") {
                throw new Error("Document not found");
            }
            const resultMessage = `✅ Found! Uploader: ${doc.uploader}, Encrypted: ${doc.isEncrypted ? 'Yes 🔒' : 'No'}, Stored CID: ${doc.ipfsCID}`;
            setFileVerificationResult(resultMessage);
            log(resultMessage);
        } catch (error) {
            const errorMessage = "❌ Not Found. This file has not been registered on the blockchain.";
            setFileVerificationResult(errorMessage);
            log(errorMessage, true);
        } finally {
            setIsFileVerifying(false);
        }
    };

    // --- THIS IS THE CORRECTED ZKP VERIFICATION LOGIC ---
    const handleVerifyZkp = async () => {
        if (!cidToVerify || !password || !contract) return log("Content ID and Password are required.", true);

        setIsZkpVerifying(true);
        setZkpVerificationResult("Processing...");
        try {
            // =========================================================================================
            //  THE FIX IS HERE: Replace `getTotalDocuments` with the available `nextDocumentId` function.
            // =========================================================================================
            log("1. Fetching document count from the contract...");
            // `nextDocumentId` gives the ID for the *next* document. The latest ID is `nextDocumentId - 1`.
            const nextId = await contract.nextDocumentId();
            const latestDocId = Number(nextId) - 1;

            if (latestDocId < 1) {
                throw new Error("No documents have been added to the contract yet.");
            }

            log(`Searching for CID through ${latestDocId} documents...`);
            let onChainDoc: Document | null = null;

            // We loop from the newest (latestDocId) to the oldest (1).
            for (let i = latestDocId; i >= 1; i--) {
                const doc = await contract.documents(i);
                if (doc.ipfsCID === cidToVerify) {
                    onChainDoc = {
                        id: i.toString(),
                        cid: doc.ipfsCID,
                        isEncrypted: doc.isEncrypted,
                        uploader: doc.uploader,
                        zkpCommitmentHash: doc.zkpCommitmentHash,
                        originalFileHash: doc.originalFileHash
                    };
                    break; // Exit the loop once a match is found
                }
            }

            // If after checking all documents, we still haven't found it:
            if (!onChainDoc) {
                throw new Error(`Document with CID ${cidToVerify} was not found on the blockchain.`);
            }

            const onChainHash = onChainDoc.zkpCommitmentHash;
            log(`2. Document found! Stored ZKP hash: ${onChainHash}`);

            if (!onChainHash || onChainHash === "0x0000000000000000000000000000000000000000000000000000000000000000") {
                throw new Error(`The found document does not have a ZKP hash associated with it.`);
            }

            // Step 2: Generate the hash locally from the provided password
            log("3. Generating local ZKP hash from your password...");
            const passBytes = new TextEncoder().encode(password);
            let hexString = '0x';
            passBytes.forEach((byte) => { hexString += byte.toString(16).padStart(2, '0'); });
            const preimage = BigInt(hexString);

            // The input must match the signal name in your .circom file
            const input = { preimage };

            const { publicSignals } = await snarkjs.groth16.fullProve(input, WASM_PATH, ZKEY_PATH);
            const localHash = '0x' + BigInt(publicSignals[0]).toString(16).padStart(64, '0');
            log(`4. Locally generated hash: ${localHash}`);

            // Step 3: Compare the hashes
            if (localHash === onChainHash) {
                const successMessage = "✅ Success! The password is correct for this document's ZKP.";
                setZkpVerificationResult(successMessage);
                log(successMessage);
            } else {
                const failureMessage = "❌ Failure! The password is incorrect.";
                setZkpVerificationResult(failureMessage);
                log(failureMessage, true);
            }
        } catch (error: any) {
            setZkpVerificationResult(`Error: ${error.message}`);
            log(error.message, true);
        } finally {
            setIsZkpVerifying(false);
        }
    };

    return (
        <div className="view-container">
            <button onClick={() => setView('home')} className="back-button">← Back to Dashboard</button>
            <h2>Verification Center</h2>

            {/* --- Section 1: Verify File Authenticity --- */}
            <div className="verification-section">
                <h3>Verify File Authenticity</h3>
                <p>Check if an exact local file has ever been registered on the blockchain.</p>
                <input type="file" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
                <button onClick={handleVerifyFile} disabled={!file || isFileVerifying}>
                    {isFileVerifying ? 'Verifying File...' : 'Verify File Hash'}
                </button>
                {fileVerificationResult && (
                    <div className="verification-result"><p>{fileVerificationResult}</p></div>
                )}
            </div>

            <hr />

            {/* --- Section 2: Verify Password with ZKP --- */}
            <div className="verification-section">
                <h3>Verify Password (ZKP)</h3>
                <p>Prove you know the correct password for a specific Content ID without revealing it.</p>
                <input
                    type="text"
                    placeholder="Enter Content ID (CID) to verify..."
                    value={cidToVerify}
                    onChange={(e) => setCidToVerify(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Enter Password to test..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button onClick={handleVerifyZkp} disabled={!cidToVerify || !password || isZkpVerifying}>
                    {isZkpVerifying ? 'Verifying Password...' : 'Verify Password with ZKP'}
                </button>
                {zkpVerificationResult && (
                    <div className="verification-result"><p>{zkpVerificationResult}</p></div>
                )}
            </div>
        </div>
    );
};
export default Verify;