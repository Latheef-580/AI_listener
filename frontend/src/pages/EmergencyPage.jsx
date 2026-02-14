import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiPhone, FiGlobe, FiExternalLink, FiAlertTriangle, FiHeart } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import { extrasAPI } from '../services/api';

export default function EmergencyPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [resources, setResources] = useState([]);

  useEffect(() => {
    extrasAPI.emergencyResources()
      .then((res) => setResources(res.data))
      .catch((e) => { console.error(e); });
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle size={32} />
          </div>
          <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Emergency Support</h1>
          <p className={`max-w-md mx-auto ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>
            If you are in immediate danger, please call emergency services immediately. You are not alone.
          </p>
        </div>

        {/* Important notice */}
        <div className="mb-6 p-5 rounded-2xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-start gap-3">
            <FiAlertTriangle className="text-red-400 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <h3 className="text-red-400 font-semibold mb-1">If you are in immediate danger</h3>
              <p className={`text-sm ${isDark ? 'text-red-300/80' : 'text-red-600'}`}>
                Please call your local emergency services (911 in the US) immediately. Your safety is the top priority.
              </p>
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="space-y-4">
          {resources.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`glass rounded-2xl p-5 transition-all ${isDark ? 'hover:bg-surface-hover' : 'hover:shadow-lg'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{r.name}</h3>
                  <p className={`text-sm mb-2 ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>{r.description}</p>
                  <div className="flex items-center gap-2">
                    <FiPhone size={14} className="text-primary-400" />
                    <span className="text-primary-400 font-semibold text-sm">{r.contact}</span>
                  </div>
                </div>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl glass text-primary-400 hover:text-primary-300 transition-all hover:scale-105"
                >
                  <FiExternalLink size={18} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Encouragement */}
        <div className={`mt-8 p-6 rounded-2xl text-center glass`}>
          <FiHeart size={32} className="mx-auto mb-3 text-primary-400" />
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>You matter.</h3>
          <p className={`text-sm ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>
            Reaching out takes courage. Whether you call a hotline, message a friend, or simply take a deep breath — every step counts. You are worthy of support and love.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
