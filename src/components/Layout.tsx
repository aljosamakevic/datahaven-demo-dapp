import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { isWalletConnected, address, isAuthenticated } = useAppState();

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/buckets', label: 'Buckets' },
    { path: '/files', label: 'Files' },
  ];

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Nav Links */}
            <div className="flex items-center space-x-8">
              <div className="flex-shrink-0">
                <span className="text-xl font-bold text-blue-400">StorageHub Demo</span>
              </div>
              <div className="flex space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === item.path
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center space-x-4">
              {isWalletConnected && address && (
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isAuthenticated ? 'bg-green-400' : 'bg-yellow-400'
                    }`}
                  />
                  <span className="text-sm text-gray-300 font-mono">
                    {truncateAddress(address)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
