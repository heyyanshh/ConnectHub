import React, { useState, useEffect } from 'react';
import { Moon, Bell, Shield, Database } from 'lucide-react';

export default function Settings() {
  const [darkMode, setDarkMode] = useState(!document.body.classList.contains('light-mode'));
  
  useEffect(() => {
    if (darkMode) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
  }, [darkMode]);

  const [notifications, setNotifications] = useState(true);
  const [sounds, setSounds] = useState(true);

  
  const Toggle = ({ checked, onChange }) => (
    <button 
      onClick={() => onChange(!checked)}
      style={{
        width: '48px', height: '26px', borderRadius: '13px',
        background: checked ? 'var(--accent-primary)' : 'var(--bg-input)',
        border: '1px solid var(--border-color)',
        position: 'relative', cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: 0
      }}
    >
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%', background: 'white',
        position: 'absolute', top: '2px', left: checked ? '24px' : '2px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }} />
    </button>
  );

  const SettingRow = ({ icon: Icon, title, description, checked, onChange, isLast }) => (
    <div className="flex justify-between items-center" style={{ padding: '20px 0', borderBottom: isLast ? 'none' : '1px solid var(--border-color)' }}>
      <div className="flex gap-4 items-center">
        <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <Icon size={22} color="var(--accent-primary)" />
        </div>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{title}</h3>
          <p className="text-sm text-gray" style={{ marginTop: '2px' }}>{description}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col animate-fade-in" style={{ padding: '32px', overflowY: 'auto' }}>
      <h1 className="text-gradient" style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>Settings</h1>
      <p className="text-gray mb-8" style={{ fontSize: '16px' }}>Customize your ConnectHub Web experience.</p>

      <div className="glass-card" style={{ maxWidth: '640px', padding: '12px 32px' }}>
        <SettingRow 
          icon={Moon} 
          title="Dark Mode" 
          description="Use dark theme across the application"
          checked={darkMode}
          onChange={setDarkMode}
        />
        <SettingRow 
          icon={Bell} 
          title="Desktop Notifications" 
          description="Show alerts for new messages"
          checked={notifications}
          onChange={setNotifications}
        />
        <SettingRow 
          icon={Database} 
          title="Sound Effects" 
          description="Play sound when receiving messages"
          checked={sounds}
          onChange={setSounds}
        />

        <div className="flex justify-between items-center" style={{ padding: '20px 0', borderTop: '1px solid var(--border-color)' }}>
          <div className="flex gap-4 items-center">
            <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              <Shield size={22} color="var(--accent-primary)" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Privacy & Security</h3>
              <p className="text-sm text-gray" style={{ marginTop: '2px' }}>Manage blocked contacts and encryption</p>
            </div>
          </div>
          <button style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 16px' }}>
            Manage
          </button>
        </div>
      </div>
    </div>
  );
}
