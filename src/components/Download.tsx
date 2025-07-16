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
    const [copiedCid, setCopiedCid] = useState<string | null>(null);
    const copyIcon = "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a0a0a0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3crect x='9' y='9' width='13' height='13' rx='2' ry='2'%3e%3c/rect%3e%3cpath d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'%3e%3c/path%3e%3c/svg%3e";
    const checkIcon = "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2322c55e' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='20 6 9 17 4 12'%3e%3c/polyline%3e%3c/svg%3e";
    // Styles for the new status badges
    const encryptedBadgeStyle: React.CSSProperties = {
        backgroundColor: 'rgba(139, 92, 246, 0.3)',
        color: 'rgba(224, 204, 255, 1)',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '0.85em',
        fontWeight: '500',
        whiteSpace: 'nowrap',
    };

    const publicBadgeStyle: React.CSSProperties = {
        backgroundColor: 'rgba(107, 114, 128, 0.3)',
        color: 'rgba(209, 213, 219, 1)',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '0.85em',
        fontWeight: '500',
        whiteSpace: 'nowrap',
    };



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

    const handleCopyCID = (cid: string) => {
        if (copiedCid === cid) return; // Prevent re-copying
        navigator.clipboard.writeText(cid).then(() => {
            log(`✅ Copied CID to clipboard!`);
            setCopiedCid(cid);
            setTimeout(() => setCopiedCid(null), 2000); // Reset after 2 seconds
        }).catch(err => {
            log(`Failed to copy CID: ${err}`, true);
        });
    };

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

                            <th style={{ whiteSpace: 'nowrap' }}>Sl No</th>
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
                        {userDocuments.map((doc, index) => (
                            <tr key={doc.id}>
                                <td>{index + 1}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <span style={doc.isEncrypted ? encryptedBadgeStyle : publicBadgeStyle}>
                                        {doc.isEncrypted ? 'Encrypted 🔒' : 'Public 🔓'}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span title={doc.cid} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }}>
                                            {doc.cid}
                                        </span>
                                        {/* FIX: Replaced button with a clickable icon */}
                                        <img
                                            src={copiedCid === doc.cid ? checkIcon : copyIcon}
                                            alt={copiedCid === doc.cid ? "Copied" : "Copy CID"}
                                            title={copiedCid === doc.cid ? "Copied!" : "Copy CID"}
                                            onClick={() => handleCopyCID(doc.cid)}
                                            style={{
                                                marginLeft: '1rem',
                                                cursor: 'pointer',
                                                width: '16px',
                                                height: '16px',
                                                opacity: copiedCid === doc.cid ? 1 : 0.6,
                                                transition: 'opacity 0.2s'
                                            }}
                                        />
                                    </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    {doc.isEncrypted ? (
                                        <button onClick={() => setDecryptionTarget(doc)} style={{ minWidth: '180px' }}>
                                            Decrypt & Download
                                        </button>
                                    ) : (
                                        <a href={`https://ipfs.io/ipfs/${doc.cid}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                            <button style={{ minWidth: '180px' }}>
                                                View
                                            </button>
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