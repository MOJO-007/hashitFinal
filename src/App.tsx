// src/App.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react'; // Import useCallback
import { ethers, Contract, } from 'ethers';
import type { Signer } from 'ethers';
import './App.css';

import type { View } from './types';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import Download from './components/Download';
import Verify from './components/Verify';
import Instructions from './components/Instructions';

// IMPORTANT: Replace with the address of your NEWLY DEPLOYED contract.
const CONTRACT_ADDRESS = "0x3f177fB010D748F597D42aD0904fb086CEceC765";
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
      },
      {
        "internalType": "bytes32",
        "name": "_originalFileHash",
        "type": "bytes32"
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
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "originalFileHash",
        "type": "bytes32"
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
      },
      {
        "internalType": "bytes32",
        "name": "originalFileHash",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_originalFileHash",
        "type": "bytes32"
      }
    ],
    "name": "getDocumentByOriginalHash",
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
          },
          {
            "internalType": "bytes32",
            "name": "originalFileHash",
            "type": "bytes32"
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
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "originalHashToDocumentId",
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
]

declare global { interface Window { ethereum?: any; } }

const App: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [view, setView] = useState<View>('home');
  const logRef = useRef<HTMLDivElement>(null);

  // --- THE FIX IS HERE ---
  // Wrap the 'log' function in useCallback to memoize it.
  // It will now only be recreated if its dependencies change (which they won't).
  const log = useCallback((message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `${timestamp}: ${message}`;
    setLogs(prevLogs => [...prevLogs, logMessage]);
    if (isError) console.error(logMessage);
    else console.log(logMessage);
  }, []); // Empty dependency array means the function is created once.

  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight);
  }, [logs]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

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
      if (network.name !== 'sepolia') {
        log(`Please switch to the Sepolia network in MetaMask. You are on ${network.name}.`, true);
      }
      setContract(new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, currentSigner));
      log(`Wallet connected: ${address}`);
    } catch (error: any) {
      log(`Wallet connection error: ${error.message}`, true);
    }
  };

  const renderView = () => {
    const props = { contract, log, setView };
    switch (view) {
      case 'upload':
        return <Upload {...props} />;
      case 'download':
        return <Download {...props} signer={signer} />;
      case 'verify':
        return <Verify {...props} />;
      case 'instructions':
        return <Instructions setView={setView} log={log} />;
      case 'home':

      default:
        return <Dashboard signer={signer} connectWallet={connectWallet} walletAddress={walletAddress} setView={setView} />;
    }
  };

  return (
    <div className="container">
      {renderView()}
      <hr />
      <h2>Log Output</h2>
      <div id="logOutput" className="info-box" ref={logRef}>
        {logs.map((logMsg, index) => <div key={index}>{logMsg}</div>)}
      </div>
    </div>
  );
};

export default App;