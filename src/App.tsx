// src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ethers, BrowserProvider, Contract, Signer } from 'ethers';
import './App.css';

import { View } from './types';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import Download from './components/Download';
import Verify from './components/Verify';

const CONTRACT_ADDRESS = "0x1d09eE1178C428526B46043700AcEff5951e8CFe";
const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_ipfsCID",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "_zkpCommitmentHash",
        "type": "bytes32"
      },
      {
        "internalType": "bool",
        "name": "_isEncrypted",
        "type": "bool"
      }
    ],
    "name": "addDocument",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "documentId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "ipfsCID",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "zkpCommitmentHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "uploader",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isEncrypted",
        "type": "bool"
      }
    ],
    "name": "DocumentAdded",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "cidToDocumentId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "documentIdsByUser",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "documents",
    "outputs": [
      {
        "internalType": "string",
        "name": "ipfsCID",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "zkpCommitmentHash",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "uploader",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "isEncrypted",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_ipfsCID",
        "type": "string"
      }
    ],
    "name": "getDocumentByCID",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "ipfsCID",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "zkpCommitmentHash",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "uploader",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "isEncrypted",
            "type": "bool"
          }
        ],
        "internalType": "struct DocumentZKPStorage.Document",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_documentId",
        "type": "uint256"
      }
    ],
    "name": "getDocumentDetails",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_uploader",
        "type": "address"
      }
    ],
    "name": "getDocumentsByUploader",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalDocuments",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextDocumentId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

declare global { interface Window { ethereum?: any; } }

const App: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [view, setView] = useState<View>('home');
  const logRef = useRef<HTMLDivElement>(null);

  const log = (message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [...prevLogs, `${timestamp}: ${message}`]);
  };

  useEffect(() => { logRef.current?.scrollTo(0, logRef.current.scrollHeight); }, [logs]);

  const connectWallet = async () => {
    if (!window.ethereum) return log("MetaMask not detected!", true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const currentSigner = await provider.getSigner();
      setSigner(currentSigner);
      const address = await currentSigner.getAddress();
      setWalletAddress(address);
      const network = await provider.getNetwork();
      if (network.name !== 'sepolia') log(`Please switch to the Sepolia network.`, true);
      setContract(new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, currentSigner));
      log(`Wallet connected: ${address}`);
    } catch (error: any) {
      log(`Wallet connection error: ${error.message}`, true);
    }
  };

  const renderView = () => {
    const props = { contract, log, setView };
    switch (view) {
      case 'upload': return <Upload {...props} />;
      case 'download': return <Download {...props} signer={signer} />;
      case 'verify': return <Verify {...props} />;
      default: return <Dashboard signer={signer} connectWallet={connectWallet} walletAddress={walletAddress} setView={setView} />;
    }
  };

  return (
    <div className="container">
      {renderView()}
      <hr />
      <h2>Log Output</h2>
      <div id="logOutput" className="info-box">
        {logs.map((msg, i) => <div key={i}>{msg}</div>)}
      </div>
    </div>
  );
};
export default App;