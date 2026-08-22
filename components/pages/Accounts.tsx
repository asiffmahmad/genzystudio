"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';

interface SocialAccount {
  id: string;
  platform: string;
  accountName: string;
  accountType: string | null;
  connectionStatus: string;
  lastSuccessfulConnection: Date | string | null;
}

const PLATFORMS = [
  { name: 'LinkedIn', icon: '👔', color: 'bg-blue-700', hoverColor: 'hover:bg-blue-600' },
  { name: 'X', icon: '🐦', color: 'bg-gray-800', hoverColor: 'hover:bg-gray-700' },
  { name: 'Instagram', icon: '📸', color: 'bg-pink-600', hoverColor: 'hover:bg-pink-500' },
  { name: 'Facebook', icon: '📘', color: 'bg-blue-600', hoverColor: 'hover:bg-blue-500' },
];

export function Accounts() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for inline connection form
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [accountName, setAccountName] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { getAccounts } = await import('@/actions/accounts');
      const response = await getAccounts();
      if (response.success && response.data) {
        setAccounts(response.data as SocialAccount[]);
      }
    } catch (error) {
      console.error('Error fetching accounts', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectClick = (platform: string) => {
    const endpoint = platform.toLowerCase();
    window.location.href = `/api/oauth/${endpoint}/auth`;
  };

  const submitConnection = async () => {
    if (!accountName || !accessToken) {
      alert('Account Name and Access Token/Key are required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { connectAccount } = await import('@/actions/accounts');
      const response = await connectAccount(connectingPlatform!, accountName, accessToken);
      
      if (response.success) {
        setConnectingPlatform(null);
        fetchAccounts();
      } else {
        alert(response.error || 'Failed to connect');
      }
    } catch (error) {
      console.error('Error connecting account', error);
      alert('Failed to save account credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async (accountId: string, platform: string) => {
    if (!confirm(`Are you sure you want to disconnect ${platform}?`)) return;

    try {
      const { disconnectAccount } = await import('@/actions/accounts');
      const response = await disconnectAccount(accountId);
      if (response.success) {
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error disconnecting account', error);
      alert(`Failed to disconnect ${platform}`);
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading accounts...</div>;
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-xl font-medium text-gray-200 mb-2">Social Accounts (Direct Connection)</h2>
        <p className="text-gray-400 text-sm">Provide your long-lived Access Tokens or API Keys directly to connect your accounts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PLATFORMS.map(platform => {
          const connectedAccount = accounts.find(a => a.platform === platform.name);
          const isConnecting = connectingPlatform === platform.name;

          return (
            <div key={platform.name} className={`bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col transition-all ${isConnecting ? 'row-span-2 min-h-[300px]' : 'justify-between min-h-[192px]'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 ${platform.color}`}>
                    {platform.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-200">{platform.name}</h3>
                    {connectedAccount ? (
                      <span className="text-xs font-medium text-green-400">Connected</span>
                    ) : (
                      <span className="text-xs font-medium text-gray-500">Not Connected</span>
                    )}
                  </div>
                </div>
                
                {connectedAccount && (
                  <button 
                    onClick={() => handleDisconnect(connectedAccount.id, platform.name)}
                    className="text-gray-500 hover:text-red-400 transition-colors text-sm font-medium"
                  >
                    Disconnect
                  </button>
                )}
                {isConnecting && !connectedAccount && (
                  <button 
                    onClick={() => setConnectingPlatform(null)}
                    className="text-gray-500 hover:text-gray-300 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="mt-auto space-y-3">
                {connectedAccount ? (
                  <>
                    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-800">
                      <div className="text-sm font-medium text-gray-300">@{connectedAccount.accountName}</div>
                      <div className="text-xs text-gray-500 mt-1 mb-3">
                        Last connected: {new Date(connectedAccount.lastSuccessfulConnection).toLocaleDateString()}
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            setIsSubmitting(true);
                            const { testConnection } = await import('@/actions/accounts');
                            const res = await testConnection(connectedAccount.platform);
                            if (res.success) {
                              alert(`Successfully posted test message to ${connectedAccount.platform}! \nURL: ${res.url || 'Check your feed'}`);
                            } else {
                              alert(`Failed: ${res.error || JSON.stringify((res as any).details)}`);
                            }
                          } catch (err: any) {
                            alert(`Error testing post: ${err.message}`);
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        disabled={isSubmitting}
                        className="w-full py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium transition-colors"
                      >
                        {isSubmitting ? 'Testing...' : 'Test Real Post'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleConnectClick(platform.name)}
                      disabled={isSubmitting}
                      className={`w-full py-2.5 rounded-lg text-white font-medium transition-colors ${platform.color} ${platform.hoverColor} disabled:opacity-50 flex items-center justify-center gap-2`}
                    >
                      Connect {platform.name}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          setIsSubmitting(true);
                          const { testEnvConnection } = await import('@/actions/accounts');
                          const res = await testEnvConnection(platform.name);
                          if (res.success) {
                            alert(`Success! \nMessage: ${res.message}\nURL: ${res.url || ''}`);
                          } else {
                            alert(`API Response:\n${res.error || JSON.stringify((res as any).details)}`);
                          }
                        } catch (err: any) {
                          alert(`Error testing env connection: ${err.message}`);
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={isSubmitting}
                      className={`w-full py-2 rounded-lg text-gray-300 font-medium transition-colors bg-gray-800 hover:bg-gray-700 text-sm disabled:opacity-50`}
                    >
                      Test .env (No Login)
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
