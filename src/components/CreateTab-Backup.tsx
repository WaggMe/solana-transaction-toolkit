// 'use client';

// import React, { useState, useEffect, useCallback } from 'react';
// import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, TransactionInstruction, TransactionMessage, ComputeBudgetProgram } from '@solana/web3.js';
// import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID, getMint } from '@solana/spl-token';
// import { Buffer } from 'buffer';
// import * as squads from '@sqds/multisig';
// import Image from 'next/image';

// type WalletType = 'single' | 'squadsv3' | 'squadsv4' | 'realms';
// type TransactionType = 'sendSol' | 'sendSpl' | 'jupiterSwap';

// // Constants
// const HELIUS_RPC_URL = 'https://elwira-tp4ejq-fast-mainnet.helius-rpc.com/';
// const DEFAULT_COMPUTE_UNITS = 200_000;
// const SOL_TRANSFER_COMPUTE_UNITS = 3000;
// const JUPITER_SWAP_COMPUTE_UNITS = 140_000;
// const DEFAULT_PRIORITY_FEE_SOL = 0.0001;

// // Interfaces
// interface QuoteResponse { [key: string]: any; }
// interface InstructionInfo { programId: string; accounts: { pubkey: string; isSigner: boolean; isWritable: boolean; }[]; data: string; }
// interface SwapInstructionsResponse { computeBudgetInstructions?: InstructionInfo[]; setupInstructions?: InstructionInfo[]; swapInstruction: InstructionInfo; cleanupInstruction?: InstructionInfo | null; addressLookupTableAddresses?: string[]; error?: string; }
// interface JupiterToken { address: string; chainId: number; decimals: number; name: string; symbol: string; logoURI: string; tags: string[]; }
// interface TokenInfo { name: string | null; symbol: string | null; logoURI: string | null; decimals: number; }

// // Helpers
// function deserializeInstruction(instruction: InstructionInfo): TransactionInstruction {
//     return new TransactionInstruction({
//         programId: new PublicKey(instruction.programId),
//         keys: instruction.accounts.map((key) => ({
//             pubkey: new PublicKey(key.pubkey),
//             isSigner: key.isSigner,
//             isWritable: key.isWritable,
//         })),
//         data: Buffer.from(instruction.data, "base64"),
//     });
// }

// const CreateTab = () => {
//     const [walletType, setWalletType] = useState<WalletType>('single');
//     const [signers, setSigners] = useState<string[]>(['']);
//     const [payer, setPayer] = useState<string>('');
//     const [transactionType, setTransactionType] = useState<TransactionType>('sendSol');
//     const [destinationAddress, setDestinationAddress] = useState<string>('');
//     const [solAmount, setSolAmount] = useState<string>('');
//     const [splTokenAddress, setSplTokenAddress] = useState<string>('');
//     const [splTokenAmount, setSplTokenAmount] = useState<string>('');
//     const [swapFromToken, setSwapFromToken] = useState<string>('');
//     const [swapToToken, setSwapToToken] = useState<string>('');
//     const [swapAmount, setSwapAmount] = useState<string>('');
//     const [priorityFeeSol, setPriorityFeeSol] = useState<string>(DEFAULT_PRIORITY_FEE_SOL.toString());
//     const [generatedTx, setGeneratedTx] = useState<string>('');
//     const [error, setError] = useState<string>('');
//     const [tokenMap, setTokenMap] = useState<Map<string, JupiterToken>>(new Map());
//     const [fromTokenInfo, setFromTokenInfo] = useState<TokenInfo | null>(null);
//     const [toTokenInfo, setToTokenInfo] = useState<TokenInfo | null>(null);
//     const [isTokenListLoading, setIsTokenListLoading] = useState<boolean>(true);
//     const [isFromLoading, setIsFromLoading] = useState<boolean>(false);
//     const [isToLoading, setIsToLoading] = useState<boolean>(false);

//     // Fetch Jupiter Token List on mount
//     useEffect(() => {
//         setIsTokenListLoading(true);
//         fetch('https://token.jup.ag/strict') // Fetch the strict list
//             .then(res => res.json())
//             .then((tokens: JupiterToken[]) => {
//                 const map = new Map<string, JupiterToken>();
//                 tokens.forEach(token => map.set(token.address, token));
//                 setTokenMap(map);
//                 console.log(`Loaded ${map.size} tokens from Jupiter Token List.`);
//             })
//             .catch(err => {
//                 console.error("Failed to fetch Jupiter token list:", err);
//                 // Handle error - maybe set an error state or retry?
//             })
//             .finally(() => setIsTokenListLoading(false));
//     }, []);

//     // Function to lookup token info from the map
//     const findTokenInfo = useCallback((mintAddress: string): TokenInfo | null => {
//         if (!mintAddress || tokenMap.size === 0) return null;
//         const token = tokenMap.get(mintAddress.trim());
//         if (token) {
//             return { 
//                 name: token.name,
//                 symbol: token.symbol,
//                 logoURI: token.logoURI,
//                 decimals: token.decimals
//             };
//         }
//         return null;
//     }, [tokenMap]);

//     // Updated handler for From Mint blur - includes on-chain fallback
//     const handleFromMintBlur = useCallback(async () => {
//         const mintAddress = swapFromToken.trim();
//         if (!mintAddress) {
//             setFromTokenInfo(null);
//             return;
//         }
//         setIsFromLoading(true);
//         setFromTokenInfo(null); // Clear previous info
//         let info = findTokenInfo(mintAddress);

