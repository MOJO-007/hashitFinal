// src/types.ts

import { Contract, type Signer } from 'ethers';

export type View = 'home' | 'upload' | 'download' | 'verify';

// This now includes all fields stored on-chain
export interface Document {
    id: string;
    cid: string;
    isEncrypted: boolean;
    uploader: string;
    zkpCommitmentHash: string;
    originalFileHash: string;
}

export interface DocumentDetail {
    id: string;
    cid: string;
    isEncrypted: boolean;
}

export interface ViewProps {
    log: (message: string, isError?: boolean) => void;
    setView: (view: View) => void;
    contract: Contract | null;
}

export interface DownloadProps extends ViewProps {
    signer: Signer | null;
}

export interface DashboardProps {
    signer: Signer | null;
    connectWallet: () => void;
    walletAddress: string;
    setView: (view: View) => void;
}