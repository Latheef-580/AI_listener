import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiUser, FiActivity, FiMapPin, FiCalendar } from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { profileAPI } from '../services/api';

const EMOTION_COLORS = {
    happy: '#51cf66', sad: '#748ffc', anxious: '#ffa94d',
    angry: '#ff6b6b', confused: '#da77f2', tired: '#868e96',
    grateful: '#66d9e8', neutral: '#adb5bd',
    heartbreak: '#e64980', grief: '#7950f2', depressed: '#5c7cfa',
    crisis: '#ff4444',
};

export default function UserProfileModal({ userId, isOpen, onClose }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [profile, setProfile] = useState(null);
    const [emotionData, setEmotionData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && userId) {
            loadData();
        }
    }, [isOpen, userId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [uRes, eRes] = await Promise.all([
                profileAPI.getUser(userId),
                profileAPI.userEmotionSummary(userId),
            ]);
            setProfile(uRes.data);
            const summary = eRes.data;
            setEmotionData(
                Object.entries(summary).map(([name, value]) => ({
                    name, value, color: EMOTION_COLORS[name] || '#adb5bd',
                }))
            );
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl ${isDark ? 'bg-surface-card' : 'bg-white'
                            }`}
                    >
                        <button
                            onClick={onClose}
                            className={`absolute top-4 right-4 p-2 rounded-full z-10 transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                                }`}
                        >
                            <FiX size={20} />
                        </button>

                        {loading ? (
                            <div className="p-12 text-center">
                                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading profile...</p>
                            </div>
                        ) : profile ? (
                            <div>
                                {/* Header / Cover */}
                                <div className="h-32 bg-gradient-to-r from-primary-500 to-calm-400 relative">
                                    <div className="absolute -bottom-8 left-8">
                                        <div className="w-20 h-20 rounded-full bg-white p-1 shadow-lg">
                                            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-100 to-calm-100 flex items-center justify-center text-primary-600 text-2xl font-bold">
                                                {profile.display_name?.[0] || profile.username[0]}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-10 px-8 pb-8">
                                    <div className="mb-6">
                                        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {profile.display_name || profile.username}
                                        </h2>
                                        <div className="flex items-center gap-3 mt-2 text-sm">
                                            <span className={`${profile.is_online ? 'text-green-500' : 'text-gray-400'}`}>
                                                {profile.is_online ? '● Online' : '○ Offline'}
                                            </span>
                                            <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>•</span>
                                            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                                                Joined {new Date(profile.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {profile.bio && (
                                        <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-white/5 border border-white/5' : 'bg-gray-50 border border-gray-100'}`}>
                                            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>About</h4>
                                            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                {profile.bio}
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Emotional Journey</h4>
                                        {emotionData.length > 0 ? (
                                            <div className="h-48 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={emotionData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={40}
                                                            outerRadius={70}
                                                            paddingAngle={3}
                                                            dataKey="value"
                                                        >
                                                            {emotionData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            contentStyle={{
                                                                background: isDark ? '#1a1a2e' : '#fff',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                            }}
                                                            itemStyle={{ fontSize: '12px' }}
                                                        />
                                                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <p className={`text-center py-8 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                No emotional data shared yet.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-red-500">Failed to load profile.</div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