//         if (info) {
//             console.log("Found From Token in Jupiter list:", info);
//             setFromTokenInfo(info);
//         } else {
//             console.log("From token not found in list, attempting on-chain lookup...");
//             try {
//                 const connection = new Connection(HELIUS_RPC_URL, 'confirmed'); 
//                 const mintPublicKey = new PublicKey(mintAddress);
//                 const mintInfo = await getMint(connection, mintPublicKey);
//                 console.log("Fetched on-chain mint info:", mintInfo);
//                 info = {
//                     decimals: mintInfo.decimals,
//                     name: null, // Mark as unknown
//                     symbol: mintAddress.substring(0, 6) + '...', // Placeholder symbol
//                     logoURI: null, // No logo available
//                 };
//                 setFromTokenInfo(info);
//             } catch (fetchError) {
//                 console.error(`Failed to fetch mint info for ${mintAddress}:`, fetchError);
//                 setFromTokenInfo(null); // Set back to null on failure
//                 // Optionally set a specific error state here
//             }
//         }
//         setIsFromLoading(false);
//     }, [swapFromToken, findTokenInfo]);

//     // To Mint blur handler - no on-chain fallback needed
//     const handleToMintBlur = useCallback(() => {
//         setIsToLoading(true);
//         const info = findTokenInfo(swapToToken);
//         setToTokenInfo(info); // Will be null if not found
//         setIsToLoading(false);
//         if (!info && swapToToken.trim()) console.log("To token not found in Jupiter list, treating as unknown.");
//         else if(info) console.log("Found To Token:", info);
//     }, [swapToToken, findTokenInfo]);

//     const handleAddSigner = () => {
//         setSigners([...signers, '']);
//     };

//     const handleSignerChange = (index: number, value: string) => {
//         const newSigners = [...signers];
//         newSigners[index] = value;
//         setSigners(newSigners);
//     };

//     const handleRemoveSigner = (index: number) => {
//         const newSigners = signers.filter((_, i) => i !== index);
//         if (newSigners.length === 0) {
//             setSigners(['']);
//         } else {
//             setSigners(newSigners);
//         }
//     };

//     const generateTransaction = async () => {
//         setError('');
//         setGeneratedTx('');
//         const connection = new Connection(HELIUS_RPC_URL, 'confirmed');

//         try {
//             const firstSignerInput = signers[0]?.trim(); if (!firstSignerInput) throw new Error('Signer/Multisig address is required.');
//             const payerAddress = payer.trim() || firstSignerInput; 
//             let feePayerPubkey: PublicKey; try { feePayerPubkey = new PublicKey(payerAddress); } catch (e) { throw new Error('Invalid Payer address.'); }

//             let finalTransaction: Transaction | null = null;
//             let instructionsToInclude: TransactionInstruction[] = []; 

//             // --- Determine Compute Limit BEFORE calculating fee price ---
//             let computeUnitLimit = DEFAULT_COMPUTE_UNITS;
//             if (transactionType === 'sendSol' && walletType === 'single') {
//                 computeUnitLimit = SOL_TRANSFER_COMPUTE_UNITS;
//                 console.log(`Using specific CU limit for SOL transfer: ${computeUnitLimit}`);
//             } else if (transactionType === 'jupiterSwap') {
//                 computeUnitLimit = JUPITER_SWAP_COMPUTE_UNITS;
//                 console.log(`Using specific CU limit for Jupiter Swap: ${computeUnitLimit}`);
//             }
//             // Note: For Squads/Realms, the *inner* tx might use a different limit than the outer proposal tx.
//             // We apply the specific limit to the *inner* tx for Squads here.

//             // --- Calculate Priority Fee (uses determined computeUnitLimit) --- 
//             const priorityFeeLamports = Math.round((parseFloat(priorityFeeSol) || 0) * LAMPORTS_PER_SOL);
//             let computeBudgetInstructions: TransactionInstruction[] = [];
//             if (priorityFeeLamports > 0) {
//                 console.log(`Adding priority fee: ${priorityFeeLamports} lamports with limit ${computeUnitLimit} CU`);
//                 computeBudgetInstructions.push( ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit }) );
//                 const microLamports = Math.floor((priorityFeeLamports * 1_000_000) / computeUnitLimit);
//                 console.log(`Calculated microLamports per CU: ${microLamports}`);
//                 if (microLamports > 0) { 
//                     computeBudgetInstructions.push( ComputeBudgetProgram.setComputeUnitPrice({ microLamports }) );
//                 } else {
//                     console.warn("Calculated microLamports <= 0, skipping setComputeUnitPrice.")
//                 }
//             }

//             // ==============================================
//             // Single Signer Logic
//             // ==============================================
//             if (walletType === 'single') {
//                 let userPublicKey: PublicKey; try { userPublicKey = new PublicKey(firstSignerInput); } catch (e) { throw new Error('Invalid Signer address.'); }
                
//                 if (transactionType === 'sendSol') {
//                     if (!destinationAddress.trim()) throw new Error('Destination address is required.');
//                     let toPubkey: PublicKey; try { toPubkey = new PublicKey(destinationAddress.trim()); } catch (e) { throw new Error('Invalid Destination address.'); }
//                     const amountSOL = parseFloat(solAmount); if (isNaN(amountSOL) || amountSOL <= 0) throw new Error('Invalid SOL amount.');
//                     const amountLamports = amountSOL * LAMPORTS_PER_SOL;
//                     instructionsToInclude.push(SystemProgram.transfer({ fromPubkey: userPublicKey, toPubkey: toPubkey, lamports: amountLamports }));

