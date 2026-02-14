import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiActivity, FiUsers, FiUser, FiAlertCircle, FiSun, FiMoon,
  FiLogOut, FiHeart, FiX, FiMenu, FiBell
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { extrasAPI, connectAPI } from '../services/api';

export default function Layout() {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quote, setQuote] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadQuote();
    checkPending();
    const interval = setInterval(checkPending, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  // Re-check pending when location changes (e.g. after accepting a request)
  useEffect(() => {
    checkPending();
  }, [location.pathname]);

  const loadQuote = async () => {
    try {
      const res = await extrasAPI.quote();
      setQuote(res.data);
    } catch { }
  };

  const checkPending = async () => {
    try {
      const res = await connectAPI.pending();
      setPendingCount(res.data.length);
    } catch { }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || window.innerWidth >= 768) && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed md:relative z-40 w-64 h-full flex flex-col p-4 border-r ${isDark ? 'bg-surface-card border-white/5' : 'bg-white border-gray-200'
              }`}
          >
            {/* Logo */}
            <div className="flex items-center gap-2 mb-8 px-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-calm-400 flex items-center justify-center">
                <FiHeart className="text-white" size={16} />
              </div>
              <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Listener</span>
              <button onClick={() => setSidebarOpen(false)} className="md:hidden ml-auto bg-transparent border-none cursor-pointer text-text-muted">
                <FiX size={20} />
              </button>
            </div>

            {/* Daily quote */}
            {quote && (
              <div className={`p-3 rounded-xl mb-6 text-xs leading-relaxed ${isDark ? 'bg-primary-500/10 text-primary-300' : 'bg-primary-50 text-primary-700'}`}>
                <p className="italic">"{quote.quote}"</p>
                <p className="mt-1 font-medium text-right">— {quote.author}</p>
              </div>
            )}

            {/* Nav links */}
            <nav className="flex-1 space-y-1">
              {[
                { icon: <FiActivity size={18} />, label: 'Dashboard', path: '/dashboard' },
                {
                  icon: <div className="relative"><FiUsers size={18} />{pendingCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>}</div>,
                  label: 'Connections',
                  path: '/connections'
                },
                { icon: <FiUser size={18} />, label: 'Profile', path: '/profile' },
                { icon: <FiAlertCircle size={18} />, label: 'Emergency Help', path: '/emergency' },
              ].map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium no-underline transition-all ${isActive
                        ? isDark ? 'bg-primary-500/15 text-primary-300' : 'bg-primary-50 text-primary-600'
                        : isDark ? 'text-text-muted hover:bg-surface-hover hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Theme toggle & logout */}
            <div className="space-y-2 pt-4 border-t border-white/5">
              <button onClick={toggleTheme} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full bg-transparent border-none cursor-pointer transition-all ${isDark ? 'text-text-muted hover:bg-surface-hover hover:text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full bg-transparent border-none cursor-pointer text-red-400 hover:bg-red-500/10 transition-all">
                <FiLogOut size={18} />
                Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header Toggle & Notifications */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-3 pointer-events-auto">
          <div className="md:hidden absolute top-0 right-12"> {/* Adjust for mobile menu overlap */} </div>

          <Link to="/connections?tab=pending" className="relative p-2 rounded-xl glass text-text-muted hover:text-primary-500 transition-all cursor-pointer">
            <FiBell size={20} />
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></span>
            )}
          </Link>
        </div>

        <div className="md:hidden absolute top-4 left-4 z-20">
          <button onClick={() => setSidebarOpen(true)} className={`p-2 rounded-lg glass border-none cursor-pointer ${isDark ? 'text-text-muted' : 'text-gray-600'}`}>
            <FiMenu size={20} />
          </button>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
