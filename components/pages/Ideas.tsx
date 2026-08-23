"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getIdeas, createIdea, convertIdeaToContent } from '@/actions/ideas';

interface Idea {
  id: string;
  title: string;
  description: string;
  status: string;
  tags: string;
  createdAt: Date | string;
}

export function Ideas() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');

  const router = useRouter();

  useEffect(() => {
    fetchIdeas();
  }, []);

  const fetchIdeas = async () => {
    try {
      const response = await getIdeas();
      if (response.success && response.data) {
        setIdeas(response.data as Idea[]);
      }
    } catch (error) {
      console.error('Error fetching ideas', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async (ideaId: string) => {
    try {
      const response = await convertIdeaToContent(ideaId);
      if (response.success) {
        router.push('/content');
      } else {
        alert(response.error || 'Failed to convert idea');
      }
    } catch (error) {
      console.error('Error converting idea', error);
      alert('Failed to convert idea to content');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Title is required');
      return;
    }
    try {
      const response = await createIdea({
        title,
        description,
        tags,
        sourceUrl,
        notes
      });
      if (response.success) {
        setShowModal(false);
        setTitle('');
        setDescription('');
        setTags('');
        setSourceUrl('');
        setNotes('');
        fetchIdeas();
      } else {
        alert(response.error || 'Failed to create idea');
      }
    } catch (error) {
      console.error('Error creating idea', error);
      alert('Failed to create idea');
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading ideas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium text-gray-200">Idea Management</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          New Idea
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ideas.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
            No ideas yet. Start brainstorming!
          </div>
        )}
        
        {ideas.map(idea => (
          <div key={idea.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-200 line-clamp-1">{idea.title}</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${
                idea.status === 'USED' ? 'bg-gray-800 text-gray-500' : 
                idea.status === 'READY' ? 'bg-green-500/10 text-green-400' : 
                'bg-blue-500/10 text-blue-400'
              }`}>
                {idea.status}
              </span>
            </div>
            
            <p className="text-sm text-gray-400 line-clamp-3 mb-4 flex-1">
              {idea.description || 'No description provided.'}
            </p>
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-800">
              <span className="text-xs text-gray-500">
                {new Date(idea.createdAt).toLocaleDateString()}
              </span>
              {idea.status !== 'USED' && (
                <button 
                  onClick={() => handleConvert(idea.id)}
                  className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                >
                  Convert to Content →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New Idea Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="text-lg font-medium text-gray-200">Add New Idea</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-300 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Title *</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 5 Coding tips for beginners"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <textarea 
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this idea about?"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Tags</label>
                  <input 
                    type="text" 
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. coding, beginners"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Source URL</label>
                  <input 
                    type="url" 
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
                <textarea 
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional brainstorming notes..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end border-t border-gray-800 pt-4 mt-2">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Save Idea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