//                 } else if (transactionType === 'sendSpl') {
//                     if (!splTokenAddress.trim()) throw new Error('SPL Token Mint address is required.');
//                     let mintPubkey: PublicKey; try { mintPubkey = new PublicKey(splTokenAddress.trim()); } catch (e) { throw new Error('Invalid SPL Token Mint address.'); }
//                     if (!destinationAddress.trim()) throw new Error('Destination address is required.');
//                     let destinationOwnerPubkey: PublicKey; try { destinationOwnerPubkey = new PublicKey(destinationAddress.trim()); } catch (e) { throw new Error('Invalid Destination address.'); }
//                     const amountTokens = BigInt(splTokenAmount); if (isNaN(Number(amountTokens)) || amountTokens <= 0) throw new Error('Invalid SPL Token amount. Enter raw units.');
//                     const sourceAta = await getAssociatedTokenAddress(mintPubkey, userPublicKey);
//                     const destinationAta = await getAssociatedTokenAddress(mintPubkey, destinationOwnerPubkey);
//                     const destinationAtaInfo = await connection.getAccountInfo(destinationAta); if (!destinationAtaInfo) { instructionsToInclude.push(createAssociatedTokenAccountInstruction(feePayerPubkey, destinationAta, destinationOwnerPubkey, mintPubkey)); }
//                     instructionsToInclude.push(createTransferInstruction(sourceAta, destinationAta, userPublicKey, amountTokens, [], TOKEN_PROGRAM_ID));

//                 } else if (transactionType === 'jupiterSwap') {
//                     if (!swapFromToken.trim()) throw new Error('Swap From Token Mint address is required.');
//                     if (!swapToToken.trim()) throw new Error('Swap To Token Mint address is required.');
//                     if (!fromTokenInfo) throw new Error('From token info not loaded. Please wait or re-enter mint address.');
//                     const { decimals: fromDecimals } = fromTokenInfo;
//                     const amountFloat = parseFloat(swapAmount); 
//                     if (isNaN(amountFloat) || amountFloat <= 0) throw new Error('Invalid swap amount.');

//                     // Convert user input amount to raw units using fetched decimals
//                     const amountToSwapRaw = BigInt(Math.round(amountFloat * (10 ** fromDecimals)));
//                     if (amountToSwapRaw <= 0) throw new Error('Calculated raw swap amount is zero or less.');
                    
//                     console.log(`Fetching Jupiter quote for ${amountToSwapRaw} raw units of ${swapFromToken}...`);
//                     const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${swapFromToken.trim()}&outputMint=${swapToToken.trim()}&amount=${amountToSwapRaw.toString()}&slippageBps=50&onlyDirectRoutes=false`;
//                     const quoteResponse: QuoteResponse = await (await fetch(quoteUrl)).json();
//                     if (!quoteResponse || (quoteResponse as any).error) throw new Error(`Failed to get Jupiter quote: ${(quoteResponse as any).error || 'Unknown error'}`);

//                     console.log('Fetching Jupiter swap instructions...');
//                     const instructionsUrl = 'https://quote-api.jup.ag/v6/swap-instructions';
//                     const swapPayload = { quoteResponse, userPublicKey: userPublicKey.toString(), wrapAndUnwrapSol: true };
//                     const instructionsResponse: SwapInstructionsResponse = await (await fetch(instructionsUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(swapPayload) })).json();
//                     if (!instructionsResponse || instructionsResponse.error) throw new Error(`Failed to get Jupiter swap instructions: ${instructionsResponse.error || 'Unknown error'}`);

//                     if (instructionsResponse.computeBudgetInstructions) { /* Jupiter provides these, consider using instead of manual ones? For now, ignore them as we add our own */ }
//                     if (instructionsResponse.setupInstructions) { instructionsToInclude.push(...instructionsResponse.setupInstructions.map(deserializeInstruction)); }
//                     instructionsToInclude.push(deserializeInstruction(instructionsResponse.swapInstruction));
//                     if (instructionsResponse.cleanupInstruction) { instructionsToInclude.push(deserializeInstruction(instructionsResponse.cleanupInstruction)); }
//                 }

//                 if (instructionsToInclude.length === 0) throw new Error('No instructions generated.');
//                 const { blockhash } = await connection.getLatestBlockhash();
//                 finalTransaction = new Transaction({ recentBlockhash: blockhash, feePayer: feePayerPubkey })
//                     .add(...computeBudgetInstructions)
//                     .add(...instructionsToInclude);

//             // ==============================================
//             // Squads v4 Logic
//             // ==============================================
//             } else if (walletType === 'squadsv4') {
//                 console.log('Generating Squads v4 Proposal Transaction...');
//                 let multisigPda: PublicKey; try { multisigPda = new PublicKey(firstSignerInput); } catch (e) { throw new Error('Invalid Squads v4 Multisig address provided.'); }
//                 const vaultIndex = 0;
//                 const [vaultPda] = squads.getVaultPda({ multisigPda, index: vaultIndex });
//                 console.log(`Using Squads Multisig: ${multisigPda.toBase58()}, Vault (Index ${vaultIndex}): ${vaultPda.toBase58()}`);

