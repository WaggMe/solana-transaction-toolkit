'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, TransactionInstruction, TransactionMessage, ComputeBudgetProgram } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { Buffer } from 'buffer';
import * as squads from '@sqds/multisig';
import Image from 'next/image';

// Types and Interfaces
type WalletType = 'single' | 'squadsv3' | 'squadsv4' | 'realms';
type TransactionType = 'sendSol' | 'sendSpl' | 'jupiterSwap';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface QuoteResponse { [key: string]: any; } // Using any for flexibility with Jupiter API response shape
interface InstructionInfo { programId: string; accounts: { pubkey: string; isSigner: boolean; isWritable: boolean; }[]; data: string; }
interface SwapInstructionsResponse { computeBudgetInstructions?: InstructionInfo[]; setupInstructions?: InstructionInfo[]; swapInstruction: InstructionInfo; cleanupInstruction?: InstructionInfo | null; addressLookupTableAddresses?: string[]; error?: string; }
interface JupiterToken { address: string; chainId: number; decimals: number; name: string; symbol: string; logoURI: string; tags: string[]; }
interface TokenInfo { name: string | null; symbol: string | null; logoURI: string | null; decimals: number; }

// Constants
const HELIUS_RPC_URL = 'https://elwira-tp4ejq-fast-mainnet.helius-rpc.com/';
const DEFAULT_COMPUTE_UNITS = 200_000;
const SOL_TRANSFER_COMPUTE_UNITS = 3000;
const JUPITER_SWAP_COMPUTE_UNITS = 140_000;
const DEFAULT_PRIORITY_FEE_SOL = 0.0001;

// Helpers
function deserializeInstruction(instruction: InstructionInfo): TransactionInstruction {
    return new TransactionInstruction({
        programId: new PublicKey(instruction.programId),
        keys: instruction.accounts.map((key) => ({
            pubkey: new PublicKey(key.pubkey),
            isSigner: key.isSigner,
            isWritable: key.isWritable,
        })),
        data: Buffer.from(instruction.data, "base64"),
    });
}

// Solana Native Theme Tailwind Classes (Hardcoded)
const solanaTheme = {
    containerText: 'text-gray-700 dark:text-gray-200', // Base text
    sectionBorder: 'border-gray-200 dark:border-gray-700',
    headingText: 'text-gray-800 dark:text-gray-100',
    labelText: 'text-gray-600 dark:text-gray-300',
    selectClasses: 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500',
    inputClasses: 'flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500',
    buttonBase: "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
    removeButtonClasses: `ml-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-100 dark:bg-gray-700 hover:bg-red-200 dark:hover:bg-gray-600`,
    addButtonClasses: `mt-1 text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-200 bg-teal-100 dark:bg-gray-700 hover:bg-teal-200 dark:hover:bg-gray-600`,
    descriptionText: 'text-xs text-gray-500 dark:text-gray-400 mt-1',
    primaryButtonClasses: "w-full px-4 py-2 mb-4 font-semibold text-white bg-gradient-to-r from-purple-600 to-teal-500 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-purple-500 transition-opacity",
    errorClasses: "p-3 mb-4 text-sm border rounded-md text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700",
    outputLabelClasses: 'block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1',
    outputTextAreaClasses: "w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 font-mono text-xs",
    secondaryButtonClasses: `mt-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600`,
    tokenInfoBg: "bg-gray-100 dark:bg-gray-700",
    tokenInfoText: "text-gray-700 dark:text-gray-200",
    unknownTokenText: "text-red-600 dark:text-red-500", // Keep red for invalid
    loadingText: "text-gray-500 dark:text-gray-400",
    inputDisabledClasses: "disabled:opacity-50 dark:disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-700",
};


