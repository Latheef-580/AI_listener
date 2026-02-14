import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FiUser, FiMail, FiEdit2, FiCheck, FiPieChart, FiActivity, FiSun, FiMoon
} from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { profileAPI } from '../services/api';

const EMOTION_COLORS = {
  happy: '#51cf66', sad: '#748ffc', anxious: '#ffa94d',
  angry: '#ff6b6b', confused: '#da77f2', tired: '#868e96',
  grateful: '#66d9e8', neutral: '#adb5bd',
  heartbreak: '#e64980', grief: '#7950f2', depressed: '#5c7cfa',
  crisis: '#ff4444',
};

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [form, setForm] = useState({
    display_name: '', bio: '', voice_preference: 'female-calm', theme_preference: 'dark',
  });
  const [emotionData, setEmotionData] = useState([]);
  const [emotionLogs, setEmotionLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadProfile();
    loadEmotions();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await profileAPI.get();
      setForm({
        display_name: res.data.display_name || '',
        bio: res.data.bio || '',
        voice_preference: res.data.voice_preference || 'female-calm',
        theme_preference: res.data.theme_preference || 'dark',
      });
    } catch (e) {
      console.error(e);
    }
  };

  const loadEmotions = async () => {
    try {
      const [summaryRes, logsRes] = await Promise.all([
        profileAPI.emotionSummary(),
        profileAPI.getEmotions(30),
      ]);
      const summary = summaryRes.data;
      setEmotionData(
        Object.entries(summary).map(([name, value]) => ({
          name, value, color: EMOTION_COLORS[name] || '#adb5bd',
        }))
      );
      setEmotionLogs(logsRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileAPI.update(form);
      updateUser(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>My Profile</h1>
          <p className={`text-sm ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>Manage your account and view your emotional journey</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile form */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-calm-400 flex items-center justify-center">
                <FiUser className="text-white" size={28} />
              </div>
              <div>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.username}</h3>
                <p className={`text-sm ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>
                  <FiMail size={12} className="inline mr-1" />{user?.email}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-text-muted' : 'text-gray-600'}`}>Display Name</label>
                <input value={form.display_name} onChange={update('display_name')} className="w-full px-4 py-2.5 rounded-xl text-sm" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-text-muted' : 'text-gray-600'}`}>Bio</label>
                <textarea value={form.bio} onChange={update('bio')} rows={3} className="w-full px-4 py-2.5 rounded-xl text-sm resize-none" placeholder="Tell us a bit about yourself..." />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-text-muted' : 'text-gray-600'}`}>Voice Preference</label>
                <select value={form.voice_preference} onChange={update('voice_preference')} className={`w-full px-4 py-2.5 rounded-xl text-sm cursor-pointer ${isDark ? 'bg-white/5 border-white/10 text-text-dark' : 'bg-white border-gray-200 text-gray-800'} border`}>
                  <option value="female-calm">Female (Calm)</option>
                  <option value="male-calm">Male (Calm)</option>
                  <option value="young-adult">Young Adult</option>
                  <option value="mature">Mature</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-text-muted' : 'text-gray-600'}`}>Theme</label>
                <button
                  onClick={toggleTheme}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium w-full border cursor-pointer transition-all ${isDark ? 'bg-white/5 border-white/10 text-text-dark hover:bg-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  {isDark ? <FiSun size={16} /> : <FiMoon size={16} />}
                  Currently: {isDark ? 'Dark' : 'Light'} — Click to switch
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-500 to-calm-500 border-none cursor-pointer transition-all hover:shadow-lg disabled:opacity-50"
              >
                {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Changes'}
              </motion.button>
            </div>
          </div>

          {/* Mood tracking chart */}
          <div className="glass rounded-2xl p-6">
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <FiEdit2 size={18} className="inline mr-2" />Mood Journey
            </h3>

            {emotionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={emotionData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                    {emotionData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: isDark ? '#1a1a2e' : '#fff', border: 'none', borderRadius: '12px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-60">
                <p className={`text-sm text-center ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>
                  Start chatting to see your mood tracking chart here!
                </p>
              </div>
            )}

            {/* Recent emotion logs */}
            {emotionLogs.length > 0 && (
              <div className="mt-4">
                <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-text-muted' : 'text-gray-600'}`}>Recent emotions</h4>
                <div className="flex flex-wrap gap-2">
                  {emotionLogs.slice(-10).map((log) => (
                    <span
                      key={log.id}
                      className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: EMOTION_COLORS[log.emotion] || '#adb5bd' }}
                    >
                      {log.emotion}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
