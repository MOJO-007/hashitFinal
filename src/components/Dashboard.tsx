// src/components/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import type { DashboardProps } from '../types';

const Dashboard: React.FC<DashboardProps> = ({ signer, connectWallet, walletAddress, setView }) => {
    const disconnectWallet = () => {
        window.location.reload();
    };

    const [, setShowTopButton] = useState(false);

    useEffect(() => {
        const handleScroll = () => setShowTopButton(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            <div className="dashboard-home">
                {/* Header */}
                <header className="app-header">
                    <div className="header-content">
                        <h1 className="app-title">HashIt</h1>
                        <nav className="header-nav">
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

                {/* About */}
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
                        <div className="hashit-tagline">Don’t just store it — \"HashIt.\"</div>
                        <div className="network-tag">Powered by Sepolia Ethereum Testnet</div>
                    </div>
                </div>

                {/* Features */}
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

                {/* Get Started */}
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

                        <div
                            className={`option-card ${!signer ? 'disabled' : ''} center-on-small`}
                            onClick={() => signer && setView('verify')}
                        >
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

                {/* How It Works */}
                <div className="features-section" id="how-it-works">
                    <h2 className="section-title">How It Works</h2>
                    <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginBottom: '2rem', fontStyle: 'italic' }}>
                        Tip: Connect to your Ethereum wallet before doing any of these.
                    </p>
                    <div className="options-grid">
                        <div className="option-card disabled">
                            <div className="card-header">
                                <div className="card-icon">📁</div>
                                <h3>1. Upload to IPFS</h3>
                            </div>
                            <p>Upload your file to IPFS and get a unique content identifier (CID).</p>
                        </div>

                        <div className="option-card disabled">
                            <div className="card-header">
                                <div className="card-icon">🧠</div>
                                <h3>2. Generate ZKP</h3>
                            </div>
                            <p>Enter your secret key to generate a zero-knowledge proof commitment.</p>
                        </div>

                        <div className="option-card disabled">
                            <div className="card-header">
                                <div className="card-icon">🪙</div>
                                <h3>3. Write to Blockchain</h3>
                            </div>
                            <p>Write your document hash and ZKP on the blockchain using just 0.0012 ETH.</p>
                        </div>

                        <div className="option-card disabled">
                            <div className="card-header">
                                <div className="card-icon">✅</div>
                                <h3>4. Verify Anytime</h3>
                            </div>
                            <p>Check the authenticity and integrity of your file anytime using its CID.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Back to Top (optional — currently removed by user) */}
            {/* {showTopButton && (
                <button
                    className="back-to-top"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                    ⬆️ Top
                </button>
            )} */}
        </>
    );
};

export default Dashboard;