//                 let innerInstructions: TransactionInstruction[] = []; 
//                 // Use the calculated compute budget instructions for the inner transaction
//                 innerInstructions.push(...computeBudgetInstructions);

//                 // Build inner instructions (keep existing Send SOL/SPL/Jupiter logic inside here)
//                 if (transactionType === 'sendSol') {
//                     if (!destinationAddress.trim()) throw new Error('Destination address is required.');
//                     let toPubkey: PublicKey; try { toPubkey = new PublicKey(destinationAddress.trim()); } catch (e) { throw new Error('Invalid Destination address.'); }
//                     const amountSOL = parseFloat(solAmount); if (isNaN(amountSOL) || amountSOL <= 0) throw new Error('Invalid SOL amount.');
//                     const amountLamports = amountSOL * LAMPORTS_PER_SOL;
//                     innerInstructions.push(SystemProgram.transfer({ fromPubkey: vaultPda, toPubkey: toPubkey, lamports: amountLamports }));
//                     console.log('Built inner instruction: Send SOL');
//                 } else if (transactionType === 'sendSpl') {
//                     if (!splTokenAddress.trim()) throw new Error('SPL Token Mint address is required.');
//                     let mintPubkey: PublicKey; try { mintPubkey = new PublicKey(splTokenAddress.trim()); } catch (e) { throw new Error('Invalid SPL Token Mint address.'); }
//                     if (!destinationAddress.trim()) throw new Error('Destination address is required.');
//                     let destinationOwnerPubkey: PublicKey; try { destinationOwnerPubkey = new PublicKey(destinationAddress.trim()); } catch (e) { throw new Error('Invalid Destination address.'); }
//                     const amountTokens = BigInt(splTokenAmount); if (isNaN(Number(amountTokens)) || amountTokens <= 0) throw new Error('Invalid SPL Token amount. Enter raw units.');
//                     const sourceAta = await getAssociatedTokenAddress(mintPubkey, vaultPda, true); 
//                     const destinationAta = await getAssociatedTokenAddress(mintPubkey, destinationOwnerPubkey);
//                     console.log(`Derived Source ATA (Vault): ${sourceAta.toBase58()}`);
//                     console.log(`Derived Destination ATA: ${destinationAta.toBase58()}`);
//                     const destinationAtaInfo = await connection.getAccountInfo(destinationAta); 
//                     if (!destinationAtaInfo) { console.log('Destination ATA does not exist, adding create instruction.'); innerInstructions.push(createAssociatedTokenAccountInstruction(feePayerPubkey, destinationAta, destinationOwnerPubkey, mintPubkey)); } 
//                     innerInstructions.push(createTransferInstruction(sourceAta, destinationAta, vaultPda, amountTokens, [], TOKEN_PROGRAM_ID));
//                     console.log('Built inner instructions: Send SPL Token (with potential ATA creation)');
//                 } else if (transactionType === 'jupiterSwap') {
//                     if (!swapFromToken.trim()) throw new Error('Swap From Token Mint address is required.');
//                     if (!swapToToken.trim()) throw new Error('Swap To Token Mint address is required.');
//                     if (!fromTokenInfo) throw new Error('From token info not loaded. Please wait or re-enter mint address.');
//                     const { decimals: fromDecimals } = fromTokenInfo;
//                     const amountFloat = parseFloat(swapAmount); 
//                     if (isNaN(amountFloat) || amountFloat <= 0) throw new Error('Invalid swap amount.');
//                     const amountToSwapRaw = BigInt(Math.round(amountFloat * (10 ** fromDecimals)));
//                     if (amountToSwapRaw <= 0) throw new Error('Calculated raw swap amount is zero or less.');

//                     console.log(`Fetching Jupiter quote for ${amountToSwapRaw} raw units of ${swapFromToken}...`);
//                     const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${swapFromToken.trim()}&outputMint=${swapToToken.trim()}&amount=${amountToSwapRaw.toString()}&slippageBps=50&onlyDirectRoutes=false`;
//                     const quoteResponse: QuoteResponse = await (await fetch(quoteUrl)).json();
//                     if (!quoteResponse || (quoteResponse as any).error) throw new Error(`Failed to get Jupiter quote: ${(quoteResponse as any).error || 'Unknown error'}`);
//                     console.log('Fetching Jupiter swap instructions for Squads Vault...');
//                     const instructionsUrl = 'https://quote-api.jup.ag/v6/swap-instructions';
//                     const swapPayload = { quoteResponse, userPublicKey: multisigPda.toString(), wrapAndUnwrapSol: true }; 
//                     const instructionsResponse: SwapInstructionsResponse = await (await fetch(instructionsUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(swapPayload) })).json();
//                     if (!instructionsResponse || instructionsResponse.error) throw new Error(`Failed to get Jupiter swap instructions: ${instructionsResponse.error || 'Unknown error'}`);
//                      if (instructionsResponse.computeBudgetInstructions) { innerInstructions.push(...instructionsResponse.computeBudgetInstructions.map(deserializeInstruction)); }
//                      if (instructionsResponse.setupInstructions) { innerInstructions.push(...instructionsResponse.setupInstructions.map(deserializeInstruction)); }
//                     innerInstructions.push(deserializeInstruction(instructionsResponse.swapInstruction));
//                     if (instructionsResponse.cleanupInstruction) { innerInstructions.push(deserializeInstruction(instructionsResponse.cleanupInstruction)); }
//                     console.log('Built inner instructions: Jupiter Swap');
//                 }

