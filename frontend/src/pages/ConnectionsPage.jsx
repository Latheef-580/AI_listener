import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  FiUserPlus, FiCheck, FiMessageCircle, FiSend, FiUsers, FiSearch,
  FiArrowLeft, FiMoreVertical, FiPhone, FiVideo, FiPaperclip, FiMic, FiTrash2, FiUser
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { connectAPI } from '../services/api';
import UserProfileModal from '../components/UserProfileModal';

const MOOD_EMOJI = {
  happy: '😊', sad: '😢', anxious: '😰', angry: '😠',
  confused: '😕', tired: '😴', grateful: '🙏', neutral: '😐',
};

// Simulated mock files for demo
const MOCK_IMAGE_URL = "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400&q=80";
const MOCK_AUDIO_DURATION = "0:12";

export default function ConnectionsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [tab, setTab] = useState('discover');
  const [users, setUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [pending, setPending] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [moodFilter, setMoodFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Advanced features state
  const [showProfileId, setShowProfileId] = useState(null); // ID of user to show in modal
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Deep linking for notifications
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) setTab(tabParam);
  }, [location.search]);

  useEffect(() => {
    if (tab === 'discover') loadDiscover();
    else if (tab === 'connections') loadConnections();
    else if (tab === 'pending') loadPending();
  }, [tab, moodFilter]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedUser]);

  const loadDiscover = async () => {
    try {
      const res = await connectAPI.discover(moodFilter || undefined);
      setUsers(res.data);
    } catch (e) { console.error(e); }
  };

  const loadConnections = async () => {
    try {
      const res = await connectAPI.myConnections();
      setConnections(res.data);
    } catch (e) { console.error(e); }
  };

  const loadPending = async () => {
    try {
      const res = await connectAPI.pending();
      setPending(res.data);
    } catch (e) { console.error(e); }
  };

  const sendRequest = async (userId) => {
    try {
      await connectAPI.request(userId);
      setUsers(users.map((u) => u.id === userId ? { ...u, requested: true } : u));
    } catch (e) { console.error(e); }
  };

  const acceptRequest = async (connId) => {
    try {
      await connectAPI.accept(connId);
      loadPending();
      loadConnections();
    } catch (e) { console.error(e); }
  };

  const openChat = async (u) => {
    setSelectedUser(u);
    setShowChatMenu(false);
    try {
      const res = await connectAPI.getMessages(u.id);
      setMessages(res.data);
    } catch (e) { console.error(e); }
  };

  const sendMsg = async (type = 'text', content = null) => {
    const finalContent = content || msgInput;
    if ((!finalContent.trim() && type === 'text') || !selectedUser) return;

    try {
      const res = await connectAPI.sendMessage({
        receiver_id: selectedUser.id,
        content: finalContent,
        message_type: type
      });
      setMessages([...messages, res.data]);
      setMsgInput('');
    } catch (e) { console.error(e); }
  };

  const handleFileUpload = (e) => {
    // Determine type (image vs file) based on extension, simulate upload
    // In a real app, you'd upload to S3 here.
    const file = e.target.files[0];
    if (!file) return;

    // Check if image
    if (file.type.startsWith('image/')) {
      // Send a text placeholder that the UI will recognize as a mock image
      sendMsg('image', MOCK_IMAGE_URL);
    } else {
      sendMsg('file', `📄 ${file.name}`);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      // "Stop" recording and send
      setIsRecording(false);
      sendMsg('voice', 'Voice Message');
    } else {
      setIsRecording(true);
    }
  };

  const clearHistory = async () => {
    if (!selectedUser) return;
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      try {
        await connectAPI.clearMessages(selectedUser.id);
        setMessages([]);
        setShowChatMenu(false);
      } catch (e) { console.error(e); }
    }
  };

  const tabClass = (t) => `px-4 py-2 rounded-xl text-sm font-medium cursor-pointer border-none transition-all ${tab === t
    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
    : isDark ? 'bg-surface-hover text-text-muted hover:text-white' : 'bg-white text-gray-600 hover:text-gray-900 shadow-sm'
    }`;

  // Filter logic
  const filteredUsers = users.filter(u =>
  (u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredConnections = connections.filter(u =>
  (u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={`min-h-screen p-4 md:p-8 max-w-5xl mx-auto relative ${isDark ? '' : 'bg-slate-50'}`}>
      <UserProfileModal
        userId={showProfileId}
        isOpen={!!showProfileId}
        onClose={() => setShowProfileId(null)}
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Connections</h1>
            <p className={`text-sm ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>Find people who understand what you're going through</p>
          </div>

          <div className="relative w-full md:w-64">
            <FiSearch className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-text-muted' : 'text-gray-400'}`} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border-none focus:ring-2 focus:ring-blue-400/50 ${isDark ? 'bg-surface-card text-white placeholder-text-muted' : 'bg-white text-gray-900 placeholder-gray-400 shadow-sm'
                }`}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button onClick={() => setTab('discover')} className={tabClass('discover')}>Discover</button>
          <button onClick={() => setTab('connections')} className={tabClass('connections')}>My Connections</button>
          <button onClick={() => setTab('pending')} className={tabClass('pending')}>
            Pending {pending.length > 0 && `(${pending.length})`}
          </button>
        </div>

        {/* Full Screen Chat Overlay */}
        <AnimatePresence>
          {selectedUser && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed inset-0 z-50 flex flex-col ${isDark ? 'bg-[#0F172A]' : 'bg-[#FFF5F0]'}`}
            >
              {/* Chat Header */}
              <div className={`flex items-center gap-3 px-4 py-3 shadow-sm ${isDark ? 'bg-[#1E293B] border-b border-white/5' : 'bg-white border-b border-blue-100'}`}>
                <button onClick={() => setSelectedUser(null)} className={`p-2 rounded-full hover:bg-black/5 ${isDark ? 'text-white' : 'text-gray-600'}`}>
                  <FiArrowLeft size={24} />
                </button>
                <div
                  onClick={() => setShowProfileId(selectedUser.id)}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold cursor-pointer"
                >
                  {selectedUser.display_name?.[0] || selectedUser.username[0]}
                </div>
                <div className="flex-1 cursor-pointer" onClick={() => setShowProfileId(selectedUser.id)}>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedUser.display_name || selectedUser.username}</h3>
                  <span className={`text-xs ${selectedUser.is_online ? 'text-green-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {selectedUser.is_online ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-blue-500 relative">
                  <FiPhone size={20} className="cursor-pointer opacity-80 hover:opacity-100" />
                  <FiVideo size={20} className="cursor-pointer opacity-80 hover:opacity-100" />
                  <button onClick={() => setShowChatMenu(!showChatMenu)} className="bg-transparent border-none cursor-pointer text-inherit">
                    <FiMoreVertical size={20} />
                  </button>

                  {/* Chat Menu Dropdown */}
                  <AnimatePresence>
                    {showChatMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                        className={`absolute top-full right-0 mt-2 w-40 rounded-xl shadow-xl overflow-hidden py-1 z-10 ${isDark ? 'bg-[#1E293B] border border-white/10' : 'bg-white border border-gray-100'}`}
                      >
                        <button
                          onClick={clearHistory}
                          className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 hover:bg-red-50 text-red-500`}
                        >
                          <FiTrash2 size={16} /> Clear History
                        </button>
                        <button
                          onClick={() => { setShowProfileId(selectedUser.id); setShowChatMenu(false); }}
                          className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
                        >
                          <FiUser size={16} /> View Profile
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Chat Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
                {/* Background Pattern Hint */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                  style={{ backgroundImage: 'radial-gradient(circle, #888 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                />

                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full opacity-60">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-500">
                      <FiMessageCircle size={32} />
                    </div>
                    <p className={isDark ? 'text-text-muted' : 'text-gray-500'}>No messages here yet.</p>
                    <p className={`text-sm ${isDark ? 'text-text-muted' : 'text-gray-400'}`}>Send a warm "Hello!" to start.</p>
                  </div>
                )}

                {messages.map((m) => {
                  const isMe = m.sender_id === user.id;

                  let content = <p>{m.content}</p>;
                  if (m.message_type === 'image') {
                    content = <img src={m.content} alt="Shared" className="rounded-lg max-w-full h-auto mt-1" />;
                  } else if (m.message_type === 'voice') {
                    content = (
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                          <div className="w-0 h-0 border-l-[6px] border-l-current border-y-[4px] border-y-transparent ml-0.5" />
                        </div>
                        <div className="h-1 flex-1 bg-current opacity-30 rounded-full overflow-hidden">
                          <div className="h-full w-1/3 bg-current" />
                        </div>
                        <span className="text-xs opacity-80">{MOCK_AUDIO_DURATION}</span>
                      </div>
                    );
                  }

                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] md:max-w-[60%] px-4 py-2 rounded-2xl text-sm shadow-sm relative ${isMe
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-tr-none'
                        : isDark ? 'bg-[#334155] text-white rounded-tl-none' : 'bg-white text-gray-900 rounded-tl-none'
                        }`}>
                        {content}
                        <span className={`text-[10px] block text-right mt-1 opacity-70 ${isMe ? 'text-white' : ''}`}>
                          {new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Footer */}
              <div className={`p-3 ${isDark ? 'bg-[#1E293B] border-t border-white/5' : 'bg-slate-50'}`}>
                <div className={`flex items-center gap-2 px-2 py-2 rounded-3xl ${isDark ? 'bg-[#334155]' : 'bg-white'} shadow-sm`}>

                  {/* Attachments */}
                  <button onClick={() => fileInputRef.current?.click()} className={`p-2 rounded-full hover:bg-black/5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                    <FiPaperclip size={20} />
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

                  <input
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
                    placeholder="Type a message..."
                    className={`flex-1 bg-transparent border-none outline-none text-sm ${isDark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}`}
                  />

                  {/* Voice Record / Send */}
                  {msgInput.trim() ? (
                    <button
                      onClick={() => sendMsg('text')}
                      className="p-2 rounded-full text-blue-500 hover:bg-blue-50 transition-all"
                    >
                      <FiSend size={20} />
                    </button>
                  ) : (
                    <button
                      onClick={toggleRecording}
                      className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <FiMic size={20} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Discover */}
        {tab === 'discover' && (
          <>
            <div className="flex gap-2 mb-4 flex-wrap">
              {['', 'happy', 'sad', 'anxious', 'angry', 'confused', 'tired'].map((mood) => (
                <button
                  key={mood}
                  onClick={() => setMoodFilter(mood)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer transition-all ${moodFilter === mood
                    ? 'bg-blue-500 text-white'
                    : isDark ? 'bg-surface-hover text-text-muted hover:text-white' : 'bg-white text-gray-600 hover:text-gray-900 shadow-sm'
                    }`}
                >
                  {mood ? `${MOOD_EMOJI[mood] || ''} ${mood}` : 'All'}
                </button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((u) => (
                <motion.div
                  key={u.id}
                  whileHover={{ y: -3 }}
                  className={`relative glass rounded-2xl p-4 transition-all ${isDark ? 'hover:bg-surface-hover' : 'hover:shadow-lg'}`}
                >
                  <div
                    className="flex items-center gap-3 mb-3 cursor-pointer group"
                    onClick={() => setShowProfileId(u.id)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      {u.display_name?.[0] || u.username[0]}
                    </div>
                    <div>
                      <p className={`font-medium text-sm group-hover:underline ${isDark ? 'text-white' : 'text-gray-900'}`}>{u.display_name || u.username}</p>
                      {u.current_mood && (
                        <span className={`text-xs ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>
                          Feeling {MOOD_EMOJI[u.current_mood]} {u.current_mood}
                        </span>
                      )}
                    </div>
                  </div>
                  {u.bio && <p className={`text-xs mb-3 ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>{u.bio}</p>}
                  <button
                    onClick={() => sendRequest(u.id)}
                    disabled={u.requested}
                    className={`w-full py-2 rounded-xl text-xs font-medium border-none cursor-pointer transition-all ${u.requested
                      ? isDark ? 'bg-surface-hover text-text-muted' : 'bg-gray-100 text-gray-400'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg'
                      }`}
                  >
                    {u.requested ? <><FiCheck size={12} className="inline mr-1" /> Requested</> : <><FiUserPlus size={12} className="inline mr-1" /> Connect</>}
                  </button>
                </motion.div>
              ))}
              {filteredUsers.length === 0 && (
                <div className={`col-span-full text-center py-12 ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>
                  <FiUsers size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No users found matching "{searchQuery}".</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* My Connections */}
        {tab === 'connections' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConnections.map((u) => (
              <motion.div key={u.id} whileHover={{ y: -3 }} className={`glass rounded-2xl p-4 ${isDark ? 'hover:bg-surface-hover' : 'hover:shadow-lg'}`}>
                <div
                  className="flex items-center gap-3 mb-3 cursor-pointer group"
                  onClick={() => setShowProfileId(u.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    {u.display_name?.[0] || u.username[0]}
                  </div>
                  <div>
                    <p className={`font-medium text-sm group-hover:underline ${isDark ? 'text-white' : 'text-gray-900'}`}>{u.display_name || u.username}</p>
                    <span className={`text-xs ${u.is_online ? 'text-green-500' : isDark ? 'text-text-muted' : 'text-gray-400'}`}>
                      {u.is_online ? '● Online' : '○ Offline'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => openChat(u)}
                  className="w-full py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-none cursor-pointer hover:shadow-lg transition-all"
                >
                  <FiMessageCircle size={12} className="inline mr-1" /> Message
                </button>
              </motion.div>
            ))}
            {filteredConnections.length === 0 && (
              <div className={`col-span-full text-center py-12 ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>
                <FiUsers size={40} className="mx-auto mb-3 opacity-30" />
                <p>No connections found.</p>
              </div>
            )}
          </div>
        )}

        {/* Pending */}
        {tab === 'pending' && (
          <div className="space-y-3">
            {pending.map((p) => (
              <motion.div key={p.connection_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowProfileId(p.user.id)}>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    {p.user.display_name?.[0] || p.user.username[0]}
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{p.user.display_name || p.user.username}</p>
                    <span className={`text-xs ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>Matched on: {p.matched_on}</span>
                  </div>
                </div>
                <button
                  onClick={() => acceptRequest(p.connection_id)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-none cursor-pointer hover:shadow-lg transition-all"
                >
                  <FiCheck size={12} className="inline mr-1" /> Accept
                </button>
              </motion.div>
            ))}
            {pending.length === 0 && (
              <div className={`text-center py-12 ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>
                <p>No pending requests.</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
