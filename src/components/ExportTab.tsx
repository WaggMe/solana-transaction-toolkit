import { useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';
import { ArrowUpCircleIcon, ArrowDownCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

interface Transaction {
  signature: string;
  blockNumber: number;
  status: 'success' | 'failed';
  timestamp: number;
}

interface ExplorerLinkProps {
  signature: string;
  type: 'solscan' | 'solanaFm' | 'explorer';
}

const ExplorerLink = ({ signature, type }: ExplorerLinkProps) => {
  const explorerConfig = {
    solscan: {
      url: `https://solscan.io/tx/${signature}`,
      logo: '/solscan.png',
      alt: 'View on Solscan'
    },
    solanaFm: {
      url: `https://solana.fm/tx/${signature}`,
      logo: '/solanafm.png',
      alt: 'View on Solana.fm'
    },
    explorer: {
      url: `https://explorer.solana.com/tx/${signature}`,
      logo: '/solanaexplorer.png',
      alt: 'View on Solana Explorer'
    }
  };

  return (
    <a
      href={explorerConfig[type].url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center hover:opacity-80 transition-opacity duration-200"
      title={explorerConfig[type].alt}
    >
      <Image
        src={explorerConfig[type].logo}
        alt={explorerConfig[type].alt}
        width={12}
        height={12}
        className="h-3 w-auto"
      />
    </a>
  );
};

export default function ExportTab() {
  const { connection } = useConnection();
  const [customRpc, setCustomRpc] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [programAddress, setProgramAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ 
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };

  const handleSearch = async (loadMore = false) => {
    try {
      if (!loadMore) {
        setIsLoading(true);
        setError(null);
        setTransactions([]);
        setLastSignature(null);
        setHasMore(true);
      } else {
        setIsLoadingMore(true);
      }

      // Use custom RPC if provided, otherwise use default connection
      const activeConnection = customRpc 
        ? new Connection(customRpc, { commitment: 'confirmed' })
        : connection;

      // Validate wallet address
      let pubKey: PublicKey;
      try {
        pubKey = new PublicKey(walletAddress);
      } catch {
        throw new Error('Invalid wallet address');
      }

      // Validate program address if provided
      let programPubKey: PublicKey | undefined;
      if (programAddress) {
        try {
          programPubKey = new PublicKey(programAddress);
        } catch {
          throw new Error('Invalid program address');
        }
      }

      // Fetch signatures
      const signatures = await activeConnection.getSignaturesForAddress(
        pubKey,
        { 
          limit: 50,
          ...(loadMore && lastSignature ? { before: lastSignature } : {})
        },
      ).catch(err => {
        console.error('Signature fetch error:', err);
        throw new Error('Failed to fetch transaction signatures. Please check your wallet address and try again.');
      });

      if (!signatures || signatures.length === 0) {
        if (!loadMore) {
          setTransactions([]);
          throw new Error('No transactions found for this address');
        } else {
          setHasMore(false);
          return;
        }
      }

      // Store the last signature for pagination
      setLastSignature(signatures[signatures.length - 1].signature);
      setHasMore(signatures.length === 50);

      // Fetch transaction details
      const txPromises = signatures.map(async (sig) => {
        try {
          const tx = await activeConnection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx) return null;

          // Filter by program if specified
          if (programPubKey) {
            const hasProgram = tx.transaction.message.compiledInstructions.some(
              (ix) => tx.transaction.message.staticAccountKeys[ix.programIdIndex].toString() === programPubKey?.toString()
            ) || tx.meta?.innerInstructions?.some(
              (inner) => inner.instructions.some(
                (ix) => tx.transaction.message.staticAccountKeys[ix.programIdIndex].toString() === programPubKey?.toString()
              )
            );
            if (!hasProgram) return null;
          }

          return {
            signature: sig.signature,
            blockNumber: tx.slot,
            status: tx.meta?.err ? 'failed' : 'success',
            timestamp: sig.blockTime ? sig.blockTime * 1000 : 0,
          };
        } catch (err) {
          console.error('Transaction fetch error:', err);
          return null; // Skip failed transactions instead of failing the whole batch
        }
      });

      const results = (await Promise.all(txPromises)).filter((tx): tx is Transaction => tx !== null);
      
      if (results.length === 0 && programAddress && !loadMore) {
        throw new Error('No transactions found involving the specified program');
      }

      setTransactions(prev => loadMore ? [...prev, ...results] : results);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Signature', 'Block Number', 'Status', 'Timestamp'],
      ...transactions.map(tx => [
        tx.signature,
        tx.blockNumber.toString(),
        tx.status,
        new Date(tx.timestamp).toISOString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${walletAddress.slice(0, 8)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Custom RPC (optional)
          </label>
          <input
            type="text"
            value={customRpc}
            onChange={(e) => setCustomRpc(e.target.value)}
            placeholder="https://api.mainnet-beta.solana.com"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Wallet Address *
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter wallet public key"
            required
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Program Address (optional)
          </label>
          <div className="relative">
            <input
              type="text"
              value={programAddress}
              onChange={(e) => setProgramAddress(e.target.value)}
              placeholder="Enter program public key"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 pr-10"
            />
            {programAddress && (
              <button
                onClick={() => setProgramAddress('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                title="Clear program address"
              >
                <XMarkIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setProgramAddress('BUDDYtQp7Di1xfojiCSVDksiYLQx511DPdj2nbtG9Yu5')}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 dark:text-purple-300 dark:bg-purple-900/50 dark:hover:bg-purple-900 transition-colors duration-200"
            >
              Buddy
            </button>
            <button
              onClick={() => setProgramAddress('JUP6LkbZbjS1jKKwapdHF3G6KdF2nZCKKfRkz9qx86E')}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 dark:text-purple-300 dark:bg-purple-900/50 dark:hover:bg-purple-900 transition-colors duration-200"
            >
              Jupiter
            </button>
            <button
              onClick={() => setProgramAddress('CTMAxxk6XQxGZKE8KL3SdnssBWf4NvBxtJvA5DJqR3S')}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 dark:text-purple-300 dark:bg-purple-900/50 dark:hover:bg-purple-900 transition-colors duration-200"
            >
              Citrus
            </button>
          </div>
        </div>

        <button
          onClick={() => handleSearch()}
          disabled={isLoading || !walletAddress}
          className={`w-full py-2 px-4 rounded-lg font-medium text-white 
            ${isLoading || !walletAddress
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600'
            }`}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>

        {error && (
          <div className="text-red-500 text-sm mt-2">
            {error}
          </div>
        )}
      </div>

      {transactions.length > 0 && !isLoading && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Found {transactions.length} transaction{transactions.length === 1 ? '' : 's'}
              </div>
              {hasMore && (
                <button
                  onClick={() => handleSearch(true)}
                  disabled={isLoadingMore}
                  className="text-sm px-3 py-1 rounded-md font-medium text-white bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? 'Loading more...' : 'Load More'}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Signature
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Block
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.map((tx) => (
                  <tr key={tx.signature}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <span>{tx.signature.slice(0, 16)}...</span>
                        <div className="flex gap-1.5 ml-2">
                          <ExplorerLink signature={tx.signature} type="solscan" />
                          <ExplorerLink signature={tx.signature} type="solanaFm" />
                          <ExplorerLink signature={tx.signature} type="explorer" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {tx.blockNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tx.status === 'success'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleExport}
            className="w-full py-2 px-4 rounded-lg font-medium text-white bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600"
          >
            Export to CSV
          </button>

          {/* Navigation Arrows */}
          <div className="fixed bottom-6 right-6 flex flex-col gap-2">
            <button
              onClick={scrollToTop}
              className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              title="Scroll to top"
            >
              <ArrowUpCircleIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </button>
            <button
              onClick={scrollToBottom}
              className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              title="Scroll to bottom"
            >
              <ArrowDownCircleIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 