//                 if (innerInstructions.length === computeBudgetInstructions.length) { 
//                      throw new Error('No inner instructions generated for Squads proposal.');
//                 }

//                 console.log('Fetching Squads multisig account info...');
//                 const multisigInfo = await squads.accounts.Multisig.fromAccountAddress(connection, multisigPda);
//                 const transactionIndex = BigInt(multisigInfo.transactionIndex.toString()) + BigInt(1); 
//                 const { blockhash: innerBlockhash } = await connection.getLatestBlockhash();
//                 const innerTxMessageObject = new TransactionMessage({ payerKey: vaultPda, recentBlockhash: innerBlockhash, instructions: innerInstructions });
//                 const vaultTransactionIxData = await squads.instructions.vaultTransactionCreate({ multisigPda, transactionIndex, creator: feePayerPubkey, vaultIndex, ephemeralSigners: 1, transactionMessage: innerTxMessageObject, memo: "Created via TT" });
//                 const proposalIxData = await squads.instructions.proposalCreate({ multisigPda, transactionIndex, creator: feePayerPubkey });
//                 const { blockhash } = await connection.getLatestBlockhash();
//                 finalTransaction = new Transaction({ recentBlockhash: blockhash, feePayer: feePayerPubkey });
//                 finalTransaction.add(vaultTransactionIxData); 
//                 finalTransaction.add(proposalIxData);
//                 console.log('Final transaction for proposal creation assembled.');

//             // ==============================================
//             // Other Wallet Types (Placeholders)
//             // ==============================================
//             } else if (walletType === 'squadsv3') { 
//                  throw new Error('Squads v3 not implemented yet.');
//             } else if (walletType === 'realms') {
//                  throw new Error('Realms not implemented yet.');
//             }

//             // --- Final Serialization ---
//             if (!finalTransaction) throw new Error('Transaction generation failed.');
//             const serializedMessage = finalTransaction.serializeMessage();
//             const base64Transaction = Buffer.from(serializedMessage).toString('base64');
//             setGeneratedTx(base64Transaction);
//             console.log('Generated Transaction (Base64):', base64Transaction);

//         } catch (err: any) {
//             console.error("Error generating transaction:", err);
//             setError(`Error: ${err.message}`);
//         }
//     };

