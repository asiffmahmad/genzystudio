"use client";
import { useEffect, useState } from 'react';
import { getContents, deleteContent, publishContent, updateContent, updateScheduledTime, getScheduledTime } from '@/actions/content';

interface PublishedHistoryProps {
  filterStatus?: 'PUBLISHED' | 'DRAFT' | 'SCHEDULED';
  title?: string;
}

export function PublishedHistory({ filterStatus = 'PUBLISHED', title = 'Published Posts History' }: PublishedHistoryProps) {
  const [postedContents, setPostedContents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // View Modal States
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewPost, setViewPost] = useState<any | null>(null);
  const [viewScheduledAt, setViewScheduledAt] = useState<string>('');

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    const duration = type === 'error' ? 8000 : 4000;
    setTimeout(() => {
      setNotification(prev => prev && prev.message === message ? null : prev);
    }, duration);
  };

  const fetchPublished = async () => {
    setIsLoading(true);
    try {
      const response = await getContents();
      if (response.success && response.data) {
        setPostedContents(response.data.filter((item: any) => item.status === filterStatus));
      } else {
        showNotification(response.error || 'Failed to fetch posts', 'error');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      showNotification('Failed to fetch posts', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPublished();
  }, [filterStatus]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post from the database? This action is permanent.')) {
      return;
    }
    setPostedContents(prev => prev.filter(post => post.id !== id));
    try {
      const response = await deleteContent(id);
      if (response.success) {
        showNotification('Post deleted successfully from database!', 'success');
        fetchPublished();
      } else {
        showNotification(response.error || 'Failed to delete post', 'error');
        fetchPublished();
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      showNotification('Failed to delete post', 'error');
      fetchPublished();
    }
  };

  const handlePublishNow = async (id: string) => {
    showNotification('Publishing post now...', 'info');
    try {
      const response = await publishContent(id);
      if (response.success && response.results) {
        const hasFailures = response.results.some((r: any) => !r.success);
        const resultsText = response.results.map((r: any) => `${r.platform}: ${r.success ? 'Success ✅' : 'Failed ❌ (' + r.error + ')'}`).join('\n');
        showNotification(`Publishing completed!\n\n${resultsText}`, hasFailures ? 'error' : 'success');
        fetchPublished();
      } else {
        showNotification(response.error || 'Failed to publish post', 'error');
      }
    } catch (error) {
      console.error('Error publishing post:', error);
      showNotification('Failed to publish post', 'error');
    }
  };

  const handleOpenView = async (post: any) => {
    setViewPost(post);
    setViewScheduledAt('');
    setShowViewModal(true);

    if (post.status === 'SCHEDULED') {
      try {
        const timeRes = await getScheduledTime(post.id);
        if (timeRes.success && timeRes.data) {
          setViewScheduledAt(new Date(timeRes.data).toLocaleString());
        }
      } catch (err) {
        console.error('Failed to get scheduled time', err);
      }
    }
  };

  const handleOpenEdit = async (post: any) => {
    setEditingPostId(post.id);
    setEditTitle(post.title || '');
    setEditContent(post.content || '');
    setEditScheduledAt('');
    setShowEditModal(true);

    if (filterStatus === 'SCHEDULED') {
      try {
        const timeRes = await getScheduledTime(post.id);
        if (timeRes.success && timeRes.data) {
          const date = new Date(timeRes.data);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
          setEditScheduledAt(localDateTime);
        }
      } catch (err) {
        console.error('Failed to get scheduled time', err);
      }
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPostId) return;
    setIsSavingEdit(true);
    try {
      const contentRes = await updateContent(editingPostId, {
        title: editTitle,
        content: editContent
      });

      if (!contentRes.success) {
        showNotification(contentRes.error || 'Failed to update content', 'error');
        setIsSavingEdit(false);
        return;
      }

      if (filterStatus === 'SCHEDULED' && editScheduledAt) {
        const isoString = new Date(editScheduledAt).toISOString();
        const scheduleRes = await updateScheduledTime(editingPostId, isoString);
        if (!scheduleRes.success) {
          showNotification(scheduleRes.error || 'Failed to update scheduled time', 'error');
          setIsSavingEdit(false);
          return;
        }
      }

      showNotification('Post updated successfully!', 'success');
      setShowEditModal(false);
      fetchPublished();
    } catch (err) {
      console.error('Save Edit Error:', err);
      showNotification('Failed to update post details', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'PUBLISHED') return 'bg-emerald-500/20 text-emerald-400';
    if (status === 'SCHEDULED') return 'bg-amber-500/20 text-amber-400';
    return 'bg-blue-500/20 text-blue-400';
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-xl font-medium text-gray-200 mb-6">{title}</h2>
      
      {isLoading ? (
        <div className="text-gray-400 py-12 text-center">Loading from database...</div>
      ) : postedContents.length > 0 ? (
        <div className="space-y-6">
          {postedContents.map((post) => (
            <div key={post.id} className="border border-gray-800 rounded-xl p-5 bg-gray-950/50 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <h4 
                    onClick={() => handleOpenView(post)}
                    className="font-semibold text-gray-200 hover:text-blue-400 cursor-pointer transition-colors"
                  >
                    {post.title}
                  </h4>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(post.status)}`}>
                    {post.status}
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
                
                <div className="text-xs text-gray-500">
                  Created: {new Date(post.createdAt).toLocaleString()}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 self-stretch md:self-auto justify-end">
                <button
                  onClick={() => handleOpenView(post)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-xs flex items-center justify-center"
                >
                  👁️ View
                </button>
                {(filterStatus === 'DRAFT' || filterStatus === 'SCHEDULED') && (
                  <>
                    <button
                      onClick={() => handlePublishNow(post.id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-xs flex items-center justify-center"
                    >
                      🚀 Publish Now
                    </button>
                    <button
                      onClick={() => handleOpenEdit(post)}
                      className="px-3 py-1.5 bg-gray-800 border border-gray-750 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors font-medium text-xs flex items-center justify-center"
                    >
                      ✏️ Edit
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDelete(post.id)}
                  className="px-3 py-1.5 bg-red-950/60 border border-red-800/40 hover:bg-red-900 hover:text-white text-red-300 rounded-lg transition-colors font-medium text-xs flex items-center justify-center"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-400 py-12 text-center">No posts found with this status.</div>
      )}

      {/* View Post Modal */}
      {showViewModal && viewPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="text-lg font-medium text-gray-200">Post Details</h3>
              <button 
                onClick={() => setShowViewModal(false)}
                className="text-gray-500 hover:text-gray-300 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-300">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Title</label>
                <div className="bg-gray-950 border border-gray-800 px-4 py-2.5 rounded-lg text-gray-200 font-medium">{viewPost.title}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Content</label>
                <div className="bg-gray-950 border border-gray-800 px-4 py-3 rounded-lg text-gray-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">{viewPost.content || <span className="text-gray-600 italic">No content.</span>}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                  <div className="bg-gray-950 border border-gray-800 px-4 py-2 rounded-lg text-gray-200 capitalize font-medium">{viewPost.status}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Platforms</label>
                  <div className="bg-gray-950 border border-gray-800 px-4 py-2 rounded-lg text-gray-200 flex flex-wrap gap-1">
                    {viewPost.variants?.map((v: any) => v.platform).join(', ') || 'None'}
                  </div>
                </div>
              </div>

              {viewPost.status === 'SCHEDULED' && viewScheduledAt && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Scheduled At</label>
                  <div className="bg-gray-950 border border-gray-800 px-4 py-2 rounded-lg text-amber-400 font-semibold">{viewScheduledAt}</div>
                </div>
              )}

              <div className="flex gap-3 justify-end border-t border-gray-800 pt-4 mt-2">
                <button 
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="text-lg font-medium text-gray-200">
                Edit {filterStatus === 'SCHEDULED' ? 'Scheduled' : 'Draft'} Post
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-300 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                <input 
                  type="text" 
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Content</label>
                <textarea 
                  rows={6}
                  required
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              {filterStatus === 'SCHEDULED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Scheduled Date & Time</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={editScheduledAt}
                    onChange={(e) => setEditScheduledAt(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              )}

              <div className="flex gap-3 justify-end border-t border-gray-800 pt-4 mt-2">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notification && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-start gap-3 max-w-md px-4 py-3 rounded-lg border shadow-lg backdrop-blur-md transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' 
            : notification.type === 'error' 
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200' 
              : 'bg-blue-950/90 border-blue-500/50 text-blue-200'
        }`}>
          <div className="text-lg leading-none mt-0.5">
            {notification.type === 'success' ? '✓' : notification.type === 'error' ? '❌' : 'ℹ'}
          </div>
          <div className="text-sm font-medium whitespace-pre-line flex-1 leading-normal">{notification.message}</div>
          <button onClick={() => setNotification(null)} className="text-xs opacity-50 hover:opacity-100 transition-opacity p-0.5 ml-2">✕</button>
        </div>
      )}
    </div>
  );
}
