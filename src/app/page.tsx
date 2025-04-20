'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Explicitly use the default export for dynamic imports
const CreateTab = dynamic(() => import('@/components/CreateTab').then(mod => mod.default), { ssr: false });
const ExecuteTab = dynamic(() => import('@/components/ExecuteTab').then(mod => mod.default), { ssr: false });
// InspectTab likely doesn't need dynamic import unless it uses client hooks/APIs
import InspectTab from '@/components/InspectTab';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'create' | 'inspect' | 'execute'>('create');

  // Memoize tab content to avoid re-rendering on tab switch if not needed
  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'create':
        return <CreateTab />;
      case 'inspect':
        return <InspectTab />;
      case 'execute':
        return <ExecuteTab />;
      default:
        return null;
    }
  }, [activeTab]); // Re-render only when activeTab changes

  // Define Tab Button Classes for Solana Theme
  const activeTabClasses = "bg-gradient-to-r from-purple-600 to-teal-500 text-white";
  const inactiveTabClasses = "text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700";
  const commonTabClasses = "py-3 px-6 text-center font-medium transition-colors duration-150";

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 lg:p-24 bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
          Solana Transaction Toolkit
        </h1>
      </div>

      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-xl overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            className={`${commonTabClasses} rounded-tl-lg ${activeTab === 'create' ? activeTabClasses : inactiveTabClasses}`}
            onClick={() => setActiveTab('create')}
          >
            Create
          </button>
          <button
            className={`${commonTabClasses} ${activeTab === 'inspect' ? activeTabClasses : inactiveTabClasses}`}
            onClick={() => setActiveTab('inspect')}
          >
            Inspect
          </button>
          <button
            className={`${commonTabClasses} rounded-tr-lg ${activeTab === 'execute' ? activeTabClasses : inactiveTabClasses}`}
            onClick={() => setActiveTab('execute')}
          >
            Execute
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Render the memoized content */}
          {tabContent}
        </div>
      </div>
    </main>
  );
}
