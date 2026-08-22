"use client";
import { useEffect, useState } from 'react';
import { getContents, deleteContent } from '@/actions/content';

export function PublishedHistory() {
  const [postedContents, setPostedContents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(prev => prev && prev.message === message ? null : prev);
    }, 4000);
  };

  const fetchPublished = async () => {
    setIsLoading(true);
    try {
      const response = await getContents();
      if (response.success && response.data) {
        // Filter for PUBLISHED status
        setPostedContents(response.data.filter((item: any) => item.status === 'PUBLISHED'));
      } else {
        showNotification(response.error || 'Failed to fetch published posts', 'error');
      }
    } catch (error) {
      console.error('Error fetching published posts:', error);
      showNotification('Failed to fetch published posts', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPublished();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post from the database? This action is permanent and cannot be undone.')) {
      return;
    }
    try {
      const response = await deleteContent(id);
      if (response.success) {
        showNotification('Post deleted successfully from database!', 'success');
        fetchPublished();
      } else {
        showNotification(response.error || 'Failed to delete post', 'error');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      showNotification('Failed to delete post', 'error');
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-xl font-medium text-gray-200 mb-6">Published Posts History</h2>
      
      {isLoading ? (
        <div className="text-gray-400 py-12 text-center">Loading published history from database...</div>
      ) : postedContents.length > 0 ? (
        <div className="space-y-6">
          {postedContents.map((post) => (
            <div key={post.id} className="border border-gray-800 rounded-xl p-5 bg-gray-950/50 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-gray-200">{post.title}</h4>
                  <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded-full">
                    Published
                  </span>
                </div>
                <p className="text-sm text-gray-300 line-clamp-3 whitespace-pre-wrap">{post.content}</p>
                
                {post.variants && post.variants.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {post.variants.map((v: any) => (
                      <span key={v.id} className="text-[10px] bg-gray-800 border border-gray-700 text-gray-300 px-2 py-0.5 rounded">
                        {v.platform}
                      </span>
                    ))}
                  </div>
                )}
                
                {post.variants?.some((v: any) => v.image) && (
                  <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                    🖼️ Media attached
                  </div>
                )}
                
                <div className="text-xs text-gray-500">
                  Published: {new Date(post.createdAt).toLocaleString()}
                </div>
              </div>
              
              <button
                onClick={() => handleDelete(post.id)}
                className="px-4 py-2 bg-red-950/60 border border-red-800/40 hover:bg-red-900 hover:text-white text-red-300 rounded-lg transition-colors font-medium text-sm flex items-center gap-2 self-stretch md:self-auto justify-center"
              >
                🗑️ Delete from DB
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-400 py-12 text-center">No published posts found in the database.</div>
      )}

      {notification && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-start gap-3 max-w-md px-4 py-3 rounded-lg border shadow-lg backdrop-blur-md transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' 
            : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
        }`}>
          <div className="text-lg leading-none mt-0.5">
            {notification.type === 'success' ? '✓' : '❌'}
          </div>
          <div className="text-sm font-medium whitespace-pre-line flex-1 leading-normal">{notification.message}</div>
          <button onClick={() => setNotification(null)} className="text-xs opacity-50 hover:opacity-100 transition-opacity p-0.5 ml-2">✕</button>
        </div>
      )}
    </div>
  );
}
