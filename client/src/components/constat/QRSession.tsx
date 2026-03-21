import { useState, useEffect } from 'react';
import { trpc } from '../../trpc';
import type { ParticipantRole } from '../../../../shared/types';

interface Props {
  sessionId: string;
  qrUrl: string;
  onPartnerJoined: () => void;
}

const MAX_VEHICLES = 5;
const ROLE_LABELS: Record<ParticipantRole, string> = {
  A: 'Conducteur A (vous)', B: 'Conducteur B', C: 'Conducteur C', D: 'Conducteur D', E: 'Conducteur E',
};
const ROLE_COLORS: Record<ParticipantRole, string> = {
  A: '#3B82F6', B: '#FF6B00', C: '#22C55E', D: '#A855F7', E: '#F59E0B',
};

export function QRSession({ sessionId, qrUrl, onPartnerJoined }: Props) {
  const [partnerJoined, setPartnerJoined] = useState(false);
  const [copied, setCopied] = useState<ParticipantRole | null>(null);
  const [vehicleCount, setVehicleCount] = useState(2);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [activeQR, setActiveQR] = useState<ParticipantRole>('B');
  const [joinedRoles, setJoinedRoles] = useState<Set<string>>(new Set());

  const { data: sessionData } = trpc.session.get.useQuery(
    { sessionId },
    { refetchInterval: 2000, enabled: !!sessionId && !partnerJoined, retry: false, staleTime: 0 }
  );

  useEffect(() => {
    if (!sessionData) return;
    const newJoined = new Set(joinedRoles);
    if ((sessionData as any).participantB?.driver?.firstName) newJoined.add('B');
    if ((sessionData as any).participantC?.driver?.firstName) newJoined.add('C');
    if ((sessionData as any).participantD?.driver?.firstName) newJoined.add('D');
    if ((sessionData as any).participantE?.driver?.firstName) newJoined.add('E');
    setJoinedRoles(newJoined);
    const expectedRoles = ['B', 'C', 'D', 'E'].slice(0, vehicleCount - 1);
    const allJoined = expectedRoles.every(r => newJoined.has(r));
    const status = sessionData.status;
    if (allJoined || status === 'active' || status === 'signing' || status === 'completed') {
      setPartnerJoined(true);
      setTimeout(onPartnerJoined, 1200);
    }
  }, [sessionData, vehicleCount]);

  useEffect(() => {
    const roles: ParticipantRole[] = ['B', 'C', 'D', 'E'].slice(0, vehicleCount - 1) as ParticipantRole[];
    roles.forEach(async (role) => {
      if (qrDataUrls[role]) return;
      try {
        const QRCode = await import('qrcode');
        const joinUrl = `${window.location.origin}/join?session=${sessionId}&role=${role}`;
        const url = await QRCode.toDataURL(joinUrl, {
          width: 240, margin: 2,
          color: { dark: ROLE_COLORS[role], light: '#06060C' },
          errorCorrectionLevel: 'M',
        });
        setQrDataUrls(prev => ({ ...prev, [role]: url }));
      } catch { /* fallback */ }
    });
  }, [vehicleCount, sessionId]);

  const copyLink = async (role: ParticipantRole) => {
    await navigator.clipboard.writeText(`${window.location.origin}/join?session=${sessionId}&role=${role}`);
    setCopied(role);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareLink = async (role: ParticipantRole) => {
    const joinUrl = `${window.location.origin}/join?session=${sessionId}&role=${role}`;
    if (navigator.share) await navigator.share({ title: `boom.contact — Conducteur ${role}`, url: joinUrl });
    else copyLink(role);
  };

  if (partnerJoined) return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16, animation: 'bounceIn 0.5s ease' }}>🤝</div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--boom)', marginBottom: 8 }}>
        {vehicleCount > 2 ? `${joinedRoles.size} conducteur${joinedRoles.size > 1 ? 's' : ''} ont rejoint !` : "L'autre conducteur a rejoint !"}
      </h3>
      <p style={{ fontSize: 14, opacity: 0.5 }}>Connexion établie. Passage au formulaire…</p>
      <style>{`@keyframes bounceIn{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}`}</style>
    </div>
  );

  const roles: ParticipantRole[] = ['B', 'C', 'D', 'E'].slice(0, vehicleCount - 1) as ParticipantRole[];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Partagez le constat</h2>
        <p style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.6 }}>Chaque conducteur scanne son QR pour rejoindre.</p>
      </div>

      {/* Vehicle count */}
      <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 12, background: 'rgba(240,237,232,0.04)', border: '1px solid rgba(240,237,232,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Véhicules impliqués</div>
            <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>Ajoutez si nécessaire (max {MAX_VEHICLES})</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setVehicleCount(v => Math.max(2, v - 1))} disabled={vehicleCount <= 2}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: vehicleCount <= 2 ? 'rgba(240,237,232,0.05)' : 'rgba(240,237,232,0.1)', color: 'var(--text)', cursor: vehicleCount <= 2 ? 'not-allowed' : 'pointer', fontSize: 18, fontWeight: 700, opacity: vehicleCount <= 2 ? 0.3 : 1 }}>−</button>
            <span style={{ fontSize: 22, fontWeight: 800, minWidth: 24, textAlign: 'center', color: 'var(--boom)' }}>{vehicleCount}</span>
            <button onClick={() => setVehicleCount(v => Math.min(MAX_VEHICLES, v + 1))} disabled={vehicleCount >= MAX_VEHICLES}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: vehicleCount >= MAX_VEHICLES ? 'rgba(240,237,232,0.05)' : 'var(--boom)', color: '#fff', cursor: vehicleCount >= MAX_VEHICLES ? 'not-allowed' : 'pointer', fontSize: 18, fontWeight: 700, opacity: vehicleCount >= MAX_VEHICLES ? 0.3 : 1 }}>+</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', fontSize: 11, fontWeight: 700, color: '#3B82F6' }}>A — Vous ✅</div>
          {roles.map(role => (
            <button key={role} onClick={() => setActiveQR(role)}
              style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${activeQR === role ? ROLE_COLORS[role] : 'rgba(240,237,232,0.15)'}`, background: activeQR === role ? `${ROLE_COLORS[role]}20` : 'transparent', fontSize: 11, fontWeight: 700, color: joinedRoles.has(role) ? '#22c55e' : ROLE_COLORS[role], cursor: 'pointer' }}>
              {role} {joinedRoles.has(role) ? '✅' : '⏳'}
            </button>
          ))}
        </div>
      </div>

      {/* QR for active role */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: ROLE_COLORS[activeQR], marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>{ROLE_LABELS[activeQR]}</div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16, background: '#06060C', borderRadius: 20, border: `2px solid ${ROLE_COLORS[activeQR]}33`, boxShadow: `0 0 40px ${ROLE_COLORS[activeQR]}22`, minHeight: 180 }}>
          {qrDataUrls[activeQR]
            ? <img src={qrDataUrls[activeQR]} alt={`QR ${activeQR}`} style={{ width: 200, height: 200, borderRadius: 8 }} />
            : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 200, height: 200 }}><div style={{ fontSize: 11, fontFamily: 'monospace', opacity: 0.4 }}>Génération…</div></div>
          }
        </div>
        <div style={{ marginTop: 8, fontSize: 11, fontFamily: 'monospace', opacity: 0.3 }}>SESSION {sessionId} · {activeQR}</div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: roles.length > 1 ? 12 : 20 }}>
        <button onClick={() => shareLink(activeQR)} style={{ flex: 2, padding: '13px', borderRadius: 10, border: 'none', background: ROLE_COLORS[activeQR], color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          📤 Partager lien {activeQR}
        </button>
        <button onClick={() => copyLink(activeQR)} style={{ flex: 1, padding: '13px', borderRadius: 10, border: '1.5px solid rgba(240,237,232,0.15)', background: copied === activeQR ? 'rgba(34,197,94,0.15)' : 'transparent', color: copied === activeQR ? '#22c55e' : 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          {copied === activeQR ? '✅' : '📋'}
        </button>
      </div>

      {roles.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, justifyContent: 'center' }}>
          {roles.map(role => (
            <button key={role} onClick={() => setActiveQR(role)}
              style={{ padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${activeQR === role ? ROLE_COLORS[role] : 'rgba(240,237,232,0.1)'}`, background: activeQR === role ? `${ROLE_COLORS[role]}15` : 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12, fontWeight: activeQR === role ? 700 : 400 }}>
              {role} {joinedRoles.has(role) ? '✅' : ''}
            </button>
          ))}
        </div>
      )}

      {/* Waiting */}
      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>En attente — {joinedRoles.size}/{vehicleCount - 1} rejoint{joinedRoles.size > 1 ? 's' : ''}</div>
          <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>Actualisation automatique toutes les 2s.</div>
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      </div>
    </div>
  );
}
