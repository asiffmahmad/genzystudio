"use client";
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ContentComposer } from "@/components/pages/ContentComposer";
import { PublishedHistory } from "@/components/pages/PublishedHistory";

export default function Page() {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Sub-navigation Tabs */}
        <div className="flex border-b border-gray-800 gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-400 font-medium'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            ✍️ Compose Post
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-400 font-medium'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            📂 Published History
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'create' ? (
          <ContentComposer />
        ) : (
          <PublishedHistory />
        )}
      </div>
    </DashboardLayout>
  );
}
