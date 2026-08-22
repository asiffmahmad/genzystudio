import { useEffect, useState } from 'react';
import axios from 'axios';

interface DashboardStats {
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  draftPosts: number;
  totalReach: number;
  engagementRate: number;
  followers: number;
  growth: string;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingPosts, setUpcomingPosts] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/dashboard');
        if (response.data.success) {
          setStats(response.data.stats);
          setUpcomingPosts(response.data.upcoming || []);
          setRecentPosts(response.data.recent || []);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return <div className="text-gray-400">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Posts" value={stats?.totalPosts} />
        <StatCard title="Published" value={stats?.publishedPosts} />
        <StatCard title="Scheduled" value={stats?.scheduledPosts} />
        <StatCard title="Drafts" value={stats?.draftPosts} />
        <StatCard title="Total Reach" value={stats?.totalReach?.toLocaleString()} />
        <StatCard title="Engagement" value={`${stats?.engagementRate}%`} />
        <StatCard title="Followers" value={stats?.followers?.toLocaleString()} />
        <StatCard title="Growth" value={stats?.growth} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Posts */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-medium text-gray-200 mb-4">Upcoming Posts</h3>
          {upcomingPosts.length > 0 ? (
            <div className="space-y-3">
              {upcomingPosts.map((post: any) => (
                <div key={post.id} className="flex justify-between items-center text-sm border-b border-gray-800 pb-2">
                  <span className="text-gray-300 truncate pr-4">{post.contentId}</span>
                  <span className="text-gray-500 whitespace-nowrap">{new Date(post.scheduledAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-sm py-4">No upcoming posts scheduled.</div>
          )}
        </div>

        {/* Recent Posts */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-medium text-gray-200 mb-4">Recent Posts</h3>
          {recentPosts.length > 0 ? (
            <div className="space-y-3">
              {recentPosts.map((post: any) => (
                <div key={post.id} className="flex justify-between items-center text-sm border-b border-gray-800 pb-2">
                  <span className="text-gray-300 truncate pr-4">{post.contentId}</span>
                  <span className="text-gray-500 whitespace-nowrap">{new Date(post.publishedAt || post.updatedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-sm py-4">No recent posts.</div>
          )}
        </div>
      </div>
      
      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-medium text-gray-200 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">Create Content</button>
          <button className="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors font-medium">Add Idea</button>
          <button className="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors font-medium">Schedule Post</button>
          <button className="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2">
            <span className="text-purple-400">✨</span> Generate AI Suggestions
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number | undefined }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="text-sm text-gray-400 mb-1">{title}</div>
      <div className="text-2xl font-semibold text-gray-100">{value !== undefined ? value : '-'}</div>
    </div>
  );
}
