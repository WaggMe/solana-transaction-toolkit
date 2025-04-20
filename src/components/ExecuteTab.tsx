'use client';

import React, { useState, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, Transaction, Message } from '@solana/web3.js';
import { Buffer } from 'buffer';

const HELIUS_RPC_URL = 'https://elwira-tp4ejq-fast-mainnet.helius-rpc.com/';

// Solana Native Theme Classes (Subset needed for this tab)
const styles = {
    labelText: 'text-gray-600 dark:text-gray-300',
    inputClasses: 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500',
    textAreaClasses: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 font-mono text-xs",
    descriptionText: 'text-xs text-gray-500 dark:text-gray-400 mt-1',
    // Wallet button gets special classes inline
    executeButtonClasses: "w-full sm:w-auto px-6 py-2 font-semibold text-white bg-gradient-to-r from-purple-600 to-teal-500 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-purple-500 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed",
    linkClasses: "text-purple-600 dark:text-teal-400 hover:underline",
    statusBoxBorder: 'border-gray-200 dark:border-gray-700',
    statusBoxBg: 'bg-gray-50 dark:bg-gray-800/50',
    statusHeadingText: 'text-gray-800 dark:text-gray-200',
    statusText: 'text-gray-700 dark:text-gray-300',
    errorClasses: "mt-2 p-3 text-sm border rounded-md text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700",
    infoBoxCode: 'bg-teal-100 dark:bg-teal-700/50 p-0.5 rounded',
};

