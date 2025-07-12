import React, { useState } from 'react';
import { ViewProps } from '../types';
import { encryptFile } from '../utils/crypto';

const Verify: React.FC<ViewProps> = ({ contract, log, setView }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isEncrypted, setIsEncrypted] = useState(false);
    const [password, setPassword] = useState("");
    const [cid, setCid] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [verificationResult, setVerificationResult] = useState<string | null>(null);

    const handleCalculateCid = async () => {
        if (!file) return log("Please select a file.", true);
        if (isEncrypted && !password) return log("Password is required to process an encrypted file.", true);
        setIsProcessing(true);
        log(isEncrypted ? "Encrypting file to calculate CID..." : "Calculating CID...");
        try {
            const fileToProcess = isEncrypted ? await encryptFile(file, password) : file;
            const formData = new FormData();
            formData.append('file', fileToProcess, file.name);
            const response = await fetch('http://localhost:4000/calculate-cid', { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setCid(data.cid);
            log(`Real CID calculated: ${data.cid}`);
        } catch (error: any) { log(`Error: ${error.message}`, true); }
        finally { setIsProcessing(false); }
    };

    const handleVerifyOnBlockchain = async () => {
        if (!cid || !contract) return;
        setIsProcessing(true);
        setVerificationResult("Verifying on blockchain...");
        try {
            const doc = await contract.getDocumentByCID(cid);
            // The `uploader` address will be the zero address if the document is not found
            if (doc.uploader === "0x0000000000000000000000000000000000000000") {
                setVerificationResult("❌ Not Found. This CID does not exist on the blockchain.");
            } else {
                const encryptedStatus = doc.isEncrypted ? 'Yes 🔒' : 'No';
                setVerificationResult(`✅ Found! Uploader: ${doc.uploader}, Encrypted: ${encryptedStatus}`);
            }
        } catch (error) {
            // This catch block will be hit if the `require` statement in the contract fails.
            setVerificationResult("❌ Not Found. This CID does not exist on the blockchain.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="view-container">
            <button onClick={() => setView('home')} className="back-button">← Back to Dashboard</button>
            <h2>Verify a Document's Existence</h2>
            <div className="verification-section">
                <h3>1. Select File & Original Encryption Status</h3>
                <input type="file" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
                <div className="checkbox-container">
                    <input type="checkbox" id="encryptVerify" checked={isEncrypted} onChange={e => setIsEncrypted(e.target.checked)} />
                    <label htmlFor="encryptVerify">This file was/should be treated as encrypted</label>
                </div>
                {isEncrypted && <input type="password" placeholder="Enter Encryption Password" value={password} onChange={e => setPassword(e.target.value)} />}
                <h3>2. Calculate Real CID</h3>
                <button onClick={handleCalculateCid} disabled={!file || isProcessing}>{isProcessing ? 'Calculating...' : 'Calculate CID'}</button>
                <p>IPFS CID: <span>{cid || "Pending calculation..."}</span></p>
                <h3>3. Verify on Blockchain</h3>
                <button onClick={handleVerifyOnBlockchain} disabled={!cid || isProcessing}>{isProcessing ? 'Verifying...' : 'Check Blockchain'}</button>
                {verificationResult && <div className="verification-result"><p>{verificationResult}</p></div>}
            </div>
        </div>
    );
};
export default Verify;