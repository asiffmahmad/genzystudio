import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface AiSuggestion {
  id: string;
  title: string;
  topic: string;
  whyItMatters: string;
  suggestedPlatform: string;
  suggestedHook: string;
  suggestedContent: string;
  suggestedHashtags: string;
  potentialAudience: string;
  status: string;
  createdAt: string;
}

export function AiSuggestions() {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [topicInput, setTopicInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/ai/suggestions');
      if (response.data.success) {
        setSuggestions(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching suggestions', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!topicInput.trim()) return;
    
    setGenerating(true);
    try {
      const response = await axios.post('http://localhost:5001/api/ai/generate', { topic: topicInput });
      if (response.data.success) {
        setTopicInput('');
        fetchSuggestions();
      }
    } catch (error: any) {
      console.error('Error generating suggestion', error);
      alert(error.response?.data?.error || 'Failed to generate content. Please check your GROQ_API_KEY.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUseSuggestion = async (id: string) => {
    try {
      const response = await axios.post(`http://localhost:5001/api/ai/suggestions/${id}/use`);
      if (response.data.success) {
        navigate('/content');
      }
    } catch (error) {
      console.error('Error using suggestion', error);
      alert('Failed to convert suggestion to content draft');
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading AI suggestions...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-medium text-gray-200 mb-2">AI Brainstorming & Suggestions</h2>
        <p className="text-gray-400 text-sm">Powered by Groq. Enter a topic to get high-converting social media content suggestions.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex gap-4">
        <input 
          type="text"
          value={topicInput}
          onChange={(e) => setTopicInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          placeholder="e.g. Why TypeScript is replacing JavaScript in enterprise"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500"
          disabled={generating}
        />
        <button 
          onClick={handleGenerate}
          disabled={generating || !topicInput.trim()}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
        >
          {generating ? 'Generating...' : '✨ Generate'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {suggestions.map(suggestion => (
          <div key={suggestion.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg text-gray-200">{suggestion.title}</h3>
                  <div className="text-xs text-gray-500 mt-1">Topic: {suggestion.topic} • Platform: {suggestion.suggestedPlatform}</div>
                </div>
                {suggestion.status === 'USED' && (
                  <span className="text-xs bg-gray-800 text-gray-500 px-2 py-1 rounded">Used</span>
                )}
              </div>
              
              <div className="bg-gray-800/50 p-4 rounded-lg text-sm text-gray-300 whitespace-pre-wrap">
                <span className="font-bold text-gray-400">Hook:</span> {suggestion.suggestedHook}
                <br /><br />
                {suggestion.suggestedContent}
              </div>
              
              <div className="text-sm text-gray-500">
                <span className="text-blue-400">{suggestion.suggestedHashtags}</span>
              </div>
            </div>
            
            <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-gray-800 pt-4 md:pt-0 md:pl-6 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Audience</h4>
                <p className="text-sm text-gray-300">{suggestion.potentialAudience}</p>
                
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4">Why it matters</h4>
                <p className="text-sm text-gray-300">{suggestion.whyItMatters}</p>
              </div>
              
              <button 
                onClick={() => handleUseSuggestion(suggestion.id)}
                disabled={suggestion.status === 'USED'}
                className="w-full py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-50 text-gray-200 rounded-lg transition-colors font-medium text-sm"
              >
                {suggestion.status === 'USED' ? 'Already Used' : 'Use this content'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
