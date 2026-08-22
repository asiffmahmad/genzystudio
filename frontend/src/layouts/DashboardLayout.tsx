import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navigation = [
  { name: 'Dashboard', href: '/', icon: '🏠' },
  { name: 'Content', href: '/content', icon: '✍️' },
  { name: 'Calendar', href: '/calendar', icon: '📅' },
  { name: 'Ideas', href: '/ideas', icon: '💡' },
  { name: 'Tasks', href: '/tasks', icon: '✅' },
  { name: 'AI Suggestions', href: '/ai', icon: '🤖' },
  { name: 'Analytics', href: '/analytics', icon: '📊' },
];

const bottomNavigation = [
  { name: 'Accounts', href: '/accounts', icon: '🔗' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-800 bg-gray-900 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-wider text-blue-500">GENZYSTUDIO</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-500 font-medium'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-1">
          {bottomNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-500 font-medium'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur flex items-center px-8">
          <h2 className="text-lg font-medium text-gray-200">
            {navigation.concat(bottomNavigation).find(n => n.href === location.pathname)?.name || 'Dashboard'}
          </h2>
        </header>
        
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
