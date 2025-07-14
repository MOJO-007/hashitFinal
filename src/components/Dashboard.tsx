// src/components/Dashboard.tsx

import React, { useEffect, useState } from 'react';
// Import the 'View' type to allow navigation to the 'instructions' page
import type { DashboardProps, View } from '../types';

// Extend the component's props to accept the setView function with the correct types
interface ExtendedDashboardProps extends DashboardProps {
    setView: (view: View) => void;
}

const Dashboard: React.FC<ExtendedDashboardProps> = ({ signer, connectWallet, walletAddress, setView }) => {
    // Check if the MetaMask extension is installed by looking for the window.ethereum object
    const isMetaMaskInstalled = typeof window.ethereum !== 'undefined';

    const disconnectWallet = () => {
        // A simple way to disconnect is to reload the page, clearing the current state
        window.location.reload();
    };

    // This state was part of your original code for a "back to top" button
    const [, setShowTopButton] = useState(false);

    useEffect(() => {
        const handleScroll = () => setShowTopButton(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            {/* 
              This is the main conditional logic. 
              If MetaMask is not installed, it shows a dedicated setup screen.
              Otherwise, it shows your full, original dashboard.
            */}
            {!isMetaMaskInstalled ? (
                // --- VIEW 1: RENDERED WHEN METAMASK IS NOT DETECTED ---
                <div className="view-container">
                    <div className="verification-section" style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <h1 className="hero-title">Welcome to HashIt</h1>
                        <p className="hero-subtitle" style={{ marginBottom: '2rem' }}>A Decentralized Document Security Platform</p>

                        <h2>Setup Required</h2>
                        <p>This application requires the MetaMask browser extension. Please follow our step-by-step guide to install it and import the provided hackathon wallet.</p>
                        <button
                            onClick={() => setView('instructions')}
                            className="connect-wallet-btn" // Use a prominent button style for the main call-to-action
                            style={{ maxWidth: '350px', margin: '1rem auto' }}
                        >
                            <span className="btn-icon">🚀</span>
                            Go to Setup Instructions
                        </button>
                    </div>
                </div>

            ) : (
                // --- VIEW 2: RENDERED WHEN METAMASK IS DETECTED (Your Original Dashboard) ---
                <div className="dashboard-home">
                    {/* Header */}
                    <header className="app-header">
                        <div className="header-content">
                            <h1 className="app-title">HashIt</h1>
                            <nav className="header-nav">
                                {/* Small "Help/Setup" button always visible when MetaMask is installed */}
                                <button className="nav-item" onClick={() => setView('instructions')}>
                                    <span className="nav-icon">❓</span> Help/Setup
                                </button>
                                <button className="nav-item" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>
                                    <span className="nav-icon">ℹ️</span> About
                                </button>
                                <button className="nav-item" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                                    <span className="nav-icon">🌟</span> Features
                                </button>
                                <button className="nav-item" onClick={() => document.getElementById('get-started')?.scrollIntoView({ behavior: 'smooth' })}>
                                    <span className="nav-icon">🚀</span> Get Started
                                </button>
                                <button className="nav-item" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                                    <span className="nav-icon">🔄</span> How it Works
                                </button>
                            </nav>
                        </div>
                    </header>

                    {/* About Section */}
                    <div className="hero-section" id="about">
                        <div className="hero-content">
                            <h2 className="hero-title">Decentralized Document Security</h2>
                            <div className="hero-subtitle">
                                <span className="highlight">Privacy-first</span> • <span className="highlight">Verifiable</span> • <span className="highlight">Blockchain-secured</span>
                            </div>
                            <p>
                                HashIt is a decentralized application that enables secure, verifiable document storage using IPFS and Zero-Knowledge Proofs (ZKPs).
                                Every file is encrypted on the client side, preserving privacy, while metadata is anchored on the Ethereum Sepolia public testnet to ensure immutability and tamper-resistance.
                                The blockchain ledger acts as a verifiable trail for document ownership and integrity.
                            </p>
                            <div className="hashit-tagline">Don’t just store it — "HashIt."</div>
                        </div>
                    </div>

                    {/* Features Section */}
                    <div className="security-badges" id="features">
                        <div className="badge">
                            <span className="badge-icon">🔒</span>
                            <span className="badge-text">End-to-End Encrypted</span>
                        </div>
                        <div className="badge">
                            <span className="badge-icon">🛡️</span>
                            <span className="badge-text">Zero-Knowledge Proofs</span>
                        </div>
                        <div className="badge">
                            <span className="badge-icon">🌐</span>
                            <span className="badge-text">Decentralized Storage</span>
                        </div>
                    </div>

                    {/* Get Started Section */}
                    <div className="features-section" id="get-started">
                        <h2 className="section-title">Get Started</h2>

                        {!signer ? (
                            <div className="connection-section">
                                <button onClick={connectWallet} className="connect-wallet-btn">
                                    <span className="btn-icon">🔗</span> Connect Wallet to Begin
                                </button>
                                <p className="connection-hint">You'll need a MetaMask wallet to continue.</p>
                            </div>
                        ) : (
                            <div className="wallet-info">
                                <div className="wallet-status">
                                    <span className="status-indicator"></span>
                                    <span className="status-text">Connected as:</span>
                                </div>
                                <div className="wallet-address">
                                    <span className="address-label">Address:</span>
                                    <span className="address-value">{walletAddress}</span>
                                </div>
                                <button onClick={disconnectWallet} className="back-button" style={{ marginTop: '1rem' }}>
                                    🔌 Disconnect Wallet
                                </button>
                            </div>
                        )}

                        <div className="options-grid">
                            <div className={`option-card ${!signer ? 'disabled' : ''}`} onClick={() => signer && setView('upload')}>
                                <div className="card-header">
                                    <div className="card-icon upload-icon">📁</div>
                                    <h3>Upload Document</h3>
                                </div>
                                <p>Encrypt, generate ZKP, and store a new document securely on the blockchain.</p>
                                <div className="card-footer">
                                    <span className="action-text">Upload Now →</span>
                                </div>
                            </div>

                            <div className={`option-card ${!signer ? 'disabled' : ''}`} onClick={() => signer && setView('download')}>
                                <div className="card-header">
                                    <div className="card-icon download-icon">📋</div>
                                    <h3>My Documents</h3>
                                </div>
                                <p>View and decrypt all documents you have uploaded to your personal vault.</p>
                                <div className="card-footer">
                                    <span className="action-text">View Documents →</span>
                                </div>
                            </div>

                            <div className={`option-card ${!signer ? 'disabled' : ''} center-on-small`} onClick={() => signer && setView('verify')}>
                                <div className="card-header">
                                    <div className="card-icon verify-icon">✅</div>
                                    <h3>Verify Document</h3>
                                </div>
                                <p>Check if any local file is registered and verified on the blockchain network.</p>
                                <div className="card-footer">
                                    <span className="action-text">Verify Now →</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* How It Works Section */}
                    <div className="features-section" id="how-it-works">
                        <h2 className="section-title">How It Works</h2>
                        <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginBottom: '2rem', fontStyle: 'italic' }}>
                            Tip: Connect to your Ethereum wallet before doing any of these.
                        </p>
                        <div className="options-grid">
                            <div className="option-card disabled">
                                <div className="card-header"><div className="card-icon">📁</div><h3>1. Upload to IPFS</h3></div>
                                <p>Upload your file to IPFS and get a unique content identifier (CID).</p>
                            </div>
                            <div className="option-card disabled">
                                <div className="card-header"><div className="card-icon">🧠</div><h3>2. Generate ZKP</h3></div>
                                <p>Enter your secret key to generate a zero-knowledge proof commitment.</p>
                            </div>
                            <div className="option-card disabled">
                                <div className="card-header"><div className="card-icon">🪙</div><h3>3. Write to Blockchain</h3></div>
                                <p>Write your document hash and ZKP on the blockchain using just 0.0012 ETH.</p>
                            </div>
                            <div className="option-card disabled">
                                <div className="card-header"><div className="card-icon">✅</div><h3>4. Verify Anytime</h3></div>
                                <p>Check the authenticity and integrity of your file anytime using its CID.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Dashboard;