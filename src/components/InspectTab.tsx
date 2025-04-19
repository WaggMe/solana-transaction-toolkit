// Define Solana Native Theme Classes (Subset needed)
const styles = {
    infoBoxBorder: 'border-teal-200 dark:border-teal-800',
    infoBoxBg: 'bg-teal-50 dark:bg-teal-900/30',
    infoBoxText: 'text-teal-700 dark:text-teal-300',
    infoBoxCode: 'bg-teal-200 dark:bg-teal-700/50',
    headingText: 'text-gray-800 dark:text-gray-100',
    bodyText: 'text-gray-600 dark:text-gray-400',
    linkClasses: "text-purple-600 dark:text-teal-400 hover:underline",
};

const InspectTab = () => {
  return (
    <div className="space-y-4">
        {/* Informational Note */}
        <div className={`p-4 border rounded-md text-sm ${styles.infoBoxBorder} ${styles.infoBoxBg} ${styles.infoBoxText}`}>
            <h3 className="font-semibold mb-2">Where to find a Base64 Transaction Message:</h3>
            <ul className="list-disc list-outside pl-5 space-y-1 text-xs">
                <li>Generate one using the 'Create' tab in this toolkit.</li>
                <li>Enable developer options in wallets (Phantom, Solflare) to view before signing on other sites.</li>
                <li>Use the <code className={`px-1 rounded text-xs font-mono ${styles.infoBoxCode}`}>--dump-transaction-message</code> flag with the Solana CLI.</li>
                 <li>
                    In Rust: Add <code className={`px-1 rounded text-xs font-mono ${styles.infoBoxCode}`}>base64 = "0.21"</code> to dependencies and use 
                    <code className={`block p-1 rounded text-xs font-mono mt-1 overflow-x-auto ${styles.infoBoxCode}`}>println!("", base64::encode(&transaction.message_data()));</code>
                 </li>
                 <li>
                    In JavaScript/TypeScript: Use 
                    <code className={`block p-1 rounded text-xs font-mono mt-1 overflow-x-auto ${styles.infoBoxCode}`}>console.log(tx.serializeMessage().toString("base64"));</code>
                 </li>
            </ul>
        </div>

        {/* Existing Content */}
        <div>
            <h2 className={`text-xl font-semibold mb-4 ${styles.headingText}`}>Recommended Inspector</h2>
            <p className={styles.bodyText}>
                For detailed transaction inspection and verification, we recommend using SolanaFM:
            </p>
            <a
                href="https://solana.fm/inspector"
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-2 inline-block ${styles.linkClasses}`}
            >
                solana.fm/inspector
            </a>
         </div>
    </div>
  );
};

export default InspectTab; 