//     const renderTransactionFields = () => {
//         switch (transactionType) {
//           case 'sendSol':
//             return (
//               <>
//                 <div className="mb-4">
//                   <label htmlFor="destinationAddress" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>Destination Address</label>
//                   <input
//                     type="text"
//                     id="destinationAddress"
//                     value={destinationAddress}
//                     onChange={(e) => setDestinationAddress(e.target.value)}
//                     placeholder="Enter destination wallet address"
//                     className={`w-full ${styles.inputClasses.replace('flex-grow ', '')}`}
//                   />
//                 </div>
//                 <div className="mb-4">
//                   <label htmlFor="solAmount" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>Amount (SOL)</label>
//                   <input
//                     type="number"
//                     id="solAmount"
//                     value={solAmount}
//                     onChange={(e) => setSolAmount(e.target.value)}
//                     placeholder="e.g., 0.5"
//                     className={`w-full ${styles.inputClasses.replace('flex-grow ', '')}`}
//                   />
//                 </div>
//               </>
//             );
//           case 'sendSpl':
//             return (
//               <>
//                  <div className="mb-4">
//                   <label htmlFor="splTokenAddress" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>SPL Token Mint Address</label>
//                   <input
//                     type="text"
//                     id="splTokenAddress"
//                     value={splTokenAddress}
//                     onChange={(e) => setSplTokenAddress(e.target.value)}
//                     placeholder="Enter token mint address"
//                     className={`w-full ${styles.inputClasses.replace('flex-grow ', '')}`}
//                   />
//                 </div>
//                 <div className="mb-4">
//                   <label htmlFor="destinationAddressSPL" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>Destination Address</label>
//                   <input
//                     type="text"
//                     id="destinationAddressSPL"
//                     value={destinationAddress}
//                     onChange={(e) => setDestinationAddress(e.target.value)}
//                     placeholder="Enter destination wallet address"
//                     className={`w-full ${styles.inputClasses.replace('flex-grow ', '')}`}
//                   />
//                 </div>
//                 <div className="mb-4">
//                   <label htmlFor="splTokenAmount" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>Amount (Tokens)</label>
//                   <input
//                     type="number"
//                     id="splTokenAmount"
//                     value={splTokenAmount}
//                     onChange={(e) => setSplTokenAmount(e.target.value)}
//                     placeholder="Enter token amount (raw units)"
//                     className={`w-full ${styles.inputClasses.replace('flex-grow ', '')}`}
//                   />
//                      <p className={styles.descriptionText}>Enter the raw token amount (considering decimals). UI improvement for decimals pending.</p>
//                 </div>
//               </>
//             );
//           case 'jupiterSwap':
//             return (
//               <>
//                  <div className="mb-4">
//                   <label htmlFor="swapFromToken" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>Swap From Token Mint</label>
//                   <div className="flex items-center space-x-2">
//                       <input
//                           type="text"
//                           id="swapFromToken"
//                           value={swapFromToken}
//                           onChange={(e) => setSwapFromToken(e.target.value)}
//                           onBlur={handleFromMintBlur} 
//                           placeholder="Enter input token mint address"
//                           className={styles.inputClasses}
//                       />
//                       {isFromLoading && <span className={`text-xs ${styles.loadingText}`}>Loading...</span>}
//                       {fromTokenInfo && fromTokenInfo.symbol && (
//                           <div className={`flex items-center space-x-1.5 p-1 rounded ${styles.tokenInfoBg}`}>
//                               {fromTokenInfo.logoURI && 
//                                   <Image 
//                                       src={fromTokenInfo.logoURI} 
//                                       alt={fromTokenInfo.symbol} 
//                                       width={20} 
//                                       height={20} 
//                                       className="rounded-full" 
//                                       unoptimized={true}
//                                   />}
//                               <span className={`text-xs font-medium ${styles.tokenInfoText}`}>{fromTokenInfo.symbol}</span>
//                            </div>
//                       )}
//                        {!isFromLoading && swapFromToken && !fromTokenInfo && <span className={`text-xs ${styles.unknownTokenText}`}>Unknown/Invalid</span>}
//                    </div>
//                </div>
//                <div className="mb-4">
//                   <label htmlFor="swapToToken" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>Swap To Token Mint</label>
//                    <div className="flex items-center space-x-2">
//                       <input
//                           type="text"
//                           id="swapToToken"
//                           value={swapToToken}
//                           onChange={(e) => setSwapToToken(e.target.value)}
//                            onBlur={handleToMintBlur} 
//                           placeholder="Enter output token mint address"
//                           className={styles.inputClasses}
//                       />
//                       {isToLoading && <span className={`text-xs ${styles.loadingText}`}>Loading...</span>}
//                       {toTokenInfo && toTokenInfo.symbol && (
//                           <div className={`flex items-center space-x-1.5 p-1 rounded ${styles.tokenInfoBg}`}>
//                                  {toTokenInfo.logoURI && 
//                                     <Image 
//                                         src={toTokenInfo.logoURI} 
//                                         alt={toTokenInfo.symbol} 
//                                         width={20} 
//                                         height={20} 
//                                         className="rounded-full" 
//                                         unoptimized={true}
//                                     />}
//                                 <span className={`text-xs font-medium ${styles.tokenInfoText}`}>{toTokenInfo.symbol}</span>
//                             </div>
//                         )}
//                          {!isToLoading && swapToToken && !toTokenInfo && <span className={`text-xs ${styles.unknownTokenText?.replace('red', 'gray')}`}>Unknown</span>}
//                    </div>
//                </div>
//                <div className="mb-4">
//                   <label htmlFor="swapAmount" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>
//                      Amount To Swap {fromTokenInfo?.symbol ? `(${fromTokenInfo.symbol})` : ''}
//                   </label>
//                   <input
//                     type="number"
//                     id="swapAmount"
//                     value={swapAmount}
//                     onChange={(e) => setSwapAmount(e.target.value)}
//                     placeholder={fromTokenInfo ? `Amount of ${fromTokenInfo.symbol || 'token'}` : "Enter amount (after From Token)"}
//                     disabled={!fromTokenInfo} // Disable until from token is resolved
//                     className={`w-full ${styles.inputClasses.replace('flex-grow ', '')} ${styles.inputDisabled}`}
//                   />
//                      <p className={styles.descriptionText}>
//                         {fromTokenInfo ? `Enter amount in standard decimal units (Decimals: ${fromTokenInfo.decimals}).` : "Enter 'From Token' mint first to enable amount input."}
//                      </p>
//                 </div>
//               </>
//             );
//           default:
//             return null;
//         }
//       };

//       return (
//         <div className={`space-y-6 ${styles.containerText}`}>
//           {/* Theme Switcher Buttons */}
//           <div className="flex justify-center space-x-2 mb-4 p-2 bg-gray-100 dark:bg-gray-800 rounded">
//             <button onClick={() => setCurrentTheme('solana')} className={`px-3 py-1 text-xs rounded ${currentTheme === 'solana' ? 'bg-purple-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>Solana</button>
//             <button onClick={() => setCurrentTheme('utility')} className={`px-3 py-1 text-xs rounded ${currentTheme === 'utility' ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>Utility</button>
//             <button onClick={() => setCurrentTheme('light')} className={`px-3 py-1 text-xs rounded ${currentTheme === 'light' ? 'bg-indigo-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>Light</button>
//           </div>

//           {/* Wallet/Multisig Configuration */}
//           <div className={`border-b pb-4 ${styles.sectionBorder}`}>
//             <h2 className={`text-lg font-semibold mb-3 ${styles.headingText}`}>Wallet Configuration</h2>
//             <div className="mb-4">
//               <label htmlFor="walletType" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>Wallet/Multisig Type</label>
//               <select
//                 id="walletType"
//                 value={walletType}
//                 onChange={(e) => setWalletType(e.target.value as WalletType)}
//                 className={styles.selectClasses}
//               >
//                 <option value="single">Single Hot Wallet</option>
//                 <option value="squadsv3" disabled>
//                     Squads v3 (Coming Soon)
//                 </option>
//                 <option value="squadsv4">Squads v4</option>
//                 <option value="realms" disabled>
//                     Realms (Coming Soon)
//                 </option>
//               </select>
//             </div>