const CreateTab = () => {
    // State remains the same
    const [walletType, setWalletType] = useState<WalletType>('single');
    const [signers, setSigners] = useState<string[]>(['']);
    const [payer, setPayer] = useState<string>('');
    const [transactionType, setTransactionType] = useState<TransactionType>('sendSol');
    const [destinationAddress, setDestinationAddress] = useState<string>('');
    const [solAmount, setSolAmount] = useState<string>('');
    const [swapFromToken, setSwapFromToken] = useState<string>('');
    const [swapToToken, setSwapToToken] = useState<string>('');
    const [swapAmount, setSwapAmount] = useState<string>('');
    const [priorityFeeSol, setPriorityFeeSol] = useState<string>(DEFAULT_PRIORITY_FEE_SOL.toString());
    const [generatedTx, setGeneratedTx] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [tokenMap, setTokenMap] = useState<Map<string, JupiterToken>>(new Map());
    const [fromTokenInfo, setFromTokenInfo] = useState<TokenInfo | null>(null);
    const [toTokenInfo, setToTokenInfo] = useState<TokenInfo | null>(null);
    const [isFromLoading, setIsFromLoading] = useState<boolean>(false);
    const [isToLoading, setIsToLoading] = useState<boolean>(false);

    // Keep useEffect, findTokenInfo, blur handlers, add/remove signer handlers
    useEffect(() => {
        fetch('https://token.jup.ag/strict')
            .then(res => res.json())
            .then((tokens: JupiterToken[]) => {
                const map = new Map<string, JupiterToken>();
                tokens.forEach(token => map.set(token.address, token));
                setTokenMap(map);
                console.log(`Loaded ${map.size} tokens from Jupiter Token List.`);
            })
            .catch(err => console.error("Failed to fetch Jupiter token list:", err));
    }, []);

    const findTokenInfo = useCallback((mintAddress: string): TokenInfo | null => {
        if (!mintAddress || tokenMap.size === 0) return null;
        const token = tokenMap.get(mintAddress.trim());
        if (token) return { name: token.name, symbol: token.symbol, logoURI: token.logoURI, decimals: token.decimals };
        return null;
    }, [tokenMap]);

    const handleFromMintBlur = useCallback(async () => {
        const mintAddress = swapFromToken.trim();
        if (!mintAddress) { setFromTokenInfo(null); return; }
        setIsFromLoading(true);
        setFromTokenInfo(null);
        let info = findTokenInfo(mintAddress);
        if (!info) {
            try {
                const connection = new Connection(HELIUS_RPC_URL, 'confirmed');
                const mintInfo = await getMint(connection, new PublicKey(mintAddress));
                info = { decimals: mintInfo.decimals, name: null, symbol: mintAddress.substring(0, 6) + '...', logoURI: null };
                console.log("Fetched on-chain mint info:", mintInfo);
            } catch (fetchError) {
                console.error(`Failed to fetch mint info for ${mintAddress}:`, fetchError);
                info = null;
            }
        }
        setFromTokenInfo(info);
        setIsFromLoading(false);
    }, [swapFromToken, findTokenInfo]);

    const handleToMintBlur = useCallback(() => {
        setIsToLoading(true);
        const info = findTokenInfo(swapToToken);
        setToTokenInfo(info);
        setIsToLoading(false);
    }, [swapToToken, findTokenInfo]);

    const handleAddSigner = () => setSigners([...signers, '']);
    const handleSignerChange = (index: number, value: string) => { const n = [...signers]; n[index] = value; setSigners(n); };
    const handleRemoveSigner = (index: number) => { const n = signers.filter((_, i) => i !== index); setSigners(n.length ? n : ['']); };

    // generateTransaction function (keep logic, it's independent of theme)
    const generateTransaction = async () => {
        setError('');
        setGeneratedTx('');
        const connection = new Connection(HELIUS_RPC_URL, 'confirmed');

        try {
            const firstSignerInput = signers[0]?.trim(); if (!firstSignerInput) throw new Error('Signer/Multisig address is required.');
            const payerAddress = payer.trim() || firstSignerInput; 
            let feePayerPubkey: PublicKey; 
            try { 
                feePayerPubkey = new PublicKey(payerAddress); 
            } catch (err) { 
                throw new Error(`Invalid Payer address: ${err instanceof Error ? err.message : String(err)}`); 
            }

            let finalTransaction: Transaction | null = null;
            const instructionsToInclude: TransactionInstruction[] = []; 

            let computeUnitLimit = DEFAULT_COMPUTE_UNITS;
            if (transactionType === 'sendSol' && walletType === 'single') { computeUnitLimit = SOL_TRANSFER_COMPUTE_UNITS; }
            else if (transactionType === 'jupiterSwap') { computeUnitLimit = JUPITER_SWAP_COMPUTE_UNITS; } 

            const priorityFeeLamports = Math.round((parseFloat(priorityFeeSol) || 0) * LAMPORTS_PER_SOL);
            const computeBudgetInstructions: TransactionInstruction[] = [];
            if (priorityFeeLamports > 0) {
                computeBudgetInstructions.push( ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit }) );
                const microLamports = Math.floor((priorityFeeLamports * 1_000_000) / computeUnitLimit);
                 if (microLamports > 0) computeBudgetInstructions.push( ComputeBudgetProgram.setComputeUnitPrice({ microLamports }) );
            }

            if (walletType === 'single') {
                let userPublicKey: PublicKey; 
                try { 
                    userPublicKey = new PublicKey(firstSignerInput); 
                } catch (err) { 
                    throw new Error(`Invalid Signer address: ${err instanceof Error ? err.message : String(err)}`); 
                }
                
                if (transactionType === 'sendSol') {
                    if (!destinationAddress.trim()) throw new Error('Destination address required.');
                    let toPubkey: PublicKey; 
                    try { 
                        toPubkey = new PublicKey(destinationAddress.trim()); 
                    } catch (err) { 
                        throw new Error(`Invalid Destination address: ${err instanceof Error ? err.message : String(err)}`); 
                    }
                    const amountSOL = parseFloat(solAmount); if (isNaN(amountSOL) || amountSOL <= 0) throw new Error('Invalid SOL amount.');
                    instructionsToInclude.push(SystemProgram.transfer({ fromPubkey: userPublicKey, toPubkey: toPubkey, lamports: amountSOL * LAMPORTS_PER_SOL }));
                } else if (transactionType === 'sendSpl') {
                    // Disabled in UI, but keep logic stub
                     throw new Error("Send SPL is currently disabled.");
                } else if (transactionType === 'jupiterSwap') {
                    if (!swapFromToken.trim() || !swapToToken.trim()) throw new Error('Both token mints required.');
                    if (!fromTokenInfo) throw new Error('From token info not loaded.');
                    const { decimals: fromDecimals } = fromTokenInfo;
                    const amountFloat = parseFloat(swapAmount); if (isNaN(amountFloat) || amountFloat <= 0) throw new Error('Invalid swap amount.');
                    const amountToSwapRaw = BigInt(Math.round(amountFloat * (10 ** fromDecimals))); if (amountToSwapRaw <= 0) throw new Error('Calculated swap amount is zero.');
                    
                    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${swapFromToken.trim()}&outputMint=${swapToToken.trim()}&amount=${amountToSwapRaw.toString()}&slippageBps=50&onlyDirectRoutes=false`;
                    const quoteResponse: QuoteResponse = await (await fetch(quoteUrl)).json(); if (!quoteResponse || quoteResponse.error) throw new Error(`Quote Error: ${quoteResponse.error || 'Unknown'}`);
                    
                    const instructionsUrl = 'https://quote-api.jup.ag/v6/swap-instructions';
                    const swapPayload = { quoteResponse, userPublicKey: userPublicKey.toString(), wrapAndUnwrapSol: true };
                    const instructionsResponse: SwapInstructionsResponse = await (await fetch(instructionsUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(swapPayload) })).json(); if (!instructionsResponse || instructionsResponse.error) throw new Error(`Swap Instructions Error: ${instructionsResponse.error || 'Unknown'}`);
                    
                    if (instructionsResponse.setupInstructions) { instructionsToInclude.push(...instructionsResponse.setupInstructions.map(deserializeInstruction)); }
                    instructionsToInclude.push(deserializeInstruction(instructionsResponse.swapInstruction));
                    if (instructionsResponse.cleanupInstruction) { instructionsToInclude.push(deserializeInstruction(instructionsResponse.cleanupInstruction)); }
                }
                
                if (instructionsToInclude.length === 0) throw new Error('No instructions generated.');
                const { blockhash } = await connection.getLatestBlockhash();
                finalTransaction = new Transaction({ recentBlockhash: blockhash, feePayer: feePayerPubkey }).add(...computeBudgetInstructions).add(...instructionsToInclude);

            } else if (walletType === 'squadsv4') {
                 let multisigPda: PublicKey; 
                 try { 
                     multisigPda = new PublicKey(firstSignerInput); 
                 } catch (err) { 
                     throw new Error(`Invalid Squads v4 address: ${err instanceof Error ? err.message : String(err)}`); 
                 }
                 const vaultIndex = 0;
                 const [vaultPda] = squads.getVaultPda({ multisigPda, index: vaultIndex });
                 const innerInstructions: TransactionInstruction[] = [...computeBudgetInstructions]; // Add fee to inner tx

                if (transactionType === 'sendSol') {
                     if (!destinationAddress.trim()) throw new Error('Destination address required.');
                     let toPubkey: PublicKey; 
                     try { 
                         toPubkey = new PublicKey(destinationAddress.trim()); 
                     } catch (err) { 
                         throw new Error(`Invalid Destination address: ${err instanceof Error ? err.message : String(err)}`); 
                     }
                     const amountSOL = parseFloat(solAmount); if (isNaN(amountSOL) || amountSOL <= 0) throw new Error('Invalid SOL amount.');
                     innerInstructions.push(SystemProgram.transfer({ fromPubkey: vaultPda, toPubkey: toPubkey, lamports: amountSOL * LAMPORTS_PER_SOL }));
                } else if (transactionType === 'sendSpl') {
                     // Disabled in UI
                      throw new Error("Send SPL is currently disabled.");
                 } else if (transactionType === 'jupiterSwap') {
                     if (!swapFromToken.trim() || !swapToToken.trim()) throw new Error('Both token mints required.');
                     if (!fromTokenInfo) throw new Error('From token info not loaded.');
                     const { decimals: fromDecimals } = fromTokenInfo;
                     const amountFloat = parseFloat(swapAmount); if (isNaN(amountFloat) || amountFloat <= 0) throw new Error('Invalid swap amount.');
                     const amountToSwapRaw = BigInt(Math.round(amountFloat * (10 ** fromDecimals))); if (amountToSwapRaw <= 0) throw new Error('Calculated swap amount is zero.');

                     const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${swapFromToken.trim()}&outputMint=${swapToToken.trim()}&amount=${amountToSwapRaw.toString()}&slippageBps=50&onlyDirectRoutes=false`;
                     const quoteResponse: QuoteResponse = await (await fetch(quoteUrl)).json(); if (!quoteResponse || quoteResponse.error) throw new Error(`Quote Error: ${quoteResponse.error || 'Unknown'}`);
                    
                     const instructionsUrl = 'https://quote-api.jup.ag/v6/swap-instructions';
                     const swapPayload = { quoteResponse, userPublicKey: multisigPda.toString(), wrapAndUnwrapSol: true }; // Use multisig as authority
                     const instructionsResponse: SwapInstructionsResponse = await (await fetch(instructionsUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(swapPayload) })).json(); if (!instructionsResponse || instructionsResponse.error) throw new Error(`Swap Instructions Error: ${instructionsResponse.error || 'Unknown'}`);
                     
                     if (instructionsResponse.setupInstructions) { innerInstructions.push(...instructionsResponse.setupInstructions.map(deserializeInstruction)); }
                     innerInstructions.push(deserializeInstruction(instructionsResponse.swapInstruction));
                     if (instructionsResponse.cleanupInstruction) { innerInstructions.push(deserializeInstruction(instructionsResponse.cleanupInstruction)); }
                 }

                 if (innerInstructions.length === computeBudgetInstructions.length) throw new Error('No inner instructions generated for Squads proposal.');

                 const multisigInfo = await squads.accounts.Multisig.fromAccountAddress(connection, multisigPda);
                 const transactionIndex = BigInt(multisigInfo.transactionIndex.toString()) + BigInt(1); 
                 const { blockhash: innerBlockhash } = await connection.getLatestBlockhash();
                 const innerTxMessageObject = new TransactionMessage({ payerKey: vaultPda, recentBlockhash: innerBlockhash, instructions: innerInstructions });
                 const vaultTransactionIxData = await squads.instructions.vaultTransactionCreate({ multisigPda, transactionIndex, creator: feePayerPubkey, vaultIndex, ephemeralSigners: 1, transactionMessage: innerTxMessageObject, memo: "Created via TT" });
                 const proposalIxData = await squads.instructions.proposalCreate({ multisigPda, transactionIndex, creator: feePayerPubkey });
                 const { blockhash } = await connection.getLatestBlockhash();
                 finalTransaction = new Transaction({ recentBlockhash: blockhash, feePayer: feePayerPubkey });
                 finalTransaction.add(vaultTransactionIxData); 
                 finalTransaction.add(proposalIxData);
                 console.log('Final transaction for proposal creation assembled.');

            } else if (walletType === 'squadsv3' || walletType === 'realms') {
                 throw new Error(`${walletType} not implemented yet.`);
            }

            if (!finalTransaction) throw new Error('Transaction generation failed.');
            const serializedMessage = finalTransaction.serializeMessage();
            const base64Transaction = Buffer.from(serializedMessage).toString('base64');
            setGeneratedTx(base64Transaction);
            console.log('Generated Transaction (Base64):', base64Transaction);

        } catch (err: unknown) {
            console.error("Error generating transaction:", err);
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(`Error: ${message}`);
        }
    };

    // renderTransactionFields - Apply theme classes
    const renderTransactionFields = () => {
        // Use Solana theme classes directly now
        const styles = solanaTheme; 

        switch (transactionType) {
            case 'sendSol': return (
                <>
                    <div className="mb-4">
                        <label htmlFor="destinationAddress" className={styles.labelText}>Destination Address</label>
                        <input type="text" id="destinationAddress" value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} placeholder="Enter destination wallet address" className={`w-full ${styles.inputClasses.replace('flex-grow ', '')}`} />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="solAmount" className={styles.labelText}>Amount (SOL)</label>
                        <input type="number" id="solAmount" value={solAmount} onChange={(e) => setSolAmount(e.target.value)} placeholder="e.g., 0.5" className={`w-full ${styles.inputClasses.replace('flex-grow ', '')}`} />
                    </div>
                </>
            );
            case 'sendSpl': return null; // Disabled
            case 'jupiterSwap': return (
                <>
                    <div className="mb-4">
                        <label htmlFor="swapFromToken" className={styles.labelText}>Swap From Token Mint</label>
                        <div className="flex items-center space-x-2">
                            <input type="text" id="swapFromToken" value={swapFromToken} onChange={(e) => setSwapFromToken(e.target.value)} onBlur={handleFromMintBlur} placeholder="Enter input token mint address" className={styles.inputClasses} />
                            {isFromLoading && <span className={`text-xs ${styles.loadingText}`}>Loading...</span>}
                            {fromTokenInfo && fromTokenInfo.symbol && (
                                <div className={`flex items-center space-x-1.5 p-1 rounded ${styles.tokenInfoBg}`}>
                                    {fromTokenInfo.logoURI && <Image src={fromTokenInfo.logoURI} alt={fromTokenInfo.symbol || 'token'} width={20} height={20} className="rounded-full" unoptimized={true} />}
                                    <span className={`text-xs font-medium ${styles.tokenInfoText}`}>{fromTokenInfo.symbol}</span>
                                </div>
                            )}
                            {!isFromLoading && swapFromToken && !fromTokenInfo && <span className={`text-xs ${styles.unknownTokenText}`}>Unknown/Invalid</span>}
                        </div>
                    </div>
                    <div className="mb-4">
                        <label htmlFor="swapToToken" className={styles.labelText}>Swap To Token Mint</label>
                        <div className="flex items-center space-x-2">
                            <input type="text" id="swapToToken" value={swapToToken} onChange={(e) => setSwapToToken(e.target.value)} onBlur={handleToMintBlur} placeholder="Enter output token mint address" className={styles.inputClasses} />
                            {isToLoading && <span className={`text-xs ${styles.loadingText}`}>Loading...</span>}
                            {toTokenInfo && toTokenInfo.symbol && (
                                <div className={`flex items-center space-x-1.5 p-1 rounded ${styles.tokenInfoBg}`}>
                                    {toTokenInfo.logoURI && <Image src={toTokenInfo.logoURI} alt={toTokenInfo.symbol || 'token'} width={20} height={20} className="rounded-full" unoptimized={true} />}
                                    <span className={`text-xs font-medium ${styles.tokenInfoText}`}>{toTokenInfo.symbol}</span>
                                </div>
                            )}
                            {!isToLoading && swapToToken && !toTokenInfo && <span className={`text-xs ${styles.loadingText.replace('red','gray')}`}>Unknown</span>}
                        </div>
                    </div>
                    <div className="mb-4">
                       <label htmlFor="swapAmount" className={styles.labelText}> Amount To Swap {fromTokenInfo?.symbol ? `(${fromTokenInfo.symbol})` : ''} </label>
                       <input type="number" id="swapAmount" value={swapAmount} onChange={(e) => setSwapAmount(e.target.value)} placeholder={fromTokenInfo ? `Amount of ${fromTokenInfo.symbol || 'token'}` : "Enter amount (after From Token)"} disabled={!fromTokenInfo} className={`w-full ${styles.inputClasses.replace('flex-grow ', '')} ${styles.inputDisabledClasses}`} />
                       <p className={styles.descriptionText}> {fromTokenInfo ? `Enter amount in standard decimal units (Decimals: ${fromTokenInfo.decimals}).` : "Enter 'From Token' mint first."} </p>
                   </div>
               </>
           );
            default: return null;
       }
   };

    // Main component return - Apply Solana theme classes directly
    const styles = solanaTheme; 
    return (
        <div className="space-y-6"> {/* Removed theme text class, will be inherited */}
            {/* REMOVED Theme Switcher Buttons */}
            <div className={`border-b pb-4 ${styles.sectionBorder}`}>
                <h2 className={`text-lg font-semibold mb-3 ${styles.headingText}`}>Wallet Configuration</h2>
                <div className="mb-4">
                    <label htmlFor="walletType" className={styles.labelText}>Wallet/Multisig Type</label>
                    <select id="walletType" value={walletType} onChange={(e) => setWalletType(e.target.value as WalletType)} className={styles.selectClasses}>
                        <option value="single">Single Hot Wallet</option>
                        <option value="squadsv3" disabled>Squads v3 (Coming Soon)</option>
                        <option value="squadsv4">Squads v4</option>
                        <option value="realms" disabled>Realms (Coming Soon)</option>
                    </select>
                </div>
                 <div className="mb-4">
                     <label className={styles.labelText}> {walletType === 'single' ? 'Signer Address' : 'Signer/Member Addresses'} </label>
                     {signers.map((signer, index) => (
                         <div key={index} className="flex items-center mb-2">
                             <input type="text" value={signer} onChange={(e) => handleSignerChange(index, e.target.value)} placeholder={walletType === 'squadsv4' ? 'Squads Multisig Address' : `Signer ${index + 1}`} className={styles.inputClasses} />
                             {walletType !== 'single' && signers.length > 1 && (<button onClick={() => handleRemoveSigner(index)} className={`${styles.removeButtonClasses} ${styles.buttonBase}`} aria-label={`Remove Signer ${index + 1}`}>Remove</button>)} 
                        </div>
                     ))} 
                     {walletType !== 'single' && walletType !== 'squadsv4' && (<button onClick={handleAddSigner} className={`${styles.addButtonClasses} ${styles.buttonBase}`}>+ Add Signer</button>)} 
                    {walletType === 'squadsv4' && <p className={styles.descriptionText}>Enter the Squads Multisig address above. Other signers are not needed here.</p>}
                 </div>
                 <div className="mb-4">
                     <label htmlFor="payer" className={styles.labelText}>Payer Address (Optional)</label>
                     <input type="text" id="payer" value={payer} onChange={(e) => setPayer(e.target.value)} placeholder="Defaults to first signer/multisig" className={`w-full ${styles.inputClasses.replace('flex-grow ', '')}`} />
                     <p className={styles.descriptionText}>Address that will pay the transaction fee for creating the proposal.</p>
                 </div>
             </div>

             <div className={`border-b pb-4 ${styles.sectionBorder}`}>
                 <h2 className={`text-lg font-semibold mb-3 ${styles.headingText}`}>Transaction Details</h2>
                 <div className="mb-4">
                     <label htmlFor="transactionType" className={styles.labelText}>Transaction Type</label>
                     <select id="transactionType" value={transactionType} onChange={(e) => setTransactionType(e.target.value as TransactionType)} className={styles.selectClasses}>
                         <option value="sendSol">Send SOL</option>
                         <option value="sendSpl" disabled>Send SPL Token (In Development)</option>
                         <option value="jupiterSwap\">Jupiter Swap</option>
                     </select>
                 </div>
                 {renderTransactionFields()}
                 <div className="mt-4">
                     <label htmlFor="priorityFee" className={styles.labelText}>Priority Fee (SOL, optional)</label>
                     <input type="number" id="priorityFee" value={priorityFeeSol} onChange={(e) => setPriorityFeeSol(e.target.value)} step="0.0001" min="0" placeholder={`e.g., ${DEFAULT_PRIORITY_FEE_SOL}`} className={`w-full ${styles.inputClasses.replace('flex-grow ', '')}`} />
                     <p className={styles.descriptionText}>Adds a priority fee to potentially speed up transaction inclusion.</p>
                 </div>
             </div>

              <div>
                 <button onClick={generateTransaction} className={styles.primaryButtonClasses}> Generate Transaction (Base64) </button>
                 {error && (<div className={styles.errorClasses} role="alert">{error}</div>)}
                 {generatedTx && (
                    <div>
                         <label htmlFor="generatedTx" className={styles.outputLabelClasses}>Generated Transaction (Base64)</label>
                         <textarea id="generatedTx" readOnly value={generatedTx} className={styles.outputTextAreaClasses} placeholder="Base64 encoded transaction will appear here..." />
                         <button onClick={() => navigator.clipboard.writeText(generatedTx)} className={`${styles.secondaryButtonClasses} ${styles.buttonBase}`}>Copy to Clipboard</button>
                    </div>
                 )}
             </div>
         </div>
    );
};

export default CreateTab;