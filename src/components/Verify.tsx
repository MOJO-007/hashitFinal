// src/components/Verify.tsx

import React, { useState } from 'react';
import * as snarkjs from 'snarkjs';
import type { ViewProps } from '../types';
import { sha256 } from '../utils/crypto';

// These paths must match the ones used in the Upload component
const WASM_PATH = './myposeidon.wasm';
const ZKEY_PATH = './circuit_final.zkey';

const Verify: React.FC<ViewProps> = ({ contract, log, setView }) => {
    // State for the unified verification process
    const [file, setFile] = useState<File | null>(null);
    const [secretKey, setSecretKey] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<string | null>(null);

    /**
     * Resets the form state.
     */
    const resetForm = () => {
        setFile(null);
        setSecretKey("");
        setVerificationResult(null);
    };

    /**
     * Handles the entire verification flow.
     * A user must prove they have the original file AND the secret key used at upload.
     */
    const handleVerifyOwnership = async () => {
        if (!file || !secretKey || !contract) {
            return log("Please provide the original file, your secret key, and ensure your wallet is connected.", true);
        }

        setIsVerifying(true);
        setVerificationResult("Processing...");
        log("Starting verification process...");

        try {
            // 1. Calculate the hash of the local file provided by the user.
            log("1. Calculating local file hash...");
            const localFileHash = await sha256(file);
            log(`   - Local Hash: ${localFileHash}`);

            // 2. Use this hash to fetch the document record from the blockchain.
            log("2. Fetching on-chain record using file hash...");
            const onChainDocument = await contract.getDocumentByOriginalHash(localFileHash);

            // This is a more robust check for a non-existent document
            if (onChainDocument.uploader === "0x0000000000000000000000000000000000000000") {
                throw new Error("This file has not been registered on the blockchain.");
            }
            const onChainZkpHash = onChainDocument.zkpCommitmentHash;
            log(`   - ✅ On-chain record found! Stored ZKP Hash: ${onChainZkpHash}`);

            // 3. Re-create the ZKP secret locally using the file hash and the provided secret key.
            //    This MUST match the logic from the Upload component.
            log("3. Generating local ZKP hash to match against the on-chain record...");
            const combinedInput = localFileHash + secretKey;
            const encoder = new TextEncoder();
            const data = encoder.encode(combinedInput);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const finalHashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            const preimage = BigInt(finalHashHex);

            // 4. Run the ZKP circuit to get the public hash (commitment).
            const { publicSignals } = await snarkjs.groth16.fullProve({ preimage }, WASM_PATH, ZKEY_PATH);
            const localZkpHash = '0x' + BigInt(publicSignals[0]).toString(16).padStart(64, '0');
            log(`   - Locally generated ZKP Hash: ${localZkpHash}`);

            // 5. Compare the locally generated hash with the one stored on-chain.
            log("4. Comparing local hash with on-chain hash...");
            if (localZkpHash === onChainZkpHash) {
                const successMessage = `✅ Verification Successful! You have proven ownership of the document uploaded by ${onChainDocument.uploader}.`;
                setVerificationResult(successMessage);
                log(successMessage);
            } else {
                throw new Error("Verification Failed. The file is correct, but the secret key is wrong.");
            }

        } catch (error: any) {
            // Handle specific and generic errors
            const errorMessage = error.reason?.includes("No document found") || error.message?.includes("not been registered")
                ? "❌ Verification Failed. This file has not been registered on the blockchain."
                : `❌ ${error.message}`;

            setVerificationResult(errorMessage);
            log(errorMessage, true);
        } finally {
            setIsVerifying(false);
        }
    };

    // Helper to determine the CSS class for the result message
    const getResultClassName = (result: string | null): string => {
        if (!result) return '';
        if (result.startsWith('✅')) return 'success';
        if (result.startsWith('❌') || result.startsWith('Error:')) return 'error';
        return 'processing';
    };

    return (
        <div className="view-container">
            <button onClick={() => setView('home')} className="back-button">← Back to Dashboard</button>
            <h2 className="section-title" style={{ marginTop: '2rem' }}>Verify Document Ownership</h2>
            <p className="hero-subtitle" style={{ textAlign: 'center', marginTop: '-1rem', marginBottom: '2rem' }}>
                Prove you are the owner by providing the original file and the secret key you used during the upload.
            </p>

            <div className="verification-section" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h3>Step 1: Provide the Original File</h3>
                <label htmlFor="file-verify-upload" className="custom-file-upload">
                    <span style={{ fontSize: '2.5rem' }}>📄</span>
                    {file ? (
                        <div>
                            <p style={{ color: 'var(--primary)', fontWeight: 'bold', margin: '0.5rem 0' }}>{file.name}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: 0 }}>{(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                    ) : (
                        <p>Click to browse or drag & drop the file to verify</p>
                    )}
                </label>
                <input id="file-verify-upload" type="file" onChange={(e) => { e.target.files && setFile(e.target.files[0]); setVerificationResult(null); }} style={{ display: 'none' }} />
                {file && (
                    <button onClick={resetForm} className='back-button' style={{ width: 'auto', margin: '1rem auto 0', display: 'block' }}>
                        Clear Selections
                    </button>
                )}

                <h3 style={{ marginTop: '2rem' }}>Step 2: Provide the Secret Key</h3>
                <p style={{ color: 'var(--muted-foreground)' }}>
                    Enter the exact same secret key that was used to generate the proof during the upload process.
                </p>
                <input
                    type="password"
                    placeholder="Enter the private secret key"
                    value={secretKey}
                    onChange={(e) => { setSecretKey(e.target.value); setVerificationResult(null); }}
                />

                <button
                    onClick={handleVerifyOwnership}
                    disabled={!file || !secretKey || isVerifying}
                    style={{ marginTop: '2rem', width: '100%' }}
                >
                    {isVerifying ? <><span className="loading-spinner"></span> Verifying...</> : 'Verify Ownership'}
                </button>

                {verificationResult && (
                    <div className={`verification-result ${getResultClassName(verificationResult)}`} style={{ marginTop: '1.5rem' }}>
                        <p>{verificationResult}</p>
                    </div>
                )}
            </div>
            <style>{`
                .custom-file-upload { border: 2px dashed var(--border); border-radius: var(--radius); display: block; padding: 2rem; cursor: pointer; transition: all 0.3s ease; }
                .custom-file-upload:hover { border-color: var(--primary); background-color: rgba(147, 51, 234, 0.05); }
                .verification-result { padding: 1rem; border-radius: var(--radius); margin-top: 1rem; border: 1px solid transparent; }
                .verification-result.success { background-color: rgba(16, 185, 129, 0.1); border-color: #10b981; color: #059669; }
                .verification-result.error { background-color: rgba(244, 63, 94, 0.1); border-color: #f43f5e; color: #ef4444; }
                .verification-result.processing { background-color: rgba(255, 255, 255, 0.05); color: var(--muted-foreground); }
            `}</style>
        </div>
    );
};

export default Verify;