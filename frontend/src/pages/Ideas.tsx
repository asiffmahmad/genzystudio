import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Idea {
  id: string;
  title: string;
  description: string;
  status: string;
  tags: string;
  createdAt: string;
}

export function Ideas() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchIdeas();
  }, []);

  const fetchIdeas = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/ideas');
      if (response.data.success) {
        setIdeas(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching ideas', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async (ideaId: string) => {
    try {
      const response = await axios.post(`http://localhost:5001/api/ideas/${ideaId}/convert`);
      if (response.data.success) {
        navigate('/content'); // Navigate to content composer
      }
    } catch (error) {
      console.error('Error converting idea', error);
      alert('Failed to convert idea to content');
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading ideas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium text-gray-200">Idea Management</h2>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
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
    </div>
  );
}
