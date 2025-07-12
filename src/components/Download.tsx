import React, { useState, useEffect } from 'react';
import { DownloadProps, DocumentDetail } from '../types';
import { decryptFile } from '../utils/crypto';

const Download: React.FC<DownloadProps> = ({ contract, signer, log, setView }) => {
    const [userDocuments, setUserDocuments] = useState<DocumentDetail[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [decryptionTarget, setDecryptionTarget] = useState<DocumentDetail | null>(null);
    const [decryptionPassword, setDecryptionPassword] = useState("");
    const [isDecrypting, setIsDecrypting] = useState(false);

    useEffect(() => {
        const fetchUserDocuments = async () => {
            if (!contract || !signer) return;
            setIsLoading(true);
            log("Fetching your document list...");
            try {
                const userAddress = await signer.getAddress();
                const docIds: any[] = await contract.getDocumentsByUploader(userAddress);
                const documentsPromises = docIds.map(async (id) => {
                    const doc = await contract.documents(id);
                    return { id: id.toString(), cid: doc.ipfsCID, isEncrypted: doc.isEncrypted };
                });
                const fetchedDocuments = await Promise.all(documentsPromises);
                setUserDocuments(fetchedDocuments.reverse());
                log(`Found ${fetchedDocuments.length} document(s).`);
            } catch (error: any) { log(`Failed to fetch documents: ${error.message}`, true); }
            finally { setIsLoading(false); }
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
            log("Decrypting file...");
            const decryptedBlob = await decryptFile(encryptedData, decryptionPassword);
            const url = URL.createObjectURL(decryptedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `decrypted-doc-${decryptionTarget.id}`;
            a.click();
            URL.revokeObjectURL(a.href);
            log("✅ Decryption successful. Download initiated.");
            setDecryptionTarget(null); setDecryptionPassword("");
        } catch (error: any) { log(error.message, true); }
        finally { setIsDecrypting(false); }
    };

    return (
        <div className="view-container">
            <button onClick={() => setView('home')} className="back-button">← Back to Dashboard</button>
            <h2>My Uploaded Documents</h2>
            <div className="document-list">
                <table>
                    <thead><tr><th>ID</th><th>Encrypted?</th><th>IPFS CID</th><th>Action</th></tr></thead>
                    <tbody>
                        {isLoading && <tr><td colSpan={4} style={{ textAlign: 'center' }}>Loading... <span className="loading-spinner"></span></td></tr>}
                        {!isLoading && userDocuments.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center' }}>No documents found for your address.</td></tr>}
                        {userDocuments.map(doc => (
                            <tr key={doc.id}>
                                <td>{doc.id}</td><td>{doc.isEncrypted ? 'Yes 🔒' : 'No'}</td><td>{doc.cid}</td>
                                <td>{doc.isEncrypted ? <button onClick={() => setDecryptionTarget(doc)}>Decrypt</button> : <a href={`https://ipfs.io/ipfs/${doc.cid}`} target="_blank" rel="noopener noreferrer"><button>View</button></a>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {decryptionTarget && (
                <div className="zkp-section">
                    <h3>Decrypt File ID: {decryptionTarget.id}</h3>
                    <input type="password" placeholder="Enter Decryption Password" value={decryptionPassword} onChange={(e) => setDecryptionPassword(e.target.value)} />
                    <button onClick={handleDecryptAndDownload} disabled={isDecrypting}>{isDecrypting ? 'Decrypting...' : 'Decrypt & Download'}</button>
                    <button onClick={() => setDecryptionTarget(null)} className="back-button" style={{ marginTop: '1rem', width: '100%' }}>Cancel</button>
                </div>
            )}
        </div>
    );
};
export default Download;