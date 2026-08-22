"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';

interface ScheduledPost {
  id: string;
  contentId: string;
  platform: string;
  scheduledAt: Date | string;
  status: string;
  content?: { title: string };
}

export function Calendar() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const fetchCalendar = async () => {
      try {
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        const { getScheduledPosts } = await import('@/actions/calendar');
        const response = await getScheduledPosts(start.toISOString(), end.toISOString());
        if (response.success && response.data) {
          setPosts(response.data as ScheduledPost[]);
        }
      } catch (error) {
        console.error('Error fetching calendar', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCalendar();
  }, [currentDate]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gray-900 p-4 rounded-xl border border-gray-800">
        <h2 className="text-xl font-medium text-gray-200">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors">
            Previous
          </button>
          <button onClick={nextMonth} className="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors">
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-800 rounded-xl overflow-hidden border border-gray-800">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-900 py-3 text-center text-sm font-medium text-gray-400">
            {day}
          </div>
        ))}

        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-gray-900/50 min-h-[120px] p-2" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayPosts = posts.filter(post => {
            const postDate = new Date(post.scheduledAt);
            return postDate.getDate() === day && postDate.getMonth() === currentDate.getMonth();
          });

          return (
            <div key={day} className="bg-gray-900 min-h-[120px] p-2 hover:bg-gray-800/80 transition-colors cursor-pointer group">
              <div className="text-sm text-gray-500 font-medium mb-2 group-hover:text-blue-400">{day}</div>
              <div className="space-y-1">
                {dayPosts.map(post => (
                  <div key={post.id} className={`text-xs px-2 py-1 rounded truncate border ${
                    post.status === 'PUBLISHED' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                    post.status === 'FAILED' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                    'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  }`}>
                    {post.platform}: {post.content?.title || 'Post'}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
