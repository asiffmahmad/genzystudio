"use client";
import { useState, useEffect } from 'react';
import { getTasks, completeTask, createTask } from '@/actions/tasks';

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
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [dueDate, setDueDate] = useState('');
  const [recurrenceType, setRecurrenceType] = useState('NONE');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
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
      const response = await completeTask(taskId);
      if (response.success) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error completing task', error);
      alert('Failed to complete task');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Title is required');
      return;
    }
    try {
      const response = await createTask({
        title,
        description,
        priority,
        dueDate: dueDate || null,
        recurrenceType
      });
      if (response.success) {
        setShowModal(false);
        setTitle('');
        setDescription('');
        setPriority('NORMAL');
        setDueDate('');
        setRecurrenceType('NONE');
        fetchTasks();
      } else {
        alert(response.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task', error);
      alert('Failed to create task');
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
        <button 
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
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

      {/* New Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="text-lg font-medium text-gray-200">Add New Task</h3>
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
                  placeholder="e.g. Schedule LinkedIn post"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <textarea 
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the task..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Priority</label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Due Date</label>
                  <input 
                    type="date" 
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Recurrence</label>
                  <select 
                    value={recurrenceType}
                    onChange={(e) => setRecurrenceType(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="NONE">None</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
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
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
