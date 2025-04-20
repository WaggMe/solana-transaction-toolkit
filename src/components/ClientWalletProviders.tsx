'use client';

import React, { useMemo } from 'react';
import {
    ConnectionProvider,
    WalletProvider,
} from '@solana/wallet-adapter-react';
import {
    WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
// Remove clusterApiUrl import if no longer needed elsewhere
// import { clusterApiUrl } from '@solana/web3.js'; 
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
// Removed Network import
// import { Network } from '@solana/wallet-adapter-base'; 

// Change require to import for CSS
import '@solana/wallet-adapter-react-ui/styles.css';

const HELIUS_RPC_URL = 'https://elwira-tp4ejq-fast-mainnet.helius-rpc.com/';

export function ClientWalletProviders({ children }: { children: React.ReactNode }) {
    // Determine endpoint - use environment variable or default to Helius RPC
    const endpoint = process.env.NEXT_PUBLIC_RPC_URL || HELIUS_RPC_URL;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta') as any;

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            // Pass network to Solflare if it requires it
            new SolflareWalletAdapter({ network }),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
} 