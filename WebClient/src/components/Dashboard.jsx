import React from 'react';
import { Users, UserCheck, UserX, Star, ArrowRight } from 'lucide-react';

export default function Dashboard({ user, contacts, onlineUsers, onNavigate }) {

  const onlineCount = contacts.filter(c => onlineUsers.includes(c.phone)).length;
  const blockedCount = contacts.filter(c => c.isBlocked).length;
  const favoritesCount = contacts.filter(c => c.favorite).length;

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div style={{ 
        background: `linear-gradient(135deg, ${color}, ${color}88)`, 
        padding: '18px', 
        borderRadius: '16px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        boxShadow: `0 8px 24px -8px ${color}`
      }}>
        <Icon size={28} color="white" />
      </div>
      <div>
        <h3 style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '4px' }}>{label}</h3>
        <p style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col animate-fade-in" style={{ padding: '40px', overflowY: 'auto' }}>
      <div style={{ marginBottom: '40px' }} className="animate-slide-up">
        <h1 className="text-gradient" style={{ fontSize: '42px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.02em' }}>
          Welcome back, {user.displayName}!
        </h1>
        <p className="text-gray" style={{ fontSize: '18px', fontWeight: '400' }}>
          Here's a quick overview of your ConnectHub network.
        </p>
      </div>

      <div className="animate-slide-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '40px', animationDelay: '0.1s', animationFillMode: 'both' }}>
        <StatCard icon={Users} label="Total Contacts" value={contacts.length} color="#3b82f6" />
        <StatCard icon={UserCheck} label="Contacts Online" value={onlineCount} color="#10b981" />
        <StatCard icon={UserX} label="Blocked Contacts" value={blockedCount} color="#ef4444" />
        <StatCard icon={Star} label="Favorites" value={favoritesCount} color="#f59e0b" />
      </div>



      <div className="flex gap-4 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
        <button 
          onClick={() => onNavigate('contacts')} 
          style={{ 
            padding: '16px 32px', 
            background: 'var(--bg-input)', 
            color: 'var(--accent-primary)', 
            border: '1px solid var(--accent-primary)',
            fontSize: '16px'
          }}
        >
          Manage Contacts
        </button>
        <button 
          onClick={() => onNavigate('chat')} 
          style={{ 
            padding: '16px 32px',
            fontSize: '16px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
          }}
        >
          Open Chat <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