//             {/* Signer Inputs - Show multiple for multisigs */}
//             <div className="mb-4">
//               <label className={`block text-sm font-medium mb-1 ${styles.labelText}`}>
//                 {walletType === 'single' ? 'Signer Address' : 'Signer/Member Addresses'}
//               </label>
//               {signers.map((signer, index) => (
//                 <div key={index} className="flex items-center mb-2">
//                   <input
//                     type="text"
//                     value={signer}
//                     onChange={(e) => handleSignerChange(index, e.target.value)}
//                     placeholder={walletType === 'squadsv4' ? 'Squads Multisig Address' : `Signer ${index + 1}`}
//                     className={styles.inputClasses}
//                   />
//                   {walletType !== 'single' && signers.length > 1 && (
//                     <button
//                       onClick={() => handleRemoveSigner(index)}
//                       className={styles.removeButton}
//                       aria-label={`Remove Signer ${index + 1}`}
//                     >
//                       Remove
//                     </button>
//                   )}
//                 </div>
//               ))}
//               {walletType !== 'single' && walletType !== 'squadsv4' && (
//                  <button
//                   onClick={handleAddSigner}
//                   className={styles.addButton}
//                 >
//                   + Add Signer
//                 </button>
//               )}
//                {walletType === 'squadsv4' && <p className={styles.descriptionText}>Enter the Squads Multisig address above. Other signers are not needed here.</p>}
//             </div>

//             {/* Payer Input - Show for single or if needed by multisig type */}
//             {/* We might need more complex logic here depending on SDK requirements */} 
//             <div className="mb-4">
//                 <label htmlFor="payer" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>Payer Address (Optional)</label>
//                 <input
//                     type="text"
//                     id="payer"
//                     value={payer}
//                     onChange={(e) => setPayer(e.target.value)}
//                     placeholder="Defaults to first signer/multisig if left empty"
//                     className={`w-full ${styles.inputClasses.replace('flex-grow ', '')}`}
//                 />
//                 <p className={styles.descriptionText}>Address that will pay the transaction fee for creating the proposal.</p>
//             </div>
//           </div>

//           {/* Transaction Configuration */}
//           <div className={`border-b pb-4 ${styles.sectionBorder}`}>
//              <h2 className={`text-lg font-semibold mb-3 ${styles.headingText}`}>Transaction Details</h2>
//             <div className="mb-4">
//               <label htmlFor="transactionType" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>Transaction Type</label>
//               <select
//                 id="transactionType"
//                 value={transactionType}
//                 onChange={(e) => setTransactionType(e.target.value as TransactionType)}
//                 className={styles.selectClasses}
//               >
//                 <option value="sendSol">Send SOL</option>
//                 <option value="sendSpl" disabled>
//                     Send SPL Token (In Development)
//                 </option>
//                 <option value="jupiterSwap">Jupiter Swap</option>
//               </select>
//             </div>

//             {/* Render specific fields based on transaction type */}
//             {renderTransactionFields()}

//             {/* Add Priority Fee Input */}
//             <div className="mt-4">
//                 <label htmlFor="priorityFee" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>Priority Fee (SOL, optional)</label>
//                 <input
//                     type="number"
//                     id="priorityFee"
//                     value={priorityFeeSol}
//                     onChange={(e) => setPriorityFeeSol(e.target.value)}
//                     step="0.0001"
//                     min="0"
//                     placeholder={`e.g., ${DEFAULT_PRIORITY_FEE_SOL}`}
//                     className={`w-full ${styles.inputClasses.replace('flex-grow ', '')}`}
//                 />
//                  <p className={styles.descriptionText}>Adds a priority fee to potentially speed up transaction inclusion.</p>
//             </div>
//           </div>

//           {/* Generate Button and Output */}
//           <div>
//             <button
//               onClick={generateTransaction}
//               className={styles.primaryButton}
//             >
//               Generate Transaction (Base64)
//             </button>

//             {error && (
//               <div className={`p-3 mb-4 text-sm border rounded-md ${styles.errorText} ${styles.errorBg} ${styles.errorBorder}`} role="alert">
//                 {error}
//               </div>
//             )}

//             {generatedTx && (
//               <div>
//                 <label htmlFor="generatedTx" className={`block text-sm font-medium mb-1 ${styles.outputLabel}`}>Generated Transaction (Base64)</label>
//                 <textarea
//                   id="generatedTx"
//                   readOnly
//                   value={generatedTx}
//                   className={styles.outputTextArea}
//                   placeholder="Base64 encoded transaction will appear here..."
//                 />
//                  <button
//                     onClick={() => navigator.clipboard.writeText(generatedTx)}
//                     className={styles.secondaryButton}
//                 >
//                     Copy to Clipboard
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       );
//     };

//     return (
//       <div className={`space-y-6 ${styles.containerText}`}>
//         {/* Theme Switcher Buttons */}
//         <div className="flex justify-center space-x-2 mb-4 p-2 bg-gray-100 dark:bg-gray-800 rounded">
//           <button onClick={() => setCurrentTheme('solana')} className={`px-3 py-1 text-xs rounded ${currentTheme === 'solana' ? 'bg-purple-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>Solana</button>
//           <button onClick={() => setCurrentTheme('utility')} className={`px-3 py-1 text-xs rounded ${currentTheme === 'utility' ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>Utility</button>
//           <button onClick={() => setCurrentTheme('light')} className={`px-3 py-1 text-xs rounded ${currentTheme === 'light' ? 'bg-indigo-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>Light</button>
//         </div>

