// src/types.ts

import { Contract, Signer } from 'ethers';

export type View = 'home' | 'upload' | 'download' | 'verify';

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