'use client'; // Accessing process.env requires client component

import React from 'react';

const Footer = () => {
    const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';

    return (
        <footer className="w-full max-w-4xl mx-auto mt-8 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
            Solana Transaction Toolkit - Version: {appVersion}
        </footer>
    );
};

export default Footer; 