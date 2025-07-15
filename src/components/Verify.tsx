// src/components/Verify.tsx

import React, { useState } from 'react';
import * as snarkjs from 'snarkjs';
import type { ViewProps, Document } from '../types';
import { sha256 } from '../utils/crypto';

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

    // All functional logic remains unchanged.
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

    const handleVerifyZkp = async () => {
        if (!cidToVerify || !password || !contract) return log("Content ID and Password are required.", true);
        setIsZkpVerifying(true);
        setZkpVerificationResult("Processing...");
        try {
            const nextId = await contract.nextDocumentId();
            const latestDocId = Number(nextId) - 1;
            if (latestDocId < 1) throw new Error("No documents have been added to the contract yet.");

            let onChainDoc: Document | null = null;
            for (let i = latestDocId; i >= 1; i--) {
                const doc = await contract.documents(i);
                if (doc.ipfsCID === cidToVerify) {
                    onChainDoc = { ...doc, id: i.toString() };
                    break;
                }
            }
            if (!onChainDoc) throw new Error(`Document with CID ${cidToVerify} was not found on the blockchain.`);

            const onChainHash = onChainDoc.zkpCommitmentHash;
            if (!onChainHash || onChainHash === "0x0000000000000000000000000000000000000000000000000000000000000000") throw new Error(`The found document does not have a ZKP hash associated with it.`);

            const passBytes = new TextEncoder().encode(password);
            let hexString = '0x';
            passBytes.forEach((byte) => { hexString += byte.toString(16).padStart(2, '0'); });
            const preimage = BigInt(hexString);
            const { publicSignals } = await snarkjs.groth16.fullProve({ preimage }, WASM_PATH, ZKEY_PATH);
            const localHash = '0x' + BigInt(publicSignals[0]).toString(16).padStart(64, '0');

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

    const getResultClassName = (result: string | null): string => {
        if (!result) return '';
        if (result.startsWith('✅')) return 'success';
        if (result.startsWith('❌') || result.startsWith('Error:')) return 'error';
        return 'processing';
    };

    return (
        <div className="view-container">
            <button onClick={() => setView('home')} className="back-button">← Back to Dashboard</button>
            <h2 className="section-title" style={{ marginTop: '2rem' }}>Verification Center</h2>
            <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginBottom: '3rem', fontStyle: 'italic', maxWidth: '600px', margin: '0 auto 3rem' }}>
                Use these tools to verify document integrity and prove password ownership with Zero-Knowledge Proofs.
            </p>

            <div className="options-grid" style={{ alignItems: 'start', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>

                {/* --- Section 1: Verify File Authenticity (with new file input) --- */}
                <div className="zkp-section">
                    <h3>Verify File Authenticity</h3>
                    <p style={{ color: 'var(--muted-foreground)', minHeight: '50px' }}>
                        Check if an exact local file has ever been registered on the blockchain by its hash.
                    </p>

                    {/* === THIS IS THE UPDATED FILE INPUT === */}
                    <label htmlFor="file-verify-upload" className="custom-file-upload">
                        <span style={{ fontSize: '2.5rem' }}>📄</span>
                        {file ? (
                            <div>
                                <p style={{ color: 'var(--primary)', fontWeight: 'bold', margin: '0.5rem 0' }}>{file.name}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: 0 }}>{(file.size / 1024).toFixed(2)} KB</p>
                            </div>
                        ) : (
                            <p>Click to browse or drag & drop a file</p>
                        )}
                    </label>
                    <input id="file-verify-upload" type="file" onChange={(e) => e.target.files && setFile(e.target.files[0])} style={{ display: 'none' }} />
                    {file && (
                        <button onClick={() => { setFile(null); setFileVerificationResult(null); }} className='back-button' style={{ width: 'auto', margin: '1rem auto 0', display: 'block' }}>
                            Remove File
                        </button>
                    )}
                    {/* ======================================= */}
                    
                    <button onClick={handleVerifyFile} disabled={!file || isFileVerifying} style={{ marginTop: '1.5rem' }}>
                        {isFileVerifying ? 'Verifying...' : 'Verify File Hash'}
                        {isFileVerifying && <span className="loading-spinner"></span>}
                    </button>
                    {fileVerificationResult && (
                        <div className={`verification-result ${getResultClassName(fileVerificationResult)}`}>
                            <p>{fileVerificationResult}</p>
                        </div>
                    )}
                </div>

                {/* Section 2: Verify Password with ZKP (Unchanged) */}
                <div className="zkp-section">
                    <h3>Verify Password (ZKP)</h3>
                    <p style={{ color: 'var(--muted-foreground)', minHeight: '50px' }}>
                        Prove you know the correct password for a given Content ID without revealing the password itself.
                    </p>
                    <input
                        type="text"
                        placeholder="Enter Content ID (CID) to verify"
                        value={cidToVerify}
                        onChange={(e) => setCidToVerify(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Enter Password to test"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button onClick={handleVerifyZkp} disabled={!cidToVerify || !password || isZkpVerifying}>
                        {isZkpVerifying ? 'Verifying...' : 'Verify Password with ZKP'}
                        {isZkpVerifying && <span className="loading-spinner"></span>}
                    </button>
                    {zkpVerificationResult && (
                        <div className={`verification-result ${getResultClassName(zkpVerificationResult)}`}>
                            <p>{zkpVerificationResult}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Verify;