import React, { useRef, useEffect, useState } from 'react';
import { LayoutDashboard, Users, MessageSquare, User, Settings } from 'lucide-react';

export default function Layout({ activeTab, setActiveTab, children }) {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'contacts', icon: Users, label: 'Contacts' },
    { id: 'chat', icon: MessageSquare, label: 'Chats' },
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  const tabRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState({});

  // Update sliding indicator position when activeTab changes
  useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    if (activeEl) {
      setIndicatorStyle({
        top: activeEl.offsetTop,
        height: activeEl.offsetHeight
      });
    }
  }, [activeTab]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden' }}>

      {/* ═══ GLASSMORPHISM SIDEBAR ═══ */}
      <div style={{
        width: '96px',
        background: 'var(--bg-panel)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '28px 0',
        gap: '20px',
        position: 'relative',
        zIndex: 50
      }}>

        {/* Logo */}
        <div style={{ marginBottom: '24px' }} className="animate-fade-in">
          <div style={{
            width: '52px', height: '52px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: '800', fontSize: '26px',
            fontFamily: 'serif',
            boxShadow: '0 8px 24px -6px rgba(59, 130, 246, 0.5)',
            transform: 'rotate(-8deg)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'rotate(0deg) scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'rotate(-8deg) scale(1)'}
          >
            C
          </div>
        </div>

        {/* Navigation Container (relative for the slider) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', padding: '0 16px', position: 'relative' }}>

          {/* ═══ SLIDING INDICATOR (macOS style) ═══ */}
          <div style={{
            position: 'absolute',
            left: '16px',
            right: '16px',
            top: indicatorStyle.top || 0,
            height: indicatorStyle.height || 56,
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '16px',
            transition: 'top 0.4s cubic-bezier(0.4, 0, 0.2, 1), height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
            pointerEvents: 'none',
            zIndex: 0
          }} />

          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={el => tabRefs.current[tab.id] = el}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
                style={{
                  background: 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'color 0.3s ease, transform 0.2s',
                  position: 'relative',
                  zIndex: 1,
                  boxShadow: 'none'
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                <Icon size={24} strokeWidth={isActive ? 2.2 : 1.8} />
                <span style={{
                  fontSize: '11px',
                  fontWeight: isActive ? '700' : '500',
                  letterSpacing: '0.02em',
                  transition: 'all 0.3s ease'
                }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}