const ExecuteTab = () => {
    const { publicKey, sendTransaction } = useWallet();

    const [base64Transaction, setBase64Transaction] = useState<string>('');
    const [customRpc, setCustomRpc] = useState<string>('');
    const [status, setStatus] = useState<string>('');
    const [signature, setSignature] = useState<string>('');
    const [error, setError] = useState<string>('');

    const effectiveRpc = useMemo(() => {
        if (customRpc.trim()) {
            try {
                new URL(customRpc.trim());
                return customRpc.trim();
            } catch (err) {
                console.warn("Invalid custom RPC URL provided, using default:", err instanceof Error ? err.message : String(err));
                return HELIUS_RPC_URL;
            }
        }
        return HELIUS_RPC_URL;
    }, [customRpc]);

    const handleExecute = async () => {
        console.log("handleExecute started");
        setStatus('Processing...'); console.log("Status set to: Processing...");
        setError(''); console.log("Error cleared");
        setSignature(''); console.log("Signature cleared");

        const currentPublicKey = publicKey;
        if (!currentPublicKey) {
            setError('Wallet not connected.'); console.log("Error set to: Wallet not connected.");
            setStatus(''); console.log("Status cleared (no wallet)");
            return;
        }

        const currentBase64Tx = base64Transaction.trim();
        if (!currentBase64Tx) { 
            setError('Please paste a base64 encoded transaction message.'); console.log("Error set to: No base64 input.");
            setStatus(''); console.log("Status cleared (no base64)");
            return; 
        }

        try {
            const buffer = Buffer.from(currentBase64Tx, 'base64');
            let txSignature: string;
            const connectionToSend = new Connection(effectiveRpc, 'confirmed');

            try {
                console.log("Attempting to deserialize legacy message buffer...");
                const message = Message.from(buffer);
                console.log("Legacy message deserialized.");
                
                const legacyTx = Transaction.populate(message);
                console.log("Legacy transaction populated from message.");

                if (!legacyTx.feePayer) {
                    if (message.accountKeys[0]) { legacyTx.feePayer = message.accountKeys[0]; } 
                    else { legacyTx.feePayer = currentPublicKey; }
                    console.log('Fee payer set.');
                }
                if (!legacyTx.recentBlockhash) {
                    if (message.recentBlockhash) { legacyTx.recentBlockhash = message.recentBlockhash; } 
                    else { const { blockhash } = await connectionToSend.getLatestBlockhash(); legacyTx.recentBlockhash = blockhash; }
                    console.log('Blockhash set.');
                }

                console.log("Calling sendTransaction for Legacy Transaction...");
                txSignature = await sendTransaction(legacyTx, connectionToSend);
                console.log("Sent legacy transaction, signature:", txSignature);

            } catch (legacyError: unknown) {
                console.error("Failed during legacy transaction processing:", legacyError);
                const message = legacyError instanceof Error ? legacyError.message : 'Unknown processing error';
                throw new Error(`Failed to decode/process message: ${message}`);
            }

            setStatus('Transaction sent. Confirming...'); console.log("Status set to: Transaction sent. Confirming...");
            setSignature(txSignature); console.log("Signature set to:", txSignature);
            console.log('Calling confirmTransaction...');
            
            const confirmation = await connectionToSend.confirmTransaction(txSignature, 'confirmed');
            console.log('confirmTransaction finished, result:', confirmation);

            if (confirmation.value.err) { 
                 const errorMsg = `Transaction failed to confirm: ${JSON.stringify(confirmation.value.err)}`;
                 console.error(errorMsg);
                 throw new Error(errorMsg);
            }

            setStatus(`Transaction Confirmed: ${txSignature}`); console.log(`Status set to: Transaction Confirmed: ${txSignature}`);
            console.log('Transaction Confirmed successfully');

        } catch (err: unknown) {
             console.error('Execution Error (outer catch block):', err);
             const message = err instanceof Error ? err.message : 'Unknown error';
            setError(`Error: ${message}`); console.log(`Error set to: ${message}`);
            setStatus('Failed'); console.log("Status set to: Failed");
        }
    };

    const inspectorUrl = useMemo(() => {
        const txToInspect = base64Transaction.trim();
        if (!txToInspect) return '#';
        const encodedMessage = encodeURIComponent(encodeURIComponent(txToInspect));
        return `https://solana.fm/inspector?cluster=mainnet-alpha&message=${encodedMessage}`;
    }, [base64Transaction]);

    return (
        <div className="space-y-6">
            <div className="p-4 border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/30 rounded-md text-sm text-teal-700 dark:text-teal-300">
                <h3 className="font-semibold mb-2">Where to find a Base64 Transaction Message:</h3>
                <ul className="list-disc list-outside pl-5 space-y-1 text-xs">
                    <li>{`Generate one using the 'Create' tab in this toolkit.`}</li>
                    <li>Enable developer options in wallets (Phantom, Solflare) to view before signing on other sites.</li>
                    <li>Use the <code className={`px-1 rounded text-xs font-mono ${styles.infoBoxCode}`}>--dump-transaction-message</code> flag with the Solana CLI.</li>
                     <li>
                        In Rust: Add <code className={`px-1 rounded text-xs font-mono ${styles.infoBoxCode}`}>base64 = &quot;0.21&quot;</code> to dependencies and use 
                        <code className={`block p-1 rounded text-xs font-mono mt-1 overflow-x-auto ${styles.infoBoxCode}`}>println!(&quot;&quot;, base64::encode(&amp;transaction.message_data()));</code>
                     </li>
                     <li>
                        In JavaScript/TypeScript: Use 
                        <code className={`block p-1 rounded text-xs font-mono mt-1 overflow-x-auto ${styles.infoBoxCode}`}>console.log(tx.serializeMessage().toString(&quot;base64&quot;));</code>
                     </li>
                </ul>
            </div>
             <div>
                 <label htmlFor="base64Tx" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>Input Base64 Transaction Message</label> 
                 <textarea
                    id="base64Tx"
                    rows={6}
                    value={base64Transaction}
                    onChange={(e) => setBase64Transaction(e.target.value)} 
                    placeholder="Paste original base64 transaction message..."
                    className={styles.textAreaClasses}
                />
                <p className={styles.descriptionText}>The tool expects a serialized transaction *message*.</p>
            </div>
             <div>
                  <label htmlFor="customRpc" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>Custom RPC Endpoint (Optional)</label> 
                  <input type="text" id="customRpc" value={customRpc} onChange={(e) => setCustomRpc(e.target.value)} placeholder={`Defaults to ${HELIUS_RPC_URL}`} className={styles.inputClasses}/> 
            </div>

             <div className="flex flex-col sm:flex-row items-center gap-4">
                 <WalletMultiButton className="!bg-gradient-to-r !from-pink-500 !to-orange-500 !text-white !font-semibold hover:!opacity-90 transition-opacity w-full sm:w-auto" /> 
                 <button 
                    onClick={handleExecute} 
                    disabled={!publicKey || !base64Transaction.trim() || status === 'Processing...'} 
                    className={styles.executeButtonClasses}
                >
                    {publicKey ? 'Sign and Execute' : 'Connect Wallet to Execute'}
                </button> 
            </div>
             <div className={`mt-4 text-sm ${styles.statusText}`}> 
                 <p>⚠️ **Important:** Always verify transaction details before signing.</p> 
                 <a 
                    href={inspectorUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={`mt-1 inline-block ${styles.linkClasses} ${!base64Transaction.trim() ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    Inspect Original Transaction on SolanaFM
                 </a>
             </div>
            {(status || error) && (
                <div className={`mt-4 p-4 border rounded-md ${styles.statusBoxBorder} ${styles.statusBoxBg}`}>
                    <h3 className={`text-md font-semibold mb-2 ${styles.statusHeadingText}`}>Execution Status</h3>
                    {status && <p className={`text-sm ${styles.statusText}`}>Status: {status}</p>}
                    {signature && (
                        <p className={`text-sm mt-1 ${styles.statusText}`}>
                            Signature: {' '}
                            <a
                                href={`https://solscan.io/tx/${signature}?cluster=${customRpc ? 'custom&customUrl=' + encodeURIComponent(effectiveRpc) : 'mainnet-beta'}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${styles.linkClasses} break-all`}
                            >
                                {signature}
                            </a>
                        </p>
                    )}
                    {error && (
                        <div className={styles.errorClasses} role="alert">
                            {error.replace(/'/g, "&apos;")}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ExecuteTab;
