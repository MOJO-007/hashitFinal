// src/components/Instructions.tsx

import React from 'react';

// Define a simple props type for components that can navigate back
interface NavigationalProps {
    setView: (view: 'home') => void;
    log: (message: string, isError?: boolean) => void;
}

const Instructions: React.FC<NavigationalProps> = ({ setView, log }) => {

    const recoveryPhrase = "brief ramp edge cycle cost speed lunch tube cry burger fetch mistake";

    const copyToClipboard = () => {
        navigator.clipboard.writeText(recoveryPhrase)
            .then(() => {
                log("✅ Secret recovery phrase copied to clipboard!");
            })
            .catch(err => {
                log(`Failed to copy: ${err}`, true);
            });
    };

    return (
        <div className="view-container">
            <button onClick={() => setView('home')} className="back-button">← Back to Dashboard</button>
            <h2>Hackathon Setup Instructions</h2>

            <div className="verification-section">
                <h3>Step 1: Install MetaMask Wallet</h3>
                <p>MetaMask is a browser extension that allows you to interact with the Ethereum blockchain. You'll need it to use this app.</p>
                <ol style={{ textAlign: 'left', paddingLeft: '20px' }}>
                    <li>Click the button below to go to the official download page.</li>
                    <li>Follow the instructions on their site to add the extension to your browser.</li>
                    <li>Once installed, you should see a small fox icon in your browser's toolbar.</li>
                </ol>
                <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <button>Install MetaMask</button>
                </a>
            </div>

            <hr />

            <div className="verification-section">
                <h3>Step 2: Import the Provided Hackathon Wallet</h3>
                <p>For this hackathon, we have set up a wallet with some Sepolia test ETH for you. This avoids the need to find a faucet and speeds up testing.</p>

                {/* THE SECURITY WARNING DIV HAS BEEN REMOVED FROM HERE */}

                <p>Your secret recovery phrase is:</p>
                <div className="info-box" style={{ background: '#0a1a3e', borderColor: 'var(--primary)', userSelect: 'all', fontSize: '1.1rem', textAlign: 'center' }}>
                    {recoveryPhrase}
                </div>
                <button onClick={copyToClipboard} style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>Copy Phrase to Clipboard</button>

                <h4 style={{ textAlign: 'left', marginTop: '1rem' }}>How to Import:</h4>
                <ol style={{ textAlign: 'left', paddingLeft: '20px' }}>
                    <li>Open the MetaMask extension.</li>
                    <li>If you have just installed it, choose the option to <strong>"Import an existing wallet"</strong>.</li>
                    <li>If you already have a wallet, click the circle icon at the top right, and choose <strong>"Add account or hardware wallet"</strong>, then <strong>"Import account"</strong>.</li>
                    <li>Carefully paste or type the 12-word recovery phrase above into the "Secret Recovery Phrase" field.</li>
                    <li>Create a new password to secure the wallet on this device.</li>
                    <li>Click "Import" (or "Restore") to complete the process.</li>
                </ol>
            </div>

            <hr />

            <div className="verification-section">
                <h3>Step 3: Connect to the Sepolia Testnet</h3>
                <p>This application is deployed on the Sepolia test network. You must switch to this network in MetaMask to interact with the smart contract.</p>
                <ol style={{ textAlign: 'left', paddingLeft: '20px' }}>
                    <li>Open MetaMask.</li>
                    <li>Click the network dropdown at the top-left (it might say "Ethereum Mainnet").</li>
                    <li>Make sure "Show test networks" is enabled in your settings if you don't see it.</li>
                    <li>Select <strong>"Sepolia"</strong> from the list.</li>
                </ol>
            </div>

            <p style={{ textAlign: 'center', marginTop: '2rem' }}>
                You're all set! You can now return to the dashboard and connect your wallet to start using the app.
            </p>
        </div>
    );
};

export default Instructions;