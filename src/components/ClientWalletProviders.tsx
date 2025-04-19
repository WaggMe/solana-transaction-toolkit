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

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css');

const HELIUS_RPC_URL = 'https://elwira-tp4ejq-fast-mainnet.helius-rpc.com/';

export function ClientWalletProviders({ children }: { children: React.ReactNode }) {
    // Determine endpoint - use environment variable or default to Helius RPC
    const endpoint = process.env.NEXT_PUBLIC_RPC_URL || HELIUS_RPC_URL;

    // Network is less relevant when using a specific RPC URL, but keep for wallet adapter if needed
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta';

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            // Pass network to Solflare if it requires it
            new SolflareWalletAdapter({ network: network as any}), 
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