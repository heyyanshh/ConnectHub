import React, { useState } from 'react';
import { loginUser, registerUser, forgotPassword } from '../services/api';
import socketService from '../services/socket';
import { LogIn, UserPlus, Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  // 'login' | 'register' | 'forgot'
  const [mode, setMode] = useState('login');
  const [prefix, setPrefix] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /* Forgot password specific state */
  const [forgotStep, setForgotStep] = useState(1); // 1 = verify identity, 2 = new password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setForgotStep(1);
    setNewPassword('');
    setConfirmPassword('');
    setResetSuccess(false);
    setShowPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  /* Login / Register handler */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const fullPhone = `${prefix} ${phoneNumber}`.trim();

    if (!phoneNumber || !password || (mode === 'register' && !displayName)) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      let response;
      if (mode === 'login') {
        response = await loginUser(fullPhone, password);
      } else {
        response = await registerUser(displayName, fullPhone, password);
      }

      if (response.success) {
        localStorage.setItem('user', JSON.stringify(response.user));
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

  /* Forgot password handler */
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const fullPhone = `${prefix} ${phoneNumber}`.trim();

    if (forgotStep === 1) {
      /* Step 1: validate fields then move to step 2 */
      if (!phoneNumber) {
        setError('Please enter your phone number');
        return;
      }
      if (!displayName || displayName.trim().length < 2) {
        setError('Please enter your display name');
        return;
      }
      setForgotStep(2);
      return;
    }

    /* Step 2: set new password */
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await forgotPassword(fullPhone, displayName, newPassword);
      if (response.success) {
        setResetSuccess(true);
        /* Auto-redirect to login after 2.5s */
        setTimeout(() => {
          switchMode('login');
          setPhoneNumber('');
          setDisplayName('');
        }, 2500);
      } else {
        setError(response.errors ? response.errors[0] : 'Password reset failed');
      }
    } catch (err) {
      setError(err.errors ? err.errors[0] : 'Password reset failed');
      /* If display name doesn't match, go back to step 1 */
      if (err.errors?.[0]?.toLowerCase().includes('display name')) {
        setForgotStep(1);
      }
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    if (mode === 'forgot') return <KeyRound size={36} color="white" />;
    if (mode === 'register') return <UserPlus size={36} color="white" />;
    return <LogIn size={36} color="white" />;
  };

  const getTitle = () => {
    if (mode === 'forgot') return 'Reset Password';
    if (mode === 'register') return 'Create Account';
    return 'Welcome Back';
  };

  const getSubtitle = () => {
    if (mode === 'forgot' && forgotStep === 1) return 'Verify your identity to reset your password.';
    if (mode === 'forgot' && forgotStep === 2) return 'Choose a strong new password.';
    if (mode === 'register') return 'Join ConnectHub to chat with your friends.';
    return 'Enter your details to access your chats.';
  };

  /* Phone input row shared across all modes */
  const PhoneInput = () => (
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
  );

  /* Password field with toggle */
  const PasswordField = ({ label, value, onChange, show, onToggle, placeholder = '••••••••' }) => (
    <div className="flex flex-col gap-2">
      <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>{label}</label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={loading}
          style={{ paddingRight: '48px', width: '100%' }}
        />
        <button
          type="button"
          onClick={onToggle}
          style={{
            position: 'absolute', right: '12px', background: 'transparent', padding: '6px',
            color: 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          tabIndex={-1}
        >
          {show ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );

  /* Success overlay after password reset */
  if (resetSuccess) {
    return (
      <div className="flex items-center justify-center h-full w-full" style={{ background: 'var(--bg-dark)' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, var(--accent-primary) 0%, transparent 70%)', opacity: 0.05, filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, var(--accent-secondary) 0%, transparent 70%)', opacity: 0.05, filter: 'blur(60px)', pointerEvents: 'none' }} />

        <div className="glass-panel animate-slide-up" style={{ width: '420px', padding: '48px 40px', position: 'relative', zIndex: 10, borderRadius: '24px', textAlign: 'center' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #22c55e, #10b981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px -8px rgba(34, 197, 94, 0.5)',
            animation: 'successPulse 1.5s ease-in-out infinite'
          }}>
            <CheckCircle2 size={42} color="white" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>
            Password Reset!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.6' }}>
            Your password has been successfully updated. Redirecting you to login...
          </p>
          <div style={{
            marginTop: '24px', height: '4px', borderRadius: '2px',
            background: 'var(--border-color)', overflow: 'hidden'
          }}>
            <div style={{
              height: '100%', borderRadius: '2px',
              background: 'linear-gradient(90deg, #22c55e, #10b981)',
              animation: 'progressBar 2.5s linear forwards'
            }} />
          </div>
        </div>

        <style>{`
          @keyframes successPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes progressBar {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full w-full" style={{ background: 'var(--bg-dark)' }}>
      {/* Decorative Background Patterns */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, var(--accent-primary) 0%, transparent 70%)', opacity: 0.05, filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, var(--accent-secondary) 0%, transparent 70%)', opacity: 0.05, filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div className="glass-panel animate-slide-up" style={{ width: '420px', padding: '40px', position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div className="flex flex-col items-center gap-4 mb-8">
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                if (forgotStep === 2) {
                  setForgotStep(1);
                  setError('');
                } else {
                  switchMode('login');
                }
              }}
              style={{
                position: 'absolute', top: '20px', left: '20px',
                background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                borderRadius: '10px', padding: '8px', cursor: 'pointer',
                color: 'var(--text-secondary)', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-primary)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div style={{
            background: mode === 'forgot'
              ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
              : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            padding: '16px', borderRadius: '50%',
            boxShadow: mode === 'forgot'
              ? '0 8px 24px -8px rgba(245, 158, 11, 0.5)'
              : '0 8px 24px -8px var(--accent-primary)'
          }}>
            {getIcon()}
          </div>
          <h2 className="text-gradient" style={{ fontSize: '28px', fontWeight: '800', textAlign: 'center' }}>
            {getTitle()}
          </h2>
          <p className="text-gray text-center" style={{ fontSize: '15px' }}>
            {getSubtitle()}
          </p>

          {/* Step indicator for forgot password */}
          {mode === 'forgot' && (
            <div className="flex items-center gap-3" style={{ marginTop: '4px' }}>
              <div style={{
                width: '32px', height: '4px', borderRadius: '2px',
                background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                transition: 'all 0.3s'
              }} />
              <div style={{
                width: '32px', height: '4px', borderRadius: '2px',
                background: forgotStep === 2
                  ? 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))'
                  : 'var(--border-color)',
                transition: 'all 0.3s'
              }} />
            </div>
          )}
        </div>

        {/* ─── LOGIN / REGISTER FORM ─── */}
        {mode !== 'forgot' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {mode === 'register' && (
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

            <PhoneInput />

            <PasswordField
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              show={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
            />

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
              {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Sign Up')}
            </button>
          </form>
        )}

        {/* ─── FORGOT PASSWORD FORM ─── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="flex flex-col gap-5">
            {forgotStep === 1 && (
              <>
                <PhoneInput />

                <div className="flex flex-col gap-2">
                  <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>Display Name</label>
                  <input
                    type="text"
                    placeholder="Enter the name on your account"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {/* Hint card */}
                <div className="flex items-start gap-3" style={{
                  padding: '14px 16px', borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.15)'
                }}>
                  <ShieldCheck size={18} style={{ color: 'var(--accent-primary)', marginTop: '2px', flexShrink: 0 }} />
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                    Enter the phone number and display name you used when creating your account.
                  </p>
                </div>
              </>
            )}

            {forgotStep === 2 && (
              <>
                <PasswordField
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  show={showNewPassword}
                  onToggle={() => setShowNewPassword(!showNewPassword)}
                  placeholder="Min. 6 characters"
                />

                <PasswordField
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  show={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  placeholder="Re-enter your new password"
                />

                {/* Password strength hints */}
                <div className="flex flex-col gap-2" style={{ padding: '0 2px' }}>
                  {[
                    { met: newPassword.length >= 6, text: 'At least 6 characters' },
                    { met: newPassword && confirmPassword && newPassword === confirmPassword, text: 'Passwords match' }
                  ].map((rule, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: rule.met ? '#22c55e' : 'var(--text-muted)',
                        transition: 'background 0.2s'
                      }} />
                      <span style={{
                        fontSize: '13px',
                        color: rule.met ? '#22c55e' : 'var(--text-muted)',
                        transition: 'color 0.2s'
                      }}>
                        {rule.text}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {error && <p className="error-text text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '12px',
                padding: '16px',
                fontSize: '16px',
                background: forgotStep === 1
                  ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
                  : 'linear-gradient(135deg, #f59e0b, #ef4444)',
                boxShadow: forgotStep === 1
                  ? '0 8px 24px -8px var(--accent-primary)'
                  : '0 8px 24px -8px rgba(245, 158, 11, 0.4)'
              }}
            >
              {loading ? 'Processing...' : (forgotStep === 1 ? 'Verify Identity' : 'Reset Password')}
            </button>
          </form>
        )}

        {/* ─── FOOTER LINKS ─── */}
        <div className="flex flex-col items-center gap-3" style={{ marginTop: '2rem' }}>
          {mode === 'login' && (
            <p
              style={{ fontSize: '14px', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: '600', transition: 'opacity 0.2s' }}
              onClick={() => switchMode('forgot')}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Forgot Password?
            </p>
          )}

          {mode !== 'forgot' && (
            <p className="text-gray" style={{ fontSize: '14px' }}>
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <span
                className="text-gradient"
                style={{ cursor: 'pointer', fontWeight: '700' }}
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              >
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </span>
            </p>
          )}

          {mode === 'forgot' && (
            <p className="text-gray" style={{ fontSize: '14px' }}>
              Remember your password?{' '}
              <span
                className="text-gradient"
                style={{ cursor: 'pointer', fontWeight: '700' }}
                onClick={() => switchMode('login')}
              >
                Sign In
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
