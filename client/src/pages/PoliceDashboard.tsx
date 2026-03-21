// client/src/pages/PoliceDashboard.tsx
import { useState } from 'react';
import { trpc } from '../trpc';

interface Session {
  id: string;
  status: string;
  createdAt: string;
  vehicleCount: number;
  location: string | null;
  hasInjuries: boolean;
}

interface Props {
  token: string;
  user: { firstName: string; lastName: string; badgeNumber?: string; station?: { name: string; canton?: string } | null };
  onLogout: () => void;
  onViewSession: (sessionId: string) => void;
}

export function PoliceDashboard({ token, user, onLogout, onViewSession }: Props) {
  const [searchId, setSearchId] = useState('');

  const { data, isLoading, error, refetch } = trpc.police.dashboard.useQuery(
    { token },
    { refetchInterval: 30_000 } // refresh toutes les 30s
  );

  const statusColor = (s: string) => {
    if (s === 'signed')    return '#22c55e';
    if (s === 'waiting')   return '#f59e0b';
    if (s === 'active')    return '#3b82f6';
    return 'rgba(240,237,232,0.4)';
  };

  const statusLabel = (s: string) => {
    if (s === 'signed')  return '✅ Signé';
    if (s === 'waiting') return '⏳ En attente';
    if (s === 'active')  return '🔴 En cours';
    return s;
  };

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1)  return 'À l\'instant';
    if (min < 60) return `Il y a ${min} min`;
    const h = Math.floor(min / 60);
    return `Il y a ${h}h${min % 60 > 0 ? String(min % 60).padStart(2,'0') : ''}`;
  };

  const filtered = (data?.activeSessions || []).filter(s =>
    !searchId || s.id.toLowerCase().includes(searchId.toLowerCase()) ||
    (s.location || '').toLowerCase().includes(searchId.toLowerCase())
  );

  return (
    <div style={{ minHeight:'100vh', background:'#06060C', color:'#F0EDE8' }}>

      {/* Header */}
      <div style={{ background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🚔</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Module Police</div>
            <div style={{ fontSize: 12, opacity: 0.4 }}>{user.station?.name || 'boom.contact'} {user.station?.canton ? `· ${user.station.canton}` : ''}</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user.firstName} {user.lastName}</div>
            {user.badgeNumber && <div style={{ fontSize: 11, opacity: 0.4 }}>Badge {user.badgeNumber}</div>}
          </div>
          <button onClick={onLogout} style={{ padding:'7px 14px', borderRadius: 8, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(240,237,232,0.5)', cursor:'pointer', fontSize: 12 }}>
            Déconnexion
          </button>
        </div>
      </div>

      <div style={{ padding: 20, maxWidth: 900, margin:'0 auto' }}>

        {/* Stats */}
        {data && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Sessions actives', value: data.stats.total, icon: '📋', color: '#3b82f6' },
              { label: 'Avec blessures', value: data.stats.withInjuries, icon: '🚑', color: '#ef4444' },
              { label: 'Signés', value: data.stats.signed, icon: '✅', color: '#22c55e' },
            ].map(stat => (
              <div key={stat.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius: 12, border:'1px solid rgba(255,255,255,0.07)', padding:'16px', textAlign:'center' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{stat.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Rejoindre par QR/ID + search */}
        <div style={{ display:'flex', gap: 10, marginBottom: 20 }}>
          <input
            type="text"
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            placeholder="Rechercher par ID, lieu…"
            style={{ flex: 1, padding:'11px 14px', borderRadius: 10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.05)', color:'#fff', fontSize: 14, outline:'none' }}
          />
          <button onClick={() => refetch()} style={{ padding:'11px 16px', borderRadius: 10, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'rgba(240,237,232,0.6)', cursor:'pointer', fontSize: 13 }}>
            🔄
          </button>
        </div>

        {/* Sessions list */}
        {isLoading && (
          <div style={{ textAlign:'center', padding: 40, opacity: 0.4 }}>Chargement des sessions…</div>
        )}

        {error && (
          <div style={{ padding:'12px 16px', borderRadius: 10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize: 13 }}>
            ⚠️ {error.message}
          </div>
        )}

        {filtered.length === 0 && !isLoading && (
          <div style={{ textAlign:'center', padding: 48, opacity: 0.3 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
            <div>Aucune session active dans les dernières 24h</div>
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
          {filtered.map((s: Session) => (
            <div key={s.id}
              onClick={() => onViewSession(s.id)}
              style={{ background:'rgba(255,255,255,0.04)', borderRadius: 12, border: s.hasInjuries ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.07)', padding:'14px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap: 14 }}
            >
              <div style={{ fontSize: 24 }}>{s.hasInjuries ? '🚑' : '🚗'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily:'monospace', fontSize: 13, fontWeight: 700, color:'rgba(240,237,232,0.7)' }}>{s.id}</span>
                  <span style={{ fontSize: 11, color: statusColor(s.status), background: `${statusColor(s.status)}20`, padding:'2px 7px', borderRadius: 20 }}>{statusLabel(s.status)}</span>
                  {s.hasInjuries && <span style={{ fontSize: 11, color:'#ef4444', background:'rgba(239,68,68,0.1)', padding:'2px 7px', borderRadius: 20 }}>⚠️ Blessures</span>}
                </div>
                <div style={{ fontSize: 12, opacity: 0.45 }}>
                  {s.vehicleCount} véhicule{s.vehicleCount > 1 ? 's' : ''} · {s.location || 'Localisation non renseignée'} · {timeAgo(s.createdAt)}
                </div>
              </div>
              <span style={{ color:'rgba(240,237,232,0.25)', fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
