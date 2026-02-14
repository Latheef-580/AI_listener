import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSend, FiMic, FiMicOff, FiVolume2, FiHeart, FiChevronDown
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { chatAPI, extrasAPI, profileAPI } from '../services/api';

const EMOTION_COLORS = {
  happy: '#51cf66',
  sad: '#748ffc',
  anxious: '#ffa94d',
  angry: '#ff6b6b',
  confused: '#da77f2',
  tired: '#868e96',
  grateful: '#66d9e8',
  neutral: '#adb5bd',
  heartbreak: '#e64980',
  grief: '#7950f2',
  depressed: '#5c7cfa',
  crisis: '#ff4444',
};

const EMOTION_EMOJI = {
  happy: '😊', sad: '😢', anxious: '😰', angry: '😠',
  confused: '😕', tired: '😴', grateful: '🙏', neutral: '😐',
  heartbreak: '💔', grief: '🕊️', depressed: '😞', crisis: '🆘',
};

export default function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voicePref, setVoicePref] = useState(user?.voice_preference || 'female-calm');

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Load chat history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async () => {
    try {
      const res = await chatAPI.history();
      setMessages(res.data.map((m) => ({
        id: m.id,
        text: m.content,
        isAI: m.is_ai_response,
        emotion: m.emotion_detected,
        time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })));
    } catch (e) { /* first time user, no history */ }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    const tempId = Date.now().toString();
    setMessages((prev) => [...prev, {
      id: tempId, text, isAI: false, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);

    try {
      const res = await chatAPI.send(text);
      const ai = res.data.ai_response;
      setMessages((prev) => [...prev, {
        id: ai.id,
        text: ai.content,
        isAI: true,
        emotion: ai.emotion,
        copingTip: ai.coping_tip,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: tempId + '-err', text: 'Sorry, I had trouble responding. Please try again.', isAI: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // --- Voice: Speech-to-Text ---
  const toggleRecording = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + (prev ? ' ' : '') + transcript);
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording]);

  // --- Voice: Text-to-Speech ---
  const speakText = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      let selectedVoice = null;
      const prefMap = {
        'female-calm': (v) => v.name.toLowerCase().includes('female') || v.name.includes('Samantha') || v.name.includes('Google UK English Female'),
        'male-calm': (v) => v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female') || v.name.includes('Daniel'),
        'young-adult': (v) => v.name.includes('Karen') || v.name.includes('Moira'),
        'mature': (v) => v.name.includes('Alex') || v.name.includes('Victoria'),
      };

      const finder = prefMap[voicePref];
      if (finder) selectedVoice = voices.find(finder);
      if (!selectedVoice) selectedVoice = voices.find((v) => v.lang.startsWith('en'));
      if (selectedVoice) utterance.voice = selectedVoice;
    }

    window.speechSynthesis.speak(utterance);
  }, [voicePref]);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Top bar */}
      <header className={`flex items-center gap-4 px-4 py-3 border-b ${isDark ? 'bg-surface-card/50 border-white/5' : 'bg-white/80 border-gray-200'} glass`}>
        <div className="flex-1">
          <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Hey {user?.display_name || user?.username || 'there'} 👋
          </h2>
          <p className={`text-xs ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>
            Express yourself freely. I'm here to listen.
          </p>
        </div>

        {/* Voice preference selector */}
        <div className="relative">
          <select
            value={voicePref}
            onChange={(e) => {
              setVoicePref(e.target.value);
              profileAPI.update({ voice_preference: e.target.value });
            }}
            className={`appearance-none px-3 py-1.5 pr-8 rounded-lg text-xs font-medium cursor-pointer ${isDark ? 'bg-surface-hover text-text-dark border-white/10' : 'bg-gray-100 text-gray-700 border-gray-200'
              } border`}
          >
            <option value="female-calm">🎧 Female (Calm)</option>
            <option value="male-calm">🎧 Male (Calm)</option>
            <option value="young-adult">🎧 Young Adult</option>
            <option value="mature">🎧 Mature</option>
          </select>
          <FiChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted" />
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500/20 to-calm-500/20 flex items-center justify-center mb-4 animate-float">
              <FiHeart size={32} className="text-primary-400" />
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              How are you feeling?
            </h3>
            <p className={`max-w-md ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>
              Type or speak how you're feeling. I'll listen with empathy and respond with care. Everything you share here is safe.
            </p>
          </motion.div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.isAI ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`max-w-lg ${msg.isAI ? '' : ''}`}>
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.isAI
                    ? isDark ? 'bg-surface-card text-text-dark border border-white/5' : 'bg-white text-gray-800 shadow-sm border border-gray-100'
                    : 'bg-gradient-to-r from-primary-500 to-calm-500 text-white'
                  }`}
                style={msg.isAI ? { borderLeftColor: EMOTION_COLORS[msg.emotion] || '#adb5bd', borderLeftWidth: '3px' } : {}}
              >
                {msg.isAI && msg.emotion && (
                  <span className="text-xs font-medium opacity-70 block mb-1">
                    {EMOTION_EMOJI[msg.emotion]} Sensing: {msg.emotion}
                  </span>
                )}
                <p className="m-0 whitespace-pre-wrap">{msg.text}</p>
                {msg.copingTip && (
                  <div className={`mt-3 pt-2 border-t text-xs ${isDark ? 'border-white/10 text-primary-300' : 'border-gray-200 text-primary-600'}`}>
                    💡 <span className="font-medium">Tip:</span> {msg.copingTip}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 px-1">
                <span className={`text-xs ${isDark ? 'text-text-muted' : 'text-gray-400'}`}>{msg.time}</span>
                {msg.isAI && (
                  <button
                    onClick={() => speakText(msg.text)}
                    className={`bg-transparent border-none cursor-pointer p-1 rounded-full transition-all hover:bg-primary-500/20 ${isDark ? 'text-text-muted hover:text-primary-300' : 'text-gray-400 hover:text-primary-500'}`}
                    title="Listen to response"
                  >
                    <FiVolume2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {sending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className={`px-4 py-3 rounded-2xl ${isDark ? 'bg-surface-card' : 'bg-white shadow-sm'}`}>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary-400"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className={`px-4 py-3 border-t ${isDark ? 'bg-surface-card/50 border-white/5' : 'bg-white/80 border-gray-200'}`}>
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleRecording}
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border-none cursor-pointer transition-all ${isRecording
                ? 'bg-red-500 text-white animate-pulse-glow'
                : isDark ? 'bg-surface-hover text-text-muted hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {isRecording ? <FiMicOff size={18} /> : <FiMic size={18} />}
          </motion.button>

          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? 'Listening...' : 'Share how you\'re feeling...'}
              rows={1}
              className={`w-full px-4 py-2.5 rounded-xl text-sm resize-none max-h-32 ${isDark ? 'bg-surface-hover text-text-dark placeholder-text-muted' : 'bg-gray-100 text-gray-800 placeholder-gray-400'
                } border-none focus:ring-2 focus:ring-primary-500/30`}
              style={{ minHeight: '42px' }}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border-none cursor-pointer bg-gradient-to-r from-primary-500 to-calm-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-primary-500/25"
          >
            <FiSend size={18} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
