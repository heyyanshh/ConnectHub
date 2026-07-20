import React, { useState } from 'react';
import { loginUser, registerUser } from '../services/api';
import socketService from '../services/socket';
import { LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [prefix, setPrefix] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const fullPhone = `${prefix} ${phoneNumber}`.trim();
    
    if (!phoneNumber || !password || (!isLogin && !displayName)) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      let response;
      if (isLogin) {
        response = await loginUser(fullPhone, password);
      } else {
        response = await registerUser(displayName, fullPhone, password);
      }

      if (response.success) {
        // Save to local storage
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Connect socket
        socketService.connect(response.user);
        
        onLoginSuccess(response.user);
      } else {
        setError(response.errors ? response.errors[0] : 'Authentication failed');
      }
    } catch (err) {
      setError(err.errors ? err.errors[0] : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-full w-full" style={{ background: 'var(--bg-dark)' }}>
      {/* Decorative Background Patterns */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, var(--accent-primary) 0%, transparent 70%)', opacity: 0.05, filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, var(--accent-secondary) 0%, transparent 70%)', opacity: 0.05, filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div className="glass-panel animate-slide-up" style={{ width: '420px', padding: '40px', position: 'relative', zIndex: 10 }}>
        <div className="flex flex-col items-center gap-4 mb-8">
          <div style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', padding: '16px', borderRadius: '50%', boxShadow: '0 8px 24px -8px var(--accent-primary)' }}>
            {isLogin ? <LogIn size={36} color="white" /> : <UserPlus size={36} color="white" />}
          </div>
          <h2 className="text-gradient" style={{ fontSize: '28px', fontWeight: '800', textAlign: 'center' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray text-center" style={{ fontSize: '15px' }}>
            {isLogin ? 'Enter your details to access your chats.' : 'Join ConnectHub to chat with your friends.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!isLogin && (
            <div className="flex flex-col gap-2">
              <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>Display Name</label>
              <input 
                type="text" 
                placeholder="e.g. John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
              />
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>Phone Number</label>
            <div className="flex gap-2">
              <select 
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                disabled={loading}
                style={{ 
                  width: '120px', 
                  padding: '14px', 
                  background: 'var(--bg-input)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px', 
                  color: 'var(--text-primary)',
                  outline: 'none',
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
              >
                <option value="+1">+1 (USA)</option>
                <option value="+91">+91 (IND)</option>
                <option value="+44">+44 (UK)</option>
                <option value="+61">+61 (AUS)</option>
                <option value="+81">+81 (JPN)</option>
                <option value="+49">+49 (GER)</option>
                <option value="+33">+33 (FRA)</option>
              </select>
              <input 
                type="tel" 
                placeholder="1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                disabled={loading}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ paddingRight: '48px', width: '100%' }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  position: 'absolute', right: '12px', background: 'transparent', padding: '6px',
                  color: 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.color='var(--accent-primary)'}
                onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && <p className="error-text text-center">{error}</p>}

          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              marginTop: '12px', 
              padding: '16px',
              fontSize: '16px',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              boxShadow: '0 8px 24px -8px var(--accent-primary)'
            }}
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="text-center" style={{ marginTop: '2rem' }}>
          <p className="text-gray" style={{ fontSize: '14px' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span 
              className="text-gradient"
              style={{ cursor: 'pointer', fontWeight: '700' }}
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
