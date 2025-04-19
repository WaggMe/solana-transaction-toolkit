/** @type {import('next').NextConfig} */

// Check if running in GitHub Actions environment
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const repoName = 'solana-transaction-toolkit'; // Your repository name

let nextConfig = {
    // Base config for both local dev and Actions
    transpilePackages: [
        '@solana/wallet-adapter-react',
        '@solana/wallet-adapter-base',
        // Removed web3 and spl-token as we'll try dynamic imports
        // '@solana/web3.js',
        // '@solana/spl-token',
        // Add other potentially problematic packages here if needed
        // '@sqds/multisig',
        // '@solana/spl-governance',
    ],
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'raw.githubusercontent.com',
                // You can add port and pathname if needed, but hostname is usually sufficient
            },
            // Add Jupiter static assets hostname
            {
                 protocol: 'https',
                hostname: 'static.jup.ag',
            },
        ],
    },
    webpack: (config, { isServer }) => {
        // Ensure Buffer is available
        config.resolve.fallback = {
            ...config.resolve.fallback,
            "buffer": require.resolve('buffer/'), // Map "buffer" to the installed package
            "crypto": false, // Provide empty modules for Node built-ins not needed in browser
            "stream": false,
            "path": false,
            "fs": false, // Prevent errors from packages trying to access fs
            "os": false,
             "net": false,
             "tls": false,
        };

        // Add rule to handle .node files if any dependencies use them (less common now)
        config.module.rules.push({
            test: /\.node$/,
            loader: 'node-loader',
        });

        return config;
    },
};

// Add GitHub Pages specific config only when building in Actions
if (isGithubActions) {
    console.log('\n>>> Building for GitHub Pages (output: export, basePath configured) <<\n');
    nextConfig.output = 'export';
    nextConfig.basePath = `/${repoName}`;
    // Optional: Disable standalone output if export is used
    // nextConfig.outputStandalone = false;
}

module.exports = nextConfig; 