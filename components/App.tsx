import { Routes, Route } from 'next/navigation';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { ContentComposer } from './pages/ContentComposer';
import { Calendar } from './pages/Calendar';
import { Ideas } from './pages/Ideas';
import { Tasks } from './pages/Tasks';
import { Accounts } from './pages/Accounts';
import { AiSuggestions } from './pages/AiSuggestions';
import { MetaPageSelect } from './pages/MetaPageSelect';

function App() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/content" element={<ContentComposer />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/ideas" element={<Ideas />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/ai" element={<AiSuggestions />} />
        <Route path="/analytics" element={<div className="text-gray-400">Analytics (Coming soon)</div>} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/accounts/meta-select" element={<MetaPageSelect />} />
        <Route path="/settings" element={<div className="text-gray-400">Settings (Coming soon)</div>} />
      </Routes>
    </DashboardLayout>
  );
}

export default App;
