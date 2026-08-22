"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  recurrenceType: string | null;
}

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { getTasks } = await import('@/actions/tasks');
      const response = await getTasks();
      if (response.success && response.data) {
        setTasks(response.data as Task[]);
      }
    } catch (error) {
      console.error('Error fetching tasks', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (taskId: string) => {
    try {
      const { completeTask } = await import('@/actions/tasks');
      const response = await completeTask(taskId);
      if (response.success) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error completing task', error);
      alert('Failed to complete task');
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading tasks...</div>;
  }

  const pendingTasks = tasks.filter(t => t.status === 'PENDING');
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium text-gray-200">Tasks</h2>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
          New Task
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-400 border-b border-gray-800 pb-2">Pending ({pendingTasks.length})</h3>
          {pendingTasks.length === 0 && <div className="text-gray-500 italic">No pending tasks.</div>}
          
          <div className="space-y-3">
            {pendingTasks.map(task => (
              <div key={task.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-4 hover:border-blue-500/50 transition-colors">
                <button 
                  onClick={() => handleComplete(task.id)}
                  className="w-6 h-6 rounded border-2 border-gray-600 hover:border-blue-500 hover:bg-blue-500/10 flex-shrink-0 mt-1 flex items-center justify-center transition-colors"
                  title="Mark Complete"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-gray-200 font-medium">{task.title}</h4>
                    {task.priority === 'HIGH' && <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded ml-2">High</span>}
                  </div>
                  {task.description && <p className="text-sm text-gray-500 mt-1">{task.description}</p>}
                  <div className="flex gap-4 mt-3 text-xs font-medium text-gray-500">
                    {task.dueDate && <span>📅 {new Date(task.dueDate).toLocaleDateString()}</span>}
                    {task.recurrenceType && task.recurrenceType !== 'NONE' && <span>🔁 {task.recurrenceType}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 opacity-75">
          <h3 className="text-lg font-medium text-gray-400 border-b border-gray-800 pb-2">Completed ({completedTasks.length})</h3>
          {completedTasks.length === 0 && <div className="text-gray-500 italic">No completed tasks yet.</div>}
          
          <div className="space-y-3">
            {completedTasks.map(task => (
              <div key={task.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-4">
                <div className="w-6 h-6 rounded border-2 border-green-500 bg-green-500/20 text-green-500 flex-shrink-0 mt-1 flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <div className="flex-1">
                  <h4 className="text-gray-400 font-medium line-through">{task.title}</h4>
                  <div className="flex gap-4 mt-2 text-xs text-gray-600">
                    {task.recurrenceType && task.recurrenceType !== 'NONE' && <span>🔁 Generated next occurrence</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
