// src/components/Download.tsx

import React, { useState, useEffect } from 'react';
import type { DownloadProps, DocumentDetail } from '../types';
import { decryptFile } from '../utils/crypto';

const Download: React.FC<DownloadProps> = ({ contract, signer, log, setView }) => {
    const [userDocuments, setUserDocuments] = useState<DocumentDetail[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [decryptionTarget, setDecryptionTarget] = useState<DocumentDetail | null>(null);
    const [decryptionPassword, setDecryptionPassword] = useState("");
    const [isDecrypting, setIsDecrypting] = useState(false);

    useEffect(() => {
        const fetchUserDocuments = async () => {
            // Don't proceed if the contract or signer isn't ready.
            if (!contract || !signer) {
                return;
            }

            setIsLoading(true);
            log("Fetching your document list...");

            try {
                const userAddress = await signer.getAddress();

                // Call the contract to get the list of document IDs for the user.
                const docIds: any[] = await contract.getDocumentsByUploader(userAddress);

                // Create an array of promises to fetch the details for each document.
                const documentsPromises = docIds.map(id => contract.documents(id));

                // Use Promise.allSettled to ensure that even if one lookup fails, the others can still complete.
                const results = await Promise.allSettled(documentsPromises);

                const fetchedDocuments: DocumentDetail[] = [];
                results.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        const doc = result.value;
                        fetchedDocuments.push({
                            id: docIds[index].toString(),
                            cid: doc.ipfsCID,
                            isEncrypted: doc.isEncrypted,
                        });
                    } else {
                        // Log an error if a specific document detail lookup failed.
                        log(`Could not fetch details for document ID ${docIds[index].toString()}: ${result.reason}`, true);
                    }
                });

                // Reverse the array to show the newest documents first.
                setUserDocuments(fetchedDocuments.reverse());
                log(`Found and displayed ${fetchedDocuments.length} document(s).`);

            } catch (error: any) {
                log(`Failed to fetch document list: ${error.message}. Make sure the contract is deployed with the 'getDocumentsByUploader' function.`, true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserDocuments();
    }, [contract, signer, log]); // The effect will re-run ONLY when these stable references change.

    const handleDecryptAndDownload = async () => {
        if (!decryptionTarget || !decryptionPassword) return;

        setIsDecrypting(true);
        log(`Fetching encrypted file ${decryptionTarget.cid}...`);
        try {
            const response = await fetch(`https://ipfs.io/ipfs/${decryptionTarget.cid}`);
            if (!response.ok) throw new Error("Failed to fetch from IPFS.");

            const encryptedData = await response.arrayBuffer();
            log("File fetched. Decrypting in browser...");

            const decryptedBlob = await decryptFile(encryptedData, decryptionPassword);

            const url = URL.createObjectURL(decryptedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `decrypted-doc-${decryptionTarget.id}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            log("✅ Decryption successful. Download has been initiated.");
            setDecryptionTarget(null);
            setDecryptionPassword("");
        } catch (error: any) {
            log(error.message, true);
        } finally {
            setIsDecrypting(false);
        }
    };

    return (
        <div className="view-container">
            <button onClick={() => setView('home')} className="back-button">← Back to Dashboard</button>
            <h2>My Uploaded Documents</h2>
            <div className="document-list">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Encrypted?</th>
                            <th>IPFS CID</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && <tr><td colSpan={4} style={{ textAlign: 'center' }}>Loading...<span className="loading-spinner"></span></td></tr>}
                        {!isLoading && userDocuments.length === 0 && (
                            <tr><td colSpan={4} style={{ textAlign: 'center' }}>No documents found for your address.</td></tr>
                        )}
                        {userDocuments.map(doc => (
                            <tr key={doc.id}>
                                <td>{doc.id}</td>
                                <td>{doc.isEncrypted ? 'Yes 🔒' : 'No'}</td>
                                <td>{doc.cid}</td>
                                <td>
                                    {doc.isEncrypted ? (
                                        <button onClick={() => setDecryptionTarget(doc)}>Decrypt & Download</button>
                                    ) : (
                                        <a href={`https://ipfs.io/ipfs/${doc.cid}`} target="_blank" rel="noopener noreferrer">
                                            <button>View on IPFS</button>
                                        </a>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {decryptionTarget && (
                <div className="zkp-section">
                    <h3>Decrypt File ID: {decryptionTarget.id}</h3>
                    <p>Enter the password used to encrypt this file.</p>
                    <input
                        type="password"
                        placeholder="Enter Decryption Password"
                        value={decryptionPassword}
                        onChange={e => setDecryptionPassword(e.target.value)}
                    />
                    <button onClick={handleDecryptAndDownload} disabled={isDecrypting || !decryptionPassword}>
                        {isDecrypting ? 'Decrypting...' : 'Decrypt & Download'}
                        {isDecrypting && <span className="loading-spinner"></span>}
                    </button>
                    <button onClick={() => setDecryptionTarget(null)} className="back-button" style={{ width: '100%', marginTop: '1rem' }}>Cancel</button>
                </div>
            )}
        </div>
    );
};
export default Download;