import React, { useState } from 'react';
import { Camera, LogOut } from 'lucide-react';
import { formatPhone } from '../utils/formatters';

export default function Profile({ user, onUpdateUser, onLogout }) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [status, setStatus] = useState(user.status || 'Hey there! I am using ConnectHub');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    // In a real app, you would make an API call here.
    // For now, just update local state to match desktop app parity demo.
    onUpdateUser({ ...user, displayName, status });
    setIsEditing(false);
  };

  return (
    <div className="h-full w-full flex flex-col animate-fade-in" style={{ padding: '32px' }}>
      <h1 className="text-gradient" style={{ fontSize: '32px', fontWeight: '800', marginBottom: '32px' }}>Profile Settings</h1>

      <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto', width: '100%', padding: '40px' }}>
        <div className="flex flex-col items-center mb-8">
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', width: '110px', height: '110px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px -8px var(--accent-primary)' }}>
              <span style={{ fontWeight: '800', fontSize: '42px', color: 'white' }}>{user.displayName.charAt(0)}</span>
            </div>
            <button 
              className="glass-card flex items-center justify-center"
              style={{ position: 'absolute', bottom: '0', right: '0', width: '36px', height: '36px', padding: '0', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              <Camera size={18} />
            </button>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>{formatPhone(user.phone)}</h2>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>Display Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={!isEditing}
              style={{ 
                background: isEditing ? 'var(--bg-input)' : 'rgba(30,41,59,0.2)', 
                borderColor: isEditing ? 'var(--border-color)' : 'transparent',
                transition: 'all 0.3s ease'
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>Status Message</label>
            <input 
              type="text" 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={!isEditing}
              style={{ 
                background: isEditing ? 'var(--bg-input)' : 'rgba(30,41,59,0.2)', 
                borderColor: isEditing ? 'var(--border-color)' : 'transparent',
                transition: 'all 0.3s ease'
              }}
            />
          </div>

          {isEditing ? (
            <div className="flex gap-4 mt-4">
              <button onClick={() => setIsEditing(false)} style={{ flex: 1, background: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                Cancel
              </button>
              <button onClick={handleSave} style={{ flex: 1, background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', boxShadow: '0 8px 24px -8px var(--accent-primary)' }}>
                Save Changes
              </button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} style={{ marginTop: '16px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              Edit Profile
            </button>
          )}

          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
            <button 
              onClick={onLogout} 
              className="w-full flex items-center justify-center gap-2" 
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', transition: 'all 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
            >
              <LogOut size={20} /> Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
