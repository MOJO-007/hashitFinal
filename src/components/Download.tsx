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
            if (!contract || !signer) {
                return;
            }

            setIsLoading(true);
            log("Fetching your document list...");

            try {
                const userAddress = await signer.getAddress();
                const docIds: any[] = await contract.getDocumentsByUploader(userAddress);
                
                const documentsPromises = docIds.map(id => contract.documents(id));
                const results = await Promise.allSettled(documentsPromises);

                const fetchedDocuments: DocumentDetail[] = [];
                results.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        const doc = result.value;
                        fetchedDocuments.push({
                            id: docIds[index].toString(), // The real ID is still stored
                            cid: doc.ipfsCID,
                            isEncrypted: doc.isEncrypted,
                        });
                    } else {
                        log(`Could not fetch details for document ID ${docIds[index].toString()}: ${result.reason}`, true);
                    }
                });

                // Sorting in reverse still works to show newest first
                setUserDocuments(fetchedDocuments.reverse());
                log(`Found and displayed ${fetchedDocuments.length} document(s).`);

            } catch (error: any) {
                log(`Failed to fetch document list: ${error.message}.`, true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserDocuments();
    }, [contract, signer, log]);

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
            // The download name still uses the correct ID for clarity
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
            <h2 className="section-title" style={{ marginTop: '2rem' }}>My Uploaded Documents</h2>

            <div className="document-list">
                <table>
                    <thead>
                        <tr>
                            {/* CHANGED: Header updated to "Sl. No." */}
                            <th>Sl. No.</th>
                            <th>Encrypted?</th>
                            <th>IPFS CID</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center' }}>
                                    Loading your documents...<span className="loading-spinner"></span>
                                </td>
                            </tr>
                        )}
                        {!isLoading && userDocuments.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted-foreground)' }}>
                                    No documents found for your wallet address.
                                </td>
                            </tr>
                        )}
                        {/* CHANGED: We now get the index from the map function */}
                        {userDocuments.map((doc, index) => (
                            // The key MUST still be the unique doc.id for React to work correctly
                            <tr key={doc.id}>
                                {/* Display the serial number (index + 1) */}
                                <td>{index + 1}</td>
                                <td>{doc.isEncrypted ? 'Yes 🔒' : 'No'}</td>
                                <td>{doc.cid}</td>
                                <td>
                                    {doc.isEncrypted ? (
                                        // This passes the full `doc` object, including its real ID
                                        <button onClick={() => setDecryptionTarget(doc)}>Decrypt & Download</button>
                                    ) : (
                                        <a href={`https://ipfs.io/ipfs/${doc.cid}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                            <button>View</button>
                                        </a>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {decryptionTarget && (
                <div className="zkp-section" style={{ marginTop: '2rem', backdropFilter: 'blur(10px)' }}>
                    {/* The modal still uses the real ID so the user knows exactly which file they are decrypting */}
                    <h3>Decrypt File ID: {decryptionTarget.id}</h3>
                    <p style={{ color: 'var(--muted-foreground)' }}>
                        Enter the secret password you used when encrypting this file to download it.
                    </p>
                    <input
                        type="password"
                        placeholder="Enter Decryption Password"
                        value={decryptionPassword}
                        onChange={e => setDecryptionPassword(e.target.value)}
                        autoFocus
                    />
                    <button onClick={handleDecryptAndDownload} disabled={isDecrypting || !decryptionPassword}>
                        {isDecrypting ? 'Decrypting...' : 'Decrypt & Download'}
                        {isDecrypting && <span className="loading-spinner"></span>}
                    </button>
                    <button onClick={() => setDecryptionTarget(null)} className="back-button" style={{ width: '100%', marginTop: '0.5rem' }}>
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
};

export default Download;