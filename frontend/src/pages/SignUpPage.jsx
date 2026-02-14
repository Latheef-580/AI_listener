import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiLock, FiHeart, FiEye, FiEyeOff, FiAlertCircle, FiCheck } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';

export default function SignUpPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const update = (field) => (e) => {
    const val = e.target.value;
    setForm({ ...form, [field]: val });
    // Clear field error on edit
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (error) setError('');
  };

  // Real-time field validation
  const validateField = (field) => {
    const errs = { ...fieldErrors };
    switch (field) {
      case 'username':
        if (form.username && form.username.length < 3) errs.username = 'Username must be at least 3 characters';
        else if (form.username && !/^[a-zA-Z0-9_]+$/.test(form.username)) errs.username = 'Username can only contain letters, numbers, and underscores';
        else errs.username = '';
        break;
      case 'email':
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Please enter a valid email address';
        else errs.email = '';
        break;
      case 'password':
        if (form.password && form.password.length < 6) errs.password = 'Password must be at least 6 characters';
        else errs.password = '';
        // Also recheck confirm if it's filled
        if (form.confirmPassword && form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
        else if (form.confirmPassword) errs.confirmPassword = '';
        break;
      case 'confirmPassword':
        if (form.confirmPassword && form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
        else errs.confirmPassword = '';
        break;
    }
    setFieldErrors(errs);
  };

  const isFieldValid = (field) => {
    if (!form[field]) return null; // untouched
    if (fieldErrors[field]) return false;
    switch (field) {
      case 'username': return form.username.length >= 3;
      case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
      case 'password': return form.password.length >= 6;
      case 'confirmPassword': return form.confirmPassword && form.password === form.confirmPassword;
      default: return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Full validation before submit
    const errors = {};
    if (!form.username) errors.username = 'Username is required';
    else if (form.username.length < 3) errors.username = 'Username must be at least 3 characters';

    if (!form.email) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Please enter a valid email address';

    if (!form.password) errors.password = 'Password is required';
    else if (form.password.length < 6) errors.password = 'Password must be at least 6 characters';

    if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';

    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.register({
        username: form.username,
        email: form.email,
        password: form.password,
      });
      login(res.data.access_token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail) {
        // Map backend errors to specific fields when possible
        const detailLower = typeof detail === 'string' ? detail.toLowerCase() : '';
        if (detailLower.includes('email already')) {
          setFieldErrors((prev) => ({ ...prev, email: 'This email is already registered. Try logging in instead.' }));
        } else if (detailLower.includes('username already')) {
          setFieldErrors((prev) => ({ ...prev, username: 'This username is already taken. Please choose another.' }));
        } else if (typeof detail === 'string') {
          setError(detail);
        } else if (Array.isArray(detail)) {
          // Pydantic validation array format (fallback)
          const msgs = detail.map((d) => d.msg || 'Validation error');
          setError(msgs.join('. '));
        } else {
          setError('Registration failed. Please check your details and try again.');
        }
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Cannot connect to the server. Please make sure the backend is running.');
      } else {
        setError('Registration failed. Please check your details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) => {
    const base = "w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all";
    const valid = isFieldValid(field);
    if (valid === false || fieldErrors[field]) return `${base} !border-red-400 focus:!border-red-400 focus:!shadow-red-500/20`;
    if (valid === true) return `${base} !border-green-400/50 focus:!border-green-400`;
    return base;
  };

  const FieldStatus = ({ field }) => {
    const valid = isFieldValid(field);
    const err = fieldErrors[field];
    if (err) return (
      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-xs text-red-400 flex items-center gap-1">
        <FiAlertCircle size={12} /> {err}
      </motion.p>
    );
    if (valid) return (
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-xs text-green-400 flex items-center gap-1">
        <FiCheck size={12} /> Looks good!
      </motion.p>
    );
    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <motion.div
        className="absolute w-80 h-80 rounded-full opacity-15 blur-3xl"
        style={{ background: 'linear-gradient(135deg, #845ef7, #5c7cfa)', top: '-10%', left: '-5%' }}
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-72 h-72 rounded-full opacity-10 blur-3xl"
        style={{ background: 'linear-gradient(135deg, #3bc9db, #ff8787)', bottom: '-10%', right: '-5%' }}
        animate={{ x: [0, -20, 0], y: [0, -15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-3xl p-8 shadow-2xl">
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link to="/" className="inline-flex items-center gap-2 no-underline mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-calm-400 flex items-center justify-center">
                <FiHeart className="text-white" size={24} />
              </div>
            </Link>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Create your space</h1>
            <p className={`mt-1 ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>Begin your journey to feeling better.</p>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2"
            >
              <FiAlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-text-muted' : 'text-gray-600'}`}>Username</label>
              <div className="relative">
                <FiUser className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-text-muted' : 'text-gray-400'}`} size={18} />
                <input
                  type="text"
                  value={form.username}
                  onChange={update('username')}
                  onBlur={() => validateField('username')}
                  className={inputClass('username')}
                  placeholder="Choose a username (min 3 characters)"
                />
              </div>
              <FieldStatus field="username" />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-text-muted' : 'text-gray-600'}`}>Email</label>
              <div className="relative">
                <FiMail className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-text-muted' : 'text-gray-400'}`} size={18} />
                <input
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  onBlur={() => validateField('email')}
                  className={inputClass('email')}
                  placeholder="your@email.com"
                />
              </div>
              <FieldStatus field="email" />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-text-muted' : 'text-gray-600'}`}>Password</label>
              <div className="relative">
                <FiLock className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-text-muted' : 'text-gray-400'}`} size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={update('password')}
                  onBlur={() => validateField('password')}
                  className={`w-full pl-11 pr-11 py-3 rounded-xl text-sm transition-all ${
                    fieldErrors.password ? '!border-red-400' : isFieldValid('password') ? '!border-green-400/50' : ''
                  }`}
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0 ${isDark ? 'text-text-muted' : 'text-gray-400'}`}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              <FieldStatus field="password" />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-text-muted' : 'text-gray-600'}`}>Confirm Password</label>
              <div className="relative">
                <FiLock className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-text-muted' : 'text-gray-400'}`} size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={update('confirmPassword')}
                  onBlur={() => validateField('confirmPassword')}
                  className={inputClass('confirmPassword')}
                  placeholder="Re-enter your password"
                />
              </div>
              <FieldStatus field="confirmPassword" />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-500 to-calm-500 border-none cursor-pointer transition-all hover:shadow-lg hover:shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </motion.button>
          </form>

          <p className={`text-center mt-6 text-sm ${isDark ? 'text-text-muted' : 'text-gray-500'}`}>
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 font-medium no-underline hover:text-primary-300">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
