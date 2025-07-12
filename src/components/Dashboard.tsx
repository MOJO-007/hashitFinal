// src/components/Dashboard.tsx
import React from 'react';
import { DashboardProps } from '../types';

const Dashboard: React.FC<DashboardProps> = ({ signer, connectWallet, walletAddress, setView }) => (
    <div className="dashboard-home">
        <h1>Decentralized Vault</h1>
        <p>A full-stack DApp for secure, verifiable, and private document storage using IPFS, ZK-SNARKs, and client-side encryption.</p>
        {!signer ? (
            <button onClick={connectWallet} className="connect-wallet-btn">Connect Wallet to Start</button>
        ) : (
            <div className="wallet-info">Connected as: <span>{walletAddress}</span></div>
        )}
        <div className="options-grid">
            <div className="option-card" onClick={() => signer && setView('upload')}><h2>Upload Document</h2><p>Encrypt, generate ZKP, and store a new document.</p></div>
            <div className="option-card" onClick={() => signer && setView('download')}><h2>My Documents</h2><p>View and decrypt all documents you have uploaded.</p></div>
            <div className="option-card" onClick={() => signer && setView('verify')}><h2>Verify Document</h2><p>Check if any local file is registered on the blockchain.</p></div>
        </div>
    </div>
);

export default Dashboard;