// src/components/Upload.tsx

import React, { useState } from 'react';
import * as snarkjs from "snarkjs";
import type { ViewProps } from '../types';
import { encryptFile, sha256 } from '../utils/crypto';

// These paths assume the wasm/zkey files are in your `public` directory
const WASM_PATH = './myposeidon.wasm';
const ZKEY_PATH = './circuit_final.zkey';

const Upload: React.FC<ViewProps> = ({ contract, log, setView }) => {
    // State Management
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState<string | null>(null);
    const [cid, setCid] = useState("");
    const [zkpSecretKey, setZkpSecretKey] = useState("");
    const [encryptionPassword, setEncryptionPassword] = useState("");
    const [isEncrypted, setIsEncrypted] = useState(false);
    const [zkpHash, setZkpHash] = useState("");
    const [originalFileHash, setOriginalFileHash] = useState("");
    const [alert, setAlert] = useState({ isVisible: false, title: '', message: '', type: 'info' as 'info' | 'success' | 'error' });

    const resetFormState = () => {
        setFile(null);
        setCid("");
        setZkpSecretKey("");
        setEncryptionPassword("");
        setIsEncrypted(false);
        setZkpHash("");
        setOriginalFileHash("");
    };

    const handleProcessAndUpload = async () => {
        if (!file || !contract) return log("Please select a file and ensure your wallet is connected.", true);
        if (isEncrypted && !encryptionPassword) return log("An encryption password is required when encryption is enabled.", true);

        setIsProcessing(true);
        setProcessingStep('ipfs');
        log("Processing file...");
        try {
            // Step 1: Calculate the file hash locally.
            log("1. Calculating file hash...");
            const originalHash = await sha256(file);
            log(`✅ File Hash: ${originalHash}`);

            // =================================================================================
            //  THE FIX IS HERE: Gracefully handle the contract's revert behavior.
            // =================================================================================
            log("2. Checking if file already exists on the blockchain...");
            try {
                // We ATTEMPT to get the document. If this call SUCCEEDS, the document exists.
                const existingDoc = await contract.getDocumentByOriginalHash(originalHash);

                // If the line above didn't throw an error, it means we found a duplicate.
                const errorMessage = `This exact file has already been registered on the blockchain by: ${existingDoc.uploader}.`;
                log(`❌ Error: ${errorMessage}`, true);
                setAlert({ isVisible: true, title: 'File Already Exists', message: errorMessage, type: 'error' });
                // We must stop the function here.
                setIsProcessing(false);
                setProcessingStep(null);
                return;

            } catch (error: any) {
                // We EXPECT this catch block to be hit for a NEW, unique file.
                // We check if the error is the specific "not found" error from the contract.
                const isNotFoundError = error.reason?.includes("No document found") || error.message?.includes("No document found");

                if (isNotFoundError) {
                    // This is the "happy path" for a unique file. We can proceed.
                    log("✅ File is unique. Proceeding to upload.");
                } else {
                    // This is a different, unexpected blockchain error. We should stop.
                    throw error;
                }
            }

            // If we've gotten past the check, we can safely set the hash and proceed.
            setOriginalFileHash(originalHash);

            // Step 2: Encrypt (if needed) and upload to IPFS.
            const fileToUpload = isEncrypted ? await encryptFile(file, encryptionPassword) : file;
            if (isEncrypted) log("3. File encrypted successfully.");

            log("4. Uploading file to IPFS...");
            const formData = new FormData();
            formData.append('file', fileToUpload, file.name);
            const response = await fetch('https://hashitfinal-production.up.railway.app/upload', { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "IPFS upload failed");
            setCid(data.cid);
            log(`✅ IPFS Upload Success. CID: ${data.cid}`);

        } catch (e: any) {
            log(`An unexpected error occurred: ${e.message}`, true);
            console.error(e);
        }
        finally {
            setIsProcessing(false);
            setProcessingStep(null);
        }
    };

    const generateZKP = async () => {
        if (!zkpSecretKey) return log("A Secret Key is required to generate the ZKP.", true);
        if (!originalFileHash) return log("Please complete 'Hash & Upload' (Step 3, Button 1) before generating the ZKP.", true);

        setIsProcessing(true);
        setProcessingStep('zkp');
        log("Combining file hash and secret key to generate unique ZKP commitment...");
        try {
            const combinedInput = originalFileHash + zkpSecretKey;
            const encoder = new TextEncoder();
            const data = encoder.encode(combinedInput);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);

            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const finalHashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            const preimage = BigInt(finalHashHex);
            const input = { preimage };

            const { publicSignals } = await snarkjs.groth16.fullProve(input, WASM_PATH, ZKEY_PATH);
            const commitmentHash = '0x' + BigInt(publicSignals[0]).toString(16).padStart(64, '0');

            setZkpHash(commitmentHash);
            log(`✅ ZKP Hash Generated: ${commitmentHash}`);

        } catch (error: any) {
            console.error("ZKP Generation Error:", error);
            log(`ZKP generation failed: ${error.message}`, true);
        } finally {
            setIsProcessing(false);
            setProcessingStep(null);
        }
    };

    const storeOnChain = async () => {
        if (!cid || !zkpHash || !originalFileHash || !contract) return log("You must complete all previous steps: Upload to IPFS and Generate ZKP Hash.", true);

        setIsProcessing(true);
        setProcessingStep('chain');
        log("Sending transaction to wallet...");
        try {
            const tx = await contract.addDocument(cid, zkpHash, isEncrypted, originalFileHash);
            log("Transaction sent. Waiting for confirmation...");
            await tx.wait();
            log("✅ Success! Document registered on-chain.");

            setAlert({
                isVisible: true,
                title: 'Upload Successful!',
                message: 'Your document has been securely registered on the blockchain.',
                type: 'success',
            });

        } catch (e: any) {
            if ((e as any).code === 'ACTION_REJECTED') {
                log(`Transaction rejected by user.`, true);
            } else {
                log(`Blockchain Error: ${e.message}`, true);
            }
        }
        finally {
            setIsProcessing(false);
            setProcessingStep(null);
        }
    };

    const handleCloseAlert = () => {
        if (alert.type === 'success') {
            resetFormState();
        }
        setAlert({ isVisible: false, title: '', message: '', type: 'info' });
    };


    return (
        <div className="view-container">
            {alert.isVisible && (
                <div className="alert-overlay">
                    <div className={`alert-box alert-type-${alert.type}`}>
                        <div className="alert-icon">
                            {alert.type === 'success' ? '✅' : '❌'}
                        </div>
                        <h3 className="alert-title">{alert.title}</h3>
                        <p className="alert-message">{alert.message}</p>
                        <button className="alert-button" onClick={handleCloseAlert}>
                            OK
                        </button>
                    </div>
                </div>
            )}

            <button onClick={() => setView('home')} className="back-button">← Back to Dashboard</button>
            <h2>Secure Document Upload</h2>

            <p className="hero-subtitle" style={{ textAlign: 'center', marginTop: '-1rem', marginBottom: '2rem' }}>
                Follow the steps below to encrypt, hash, and anchor your document on the blockchain.
            </p>

            <div className="verification-section">
                <h3>Step 1: Select Your Document</h3>
                <label htmlFor="file-upload" className="custom-file-upload">
                    <div style={{ textAlign: 'center' }}><span style={{ fontSize: '2.5rem' }}>📄</span>
                        {file ? (<div><p style={{ color: 'var(--primary)', fontWeight: 'bold', margin: '0.5rem 0' }}>{file.name}</p><p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: 0 }}>{(file.size / 1024).toFixed(2)} KB</p></div>) : (<p>Click to browse or drag & drop a file here</p>)}
                    </div>
                </label>
                <input id="file-upload" type="file" onChange={(e) => e.target.files && setFile(e.target.files[0])} style={{ display: 'none' }} />
                {file && (<button onClick={() => setFile(null)} className='back-button' style={{ width: 'auto', margin: '1rem auto 0', display: 'block' }}>Remove File</button>)}
            </div>

            <div className="verification-section">
                <h3>Step 2: Configure Keys & Options</h3>
                <p>Your Secret Key is used to generate a private proof of ownership that is unique to you and this specific file.</p>
                <label htmlFor="zkp-key" style={{ fontWeight: 600 }}>Secret Key for Proof Generation</label>
                <input id="zkp-key" type="password" placeholder="Enter a private, memorable key" value={zkpSecretKey} onChange={e => setZkpSecretKey(e.target.value)} />
                <div className="checkbox-container" style={{ marginTop: '1.5rem' }}><input type="checkbox" id="encrypt" checked={isEncrypted} onChange={e => setIsEncrypted(e.target.checked)} /><label htmlFor="encrypt">Add optional file encryption</label></div>
                {isEncrypted && (<div className='fade-in'><label htmlFor="encrypt-pass" style={{ fontWeight: 600 }}>Encryption Password</label><input id="encrypt-pass" type="password" placeholder="Enter password for file encryption" value={encryptionPassword} onChange={e => setEncryptionPassword(e.target.value)} /></div>)}
            </div>

            <div className="verification-section">
                <h3>Step 3: Process & Generate Proofs</h3>
                <p>These actions are performed locally. First, hash the file and upload it. Second, generate the unique ZKP hash from your file and Secret Key.</p>
                <div className="options-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
                    <button onClick={handleProcessAndUpload} disabled={!file || isProcessing}>{processingStep === 'ipfs' ? <><span className="loading-spinner"></span> Processing...</> : '1. Hash & Upload'}</button>
                    <button onClick={generateZKP} disabled={!zkpSecretKey || !originalFileHash || isProcessing}>{processingStep === 'zkp' ? <><span className="loading-spinner"></span> Generating...</> : '2. Generate ZKP Hash'}</button>
                </div>
                <div className="verification-result" style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Processing Results</h4>
                    <p style={{ margin: '0.5rem 0' }}><strong>Original File Hash:</strong> <span style={{ color: originalFileHash ? 'var(--primary)' : 'var(--muted-foreground)', wordBreak: 'break-all' }}>{originalFileHash || 'Pending...'}</span></p>
                    <p style={{ margin: '0.5rem 0' }}><strong>IPFS Content ID (CID):</strong> <span style={{ color: cid ? 'var(--primary)' : 'var(--muted-foreground)', wordBreak: 'break-all' }}>{cid || 'Pending...'}</span></p>
                    <p style={{ margin: '0.5rem 0' }}><strong>ZKP Commitment Hash:</strong> <span style={{ color: zkpHash ? 'var(--primary)' : 'var(--muted-foreground)', wordBreak: 'break-all' }}>{zkpHash || 'Pending...'}</span></p>
                </div>
            </div>

            <div className="verification-section">
                <h3>Step 4: Anchor on Blockchain</h3>
                <p>This final step sends a transaction to the Ethereum blockchain to permanently record the IPFS CID and the ZKP hash, requiring a gas fee.</p>
                <button onClick={storeOnChain} disabled={!cid || !zkpHash || !originalFileHash || !contract || isProcessing}>{processingStep === 'chain' ? <><span className="loading-spinner"></span> Confirming...</> : 'Store on Blockchain'}</button>
            </div>

            <style>{`
                .custom-file-upload { border: 2px dashed var(--border); border-radius: var(--radius); display: block; padding: 2rem; cursor: pointer; transition: all 0.3s ease; }
                .custom-file-upload:hover { border-color: var(--primary); background-color: rgba(147, 51, 234, 0.05); }
                .fade-in { animation: fadeIn 0.5s ease-in-out; }
                
                .alert-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(5px); }
                .alert-box { background: var(--background); padding: 2rem; border-radius: 12px; border: 1px solid var(--border); text-align: center; max-width: 400px; width: 90%; animation: zoomIn 0.3s ease-out; }
                .alert-box.alert-type-success { border-color: #10b981; }
                .alert-box.alert-type-error { border-color: #f43f5e; }
                .alert-icon { font-size: 2.5rem; margin-bottom: 1rem; }
                .alert-title { margin: 0 0 0.5rem 0; font-size: 1.5rem; }
                .alert-box.alert-type-success .alert-title { color: #10b981; }
                .alert-box.alert-type-error .alert-title { color: #f43f5e; }
                .alert-message { margin: 0 0 1.5rem 0; color: var(--muted-foreground); line-height: 1.6; }
                .alert-button { width: 100%; }

                @keyframes zoomIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </div>
    );
};

export default Upload;