//         {/* Wallet/Multisig Configuration */}
//         <div className={`border-b pb-4 ${styles.sectionBorder}`}>
//           <h2 className={`text-lg font-semibold mb-3 ${styles.headingText}`}>Wallet Configuration</h2>
//           <div className="mb-4">
//             <label htmlFor="walletType" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>Wallet/Multisig Type</label>
//             <select
//               id="walletType"
//               value={walletType}
//               onChange={(e) => setWalletType(e.target.value as WalletType)}
//               className={styles.selectClasses}
//             >
//               <option value="single">Single Hot Wallet</option>
//               <option value="squadsv3" disabled>
//                   Squads v3 (Coming Soon)
//               </option>
//               <option value="squadsv4">Squads v4</option>
//               <option value="realms" disabled>
//                   Realms (Coming Soon)
//               </option>
//             </select>
//           </div>

//           {/* Signer Inputs - Show multiple for multisigs */}
//           <div className="mb-4">
//             <label className={`block text-sm font-medium mb-1 ${styles.labelText}`}>
//               {walletType === 'single' ? 'Signer Address' : 'Signer/Member Addresses'}
//             </label>
//             {signers.map((signer, index) => (
//               <div key={index} className="flex items-center mb-2">
//                 <input
//                   type="text"
//                   value={signer}
//                   onChange={(e) => handleSignerChange(index, e.target.value)}
//                   placeholder={walletType === 'squadsv4' ? 'Squads Multisig Address' : `Signer ${index + 1}`}
//                   className={styles.inputClasses}
//                 />
//                 {walletType !== 'single' && signers.length > 1 && (
//                   <button
//                     onClick={() => handleRemoveSigner(index)}
//                     className={styles.removeButton}
//                     aria-label={`Remove Signer ${index + 1}`}
//                   >
//                     Remove
//                   </button>
//                 )}
//               </div>
//             ))}
//             {walletType !== 'single' && walletType !== 'squadsv4' && (
//                <button
//                 onClick={handleAddSigner}
//                 className={styles.addButton}
//               >
//                 + Add Signer
//               </button>
//             )}
//              {walletType === 'squadsv4' && <p className={styles.descriptionText}>Enter the Squads Multisig address above. Other signers are not needed here.</p>}
//           </div>

//           {/* Payer Input - Show for single or if needed by multisig type */}
//           {/* We might need more complex logic here depending on SDK requirements */} 
//           <div className="mb-4">
//               <label htmlFor="payer" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>Payer Address (Optional)</label>
//               <input
//                   type="text"
//                   id="payer"
//                   value={payer}
//                   onChange={(e) => setPayer(e.target.value)}
//                   placeholder="Defaults to first signer/multisig if left empty"
//                   className={`w-full ${styles.inputClasses.replace('flex-grow ', '')}`}
//               />
//               <p className={styles.descriptionText}>Address that will pay the transaction fee for creating the proposal.</p>
//           </div>
//         </div>

//         {/* Transaction Configuration */}
//         <div className={`border-b pb-4 ${styles.sectionBorder}`}>
//            <h2 className={`text-lg font-semibold mb-3 ${styles.headingText}`}>Transaction Details</h2>
//           <div className="mb-4">
//             <label htmlFor="transactionType" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>Transaction Type</label>
//             <select
//               id="transactionType"
//               value={transactionType}
//               onChange={(e) => setTransactionType(e.target.value as TransactionType)}
//               className={styles.selectClasses}
//             >
//               <option value="sendSol">Send SOL</option>
//               <option value="sendSpl" disabled>
//                   Send SPL Token (In Development)
//               </option>
//               <option value="jupiterSwap">Jupiter Swap</option>
//             </select>
//           </div>

//           {/* Render specific fields based on transaction type */}
//           {renderTransactionFields()}

//           {/* Add Priority Fee Input */}
//           <div className="mt-4">
//               <label htmlFor="priorityFee" className={`block text-sm font-medium mb-1 ${styles.labelText}`}>Priority Fee (SOL, optional)</label>
//               <input
//                   type="number"
//                   id="priorityFee"
//                   value={priorityFeeSol}
//                   onChange={(e) => setPriorityFeeSol(e.target.value)}
//                   step="0.0001"
//                   min="0"
//                   placeholder={`e.g., ${DEFAULT_PRIORITY_FEE_SOL}`}
//                   className={`w-full ${styles.inputClasses.replace('flex-grow ', '')}`}
//               />
//                <p className={styles.descriptionText}>Adds a priority fee to potentially speed up transaction inclusion.</p>
//           </div>
//         </div>

//         {/* Generate Button and Output */}
//         <div>
//           <button
//             onClick={generateTransaction}
//             className={styles.primaryButton}
//           >
//             Generate Transaction (Base64)
//           </button>

//           {error && (
//             <div className={`p-3 mb-4 text-sm border rounded-md ${styles.errorText} ${styles.errorBg} ${styles.errorBorder}`} role="alert">
//               {error}
//             </div>
//           )}

//           {generatedTx && (
//             <div>
//               <label htmlFor="generatedTx" className={`block text-sm font-medium mb-1 ${styles.outputLabel}`}>Generated Transaction (Base64)</label>
//               <textarea
//                 id="generatedTx"
//                 readOnly
//                 value={generatedTx}
//                 className={styles.outputTextArea}
//                 placeholder="Base64 encoded transaction will appear here..."
//               />
//                <button
//                   onClick={() => navigator.clipboard.writeText(generatedTx)}
//                   className={styles.secondaryButton}
//               >
//                   Copy to Clipboard
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//     );
// };

// export default CreateTab; 