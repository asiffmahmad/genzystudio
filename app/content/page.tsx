"use client";
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ContentComposer } from "@/components/pages/ContentComposer";
import { PublishedHistory } from "@/components/pages/PublishedHistory";

type Tab = 'create' | 'drafts' | 'scheduled' | 'history';

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>('create');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Sub-navigation Tabs */}
        <div className="flex border-b border-gray-800 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            ✍️ Compose Post
          </button>
          
          <button
            onClick={() => setActiveTab('drafts')}
            className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'drafts'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            📝 Drafts
          </button>

          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'scheduled'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            📅 Scheduled
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            📂 Published History
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'create' && <ContentComposer />}
        
        {activeTab === 'drafts' && (
          <PublishedHistory 
            filterStatus="DRAFT" 
            title="Draft Posts" 
          />
        )}
        
        {activeTab === 'scheduled' && (
          <PublishedHistory 
            filterStatus="SCHEDULED" 
            title="Scheduled Posts" 
          />
        )}
        
        {activeTab === 'history' && (
          <PublishedHistory 
            filterStatus="PUBLISHED" 
            title="Published Posts History" 
          />
        )}
      </div>
    </DashboardLayout>
  );
}
