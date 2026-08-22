"use client";
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';

interface Page {
  id: string;
  name: string;
  category: string;
  hasInstagram?: boolean;
  instagramUsername?: string;
}

export function MetaPageSelectInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Strip hash fragment commonly added by Facebook (#_=_)
  let rawSessionId = searchParams.get('sessionId');
  if (rawSessionId && rawSessionId.includes('#')) {
    rawSessionId = rawSessionId.split('#')[0];
  }
  const sessionId = rawSessionId;
  
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectingPageId, setSelectingPageId] = useState<string | null>(null);

  useEffect(() => {
    // If there is a hash in the actual window location, clean the URL cleanly without reloading
    if (window.location.hash === '#_=_') {
      window.history.replaceState('', document.title, window.location.pathname + window.location.search);
    }

    if (!sessionId) {
      setError('No Meta OAuth session found.');
      setLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        const res = await axios.get(`/api/oauth/facebook/get-session?sessionId=${sessionId}`);
        const response = res.data;
        if (response.success && response.pages) {
          setPages(response.pages as Page[]);
        } else {
          setError(response.error || 'Session expired/invalid');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load session details.');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  const handleSelectPage = async (pageId: string) => {
    setSelectingPageId(pageId);
    try {
      const res = await axios.post('/api/oauth/facebook/select-page', {
        sessionId: sessionId!,
        pageId: pageId,
      });
      const response = res.data;
      if (response.success) {
        router.push('/accounts');
      } else {
        alert(response.error || 'Failed to connect page');
        setSelectingPageId(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to process page selection.');
      setSelectingPageId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="text-blue-400 font-medium text-lg mb-2">Connecting to Meta...</div>
        <div className="text-gray-400">Loading available Pages...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-16 bg-gray-900 border border-gray-800 rounded-xl p-8 text-center shadow-lg">
        <div className="w-12 h-12 bg-red-900/30 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          !
        </div>
        <h2 className="text-xl font-medium text-white mb-3">Connection Failed</h2>
        <div className="text-gray-400 mb-8">{error}</div>
        <button
          onClick={() => router.push('/accounts')}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Connect Meta
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-8 pb-6 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-2xl font-semibold text-white mb-2">Connect Meta Account</h2>
          <p className="text-gray-400">
            Choose the Facebook Page you want GENZYSTUDIO to manage.
          </p>
        </div>

        <div className="p-8">
          {pages.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-gray-700 rounded-xl text-gray-500">
              No pages found. You must create a Facebook Page first.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Available Pages</div>
              {pages.map(page => (
                <div 
                  key={page.id}
                  className="flex items-center justify-between p-5 rounded-xl border border-gray-700 bg-gray-800/30 hover:border-blue-500/50 hover:bg-blue-900/10 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-900/50 rounded-lg flex items-center justify-center text-blue-400">
                      📘
                    </div>
                    <div>
                      <div className="font-medium text-gray-100 text-lg">{page.name}</div>
                      <div className="text-sm text-green-400 mt-0.5 flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                          Facebook Page
                        </div>
                        {page.hasInstagram && (
                          <div className="flex items-center gap-1 text-pink-400 ml-2">
                            <span className="text-xs">📸</span>
                            <span>@{page.instagramUsername || 'Instagram'} Linked</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectPage(page.id)}
                    disabled={selectingPageId === page.id}
                    className="px-6 py-2.5 bg-gray-800 hover:bg-blue-600 border border-gray-700 hover:border-blue-500 disabled:opacity-50 text-gray-300 hover:text-white font-medium rounded-lg transition-all"
                  >
                    {selectingPageId === page.id ? 'Connecting...' : 'Select'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-gray-800 bg-gray-900/50 flex justify-end">
          <button
            onClick={() => router.push('/accounts')}
            className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
          >
            Cancel and Return
          </button>
        </div>
      </div>
    </div>
  );
}

export function MetaPageSelect() {
  return (
    <Suspense fallback={<div className="text-gray-400">Loading...</div>}>
      <MetaPageSelectInner />
    </Suspense>
  );
}
