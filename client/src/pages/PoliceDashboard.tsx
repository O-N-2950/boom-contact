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

  const filtered = ((data as any)?.activeSessions || (data as any)?.sessions || []).filter((s: any) =>
    !searchId || s.id.toLowerCase().includes(searchId.toLowerCase()) ||
    (s.location || '').toLowerCase().includes(searchId.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#06060C] text-[#F0EDE8]">
      <h1 className="absolute p-0 overflow-hidden whitespace-nowrap w-px h-px m-[-1px] border-0"  style={{ clip: 'rect(0,0,0,0)' }}>Tableau de bord Police — boom.contact</h1>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.25)' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚔</span>
          <div>
            <div className="font-extrabold text-base">Module Police</div>
            <div className="text-xs opacity-70" >{user.station?.name || 'boom.contact'} {user.station?.canton ? `· ${user.station.canton}` : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[13px] font-semibold">{user.firstName} {user.lastName}</div>
            {user.badgeNumber && <div className="text-[11px] opacity-70" >Badge {user.badgeNumber}</div>}
          </div>
          <button onClick={onLogout} className="rounded-lg bg-transparent cursor-pointer text-xs px-3.5 py-[7px]" style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(240,237,232,0.5)' }}>
            Déconnexion
          </button>
        </div>
      </div>

      <div className="p-5 mx-auto max-w-[900px]">

        {/* Stats */}
        {data && (
          <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              { label: 'Sessions actives', value: (data as any).stats?.total ?? 0, icon: '📋', color: '#3b82f6' },
              { label: 'Avec blessures', value: (data as any).stats?.withInjuries ?? 0, icon: '🚑', color: '#ef4444' },
              { label: 'Signés', value: (data as any).stats?.signed ?? 0, icon: '✅', color: '#22c55e' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl text-center p-4"  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.25)' }}>
                <div className="text-[28px] mb-1.5">{stat.icon}</div>
                <div className="text-[28px] font-extrabold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[11px] opacity-70 mt-0.5" >{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Rejoindre par QR/ID + search */}
        <div className="flex gap-2.5 mb-5">
          <input
            type="text"
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            placeholder="Rechercher par ID, lieu…"
            className="flex-1 rounded-[10px] text-white text-sm px-3.5 py-[11px]" style={{ border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)' }}
            aria-label="Rechercher un constat"
          />
          <button onClick={() => refetch()} className="rounded-[10px] cursor-pointer text-[13px] px-4 py-[11px]" style={{ border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.04)', color: 'rgba(240,237,232,0.6)' }}>
            🔄
          </button>
        </div>

        {/* Sessions list */}
        {isLoading && (
          <div className="text-center p-10 opacity-70" >Chargement des sessions…</div>
        )}

        {error && (
          <div className="rounded-[10px] text-red-500 text-[13px] px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            ⚠️ {error.message}
          </div>
        )}

        {filtered.length === 0 && !isLoading && (
          <div className="text-center p-12 opacity-70" >
            <div className="text-[40px] mb-2.5">📭</div>
            <div>Aucune session active dans les dernières 24h</div>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {filtered.map((s: Session) => (
            <button role="button" tabIndex={0} key={s.id}
              onClick={() => onViewSession(s.id)}
              className="rounded-xl cursor-pointer flex items-center gap-3.5 px-4 py-3.5" style={{ background: 'rgba(255,255,255,0.04)', border: s.hasInjuries ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.25)' }}
            >
              <div className="text-2xl">{s.hasInjuries ? '🚑' : '🚗'}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-[3px]" >
                  <span className="text-[13px] font-bold" style={{ fontFamily: 'monospace', color: 'rgba(240,237,232,0.7)' }}>{s.id}</span>
                  <span className="text-[11px] rounded-[20px]" style={{ color: statusColor(s.status), background: `${statusColor(s.status)}20`, padding: '2px 7px' }}>{statusLabel(s.status)}</span>
                  {s.hasInjuries && <span className="text-[11px] text-red-500 rounded-[20px] px-[7px] py-0.5" style={{ background: 'rgba(239,68,68,0.1)' }}>⚠️ Blessures</span>}
                </div>
                <div className="text-xs opacity-70" >
                  {s.vehicleCount} véhicule{s.vehicleCount > 1 ? 's' : ''} · {s.location || 'Localisation non renseignée'} · {timeAgo(s.createdAt)}
                </div>
              </div>
              <span className="text-lg" style={{ color: 'rgba(240,237,232,0.55)' }}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
