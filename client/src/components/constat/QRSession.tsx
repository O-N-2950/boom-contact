import { useState, useEffect } from 'react';
import { trpc } from '../../trpc';
import type { ParticipantRole } from '../../../../shared/types';

interface Props {
  sessionId: string;
  qrUrl: string;
  onPartnerJoined: () => void;
  isPedestrianMode?: boolean;
  onVehicleCountChange?: (count: number) => void;
}

const MAX_VEHICLES = 5;
const ROLE_LABELS: Record<ParticipantRole, string> = {
  A: 'Conducteur A (vous)', B: 'Conducteur B', C: 'Conducteur C', D: 'Conducteur D', E: 'Conducteur E',
};
const ROLE_COLORS: Record<ParticipantRole, string> = {
  A: '#3B82F6', B: '#FF6B00', C: '#22C55E', D: '#A855F7', E: '#F59E0B',
};

export function QRSession({ sessionId, qrUrl, onPartnerJoined, isPedestrianMode = false, onVehicleCountChange }: Props) {
  const [partnerJoined, setPartnerJoined] = useState(false);
  const [copied, setCopied] = useState<ParticipantRole | null>(null);
  const [vehicleCount, setVehicleCount] = useState(isPedestrianMode ? 1 : 2);
  const [secondPartyType, setSecondPartyType] = useState<'vehicle'|'pedestrian'|'object'|'solo'>(isPedestrianMode ? 'pedestrian' : 'vehicle');
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [activeQR, setActiveQR] = useState<ParticipantRole>('B');
  const [joinedRoles, setJoinedRoles] = useState<Set<string>>(new Set());

  const { data: sessionData } = trpc.session.get.useQuery(
    { sessionId },
    { enabled: !!sessionId && !partnerJoined, retry: false, refetchInterval: 3000 }
  );

  useEffect(() => {
    if (!sessionData) return;
    const newJoined = new Set(joinedRoles);
    if ((sessionData as any).participantB?.driver?.firstName) newJoined.add('B');
    if ((sessionData as any).participantC?.driver?.firstName) newJoined.add('C');
    if ((sessionData as any).participantD?.driver?.firstName) newJoined.add('D');
    if ((sessionData as any).participantE?.driver?.firstName) newJoined.add('E');
    setJoinedRoles(newJoined);
    if (vehicleCount === 1) { onPartnerJoined(); return; }
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
      } catch (e) { console.warn('[QRSession] QR generation failed', e); }
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
    <div className="p-8 text-center">
      <div className="text-[64px] mb-4" style={{ animation: 'bounceIn 0.5s ease' }}>🤝</div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--boom)' }}>
        {vehicleCount > 2 ? `${joinedRoles.size} conducteur${joinedRoles.size > 1 ? 's' : ''} ont rejoint !` : "L'autre conducteur a rejoint !"}
      </h2>
      <p className="text-sm" style={{ opacity: 0.75 }}>Connexion établie. Passage au formulaire…</p>
      <style>{`@keyframes bounceIn{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}`}</style>
    </div>
  );

  const roles: ParticipantRole[] = ['B', 'C', 'D', 'E'].slice(0, vehicleCount - 1) as ParticipantRole[];

  return (
    <div className="p-5">
      <div className="text-center mb-5">
        <h2 className="text-xl font-bold mb-1.5">Partagez le constat</h2>
        <p className="text-[13px] leading-relaxed" style={{ opacity: 0.75 }}>Chaque conducteur scanne son QR pour rejoindre.</p>
      </div>

      {/* Vehicle count */}
      <div className="mb-5 rounded-xl" style={{ padding: '14px 16px', background: 'rgba(240,237,232,0.04)', border: '1px solid rgba(240,237,232,0.08)' }}>
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <div className="text-[13px] font-bold">Véhicules impliqués</div>
            <div className="text-[11px]" style={{ opacity: 0.7, marginTop: 2 }}>Ajoutez si nécessaire (max {MAX_VEHICLES})</div>
          </div>

            {/* Type de partie adverse */}
            <div className="mt-2.5 flex gap-1.5 flex-wrap">
              {([
                { val: 'vehicle', icon: '🚗', label: 'Véhicule' },
                { val: 'pedestrian', icon: '🚶', label: 'Piéton / Enfant' },
                { val: 'object', icon: '🏗️', label: 'Objet / Animal' },
                { val: 'solo', icon: '🧍', label: 'Seul' },
              ] as const).map(opt => (
                <button key={opt.val}
                  onClick={() => {
                    setSecondPartyType(opt.val);
                    const newCount = opt.val !== 'vehicle' ? 1 : Math.max(2, vehicleCount);
                    setVehicleCount(newCount);
                    onVehicleCountChange?.(newCount);
                  }}
                  style={{
                    padding: '5px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11,
                    border: secondPartyType === opt.val ? '1.5px solid var(--boom)' : '1px solid rgba(255,255,255,0.25)',
                    background: secondPartyType === opt.val ? 'rgba(255,53,0,0.1)' : 'rgba(255,255,255,0.03)',
                    color: secondPartyType === opt.val ? 'var(--boom)' : 'rgba(255,255,255,0.55)',
                    fontWeight: secondPartyType === opt.val ? 700 : 400,
                    touchAction: 'manipulation',
                  }}>{opt.icon} {opt.label}</button>
              ))}
            </div>

            {vehicleCount === 1 && (
              <div className="mt-2.5 rounded-[10px]" style={{ padding: '12px 14px', background: 'rgba(255,179,0,0.07)', border: '1px solid rgba(255,179,0,0.2)' }}>
                <div className="text-xs font-bold mb-1.5 text-[#f59e0b]">
                  {secondPartyType === 'pedestrian' ? '🚶 Piéton impliqué' :
                   secondPartyType === 'object' ? '🏗️ Aucun autre conducteur' : '🧍 Conducteur seul'}
                </div>
                <div className="text-[11px] leading-relaxed mb-2.5" style={{ opacity: 0.75 }}>
                  {secondPartyType === 'pedestrian'
                    ? "Piéton sans téléphone? Continuez seul. Coordonnées saisies dans le formulaire. Appelez le 117 si blessé."
                    : secondPartyType === 'object'
                    ? "Dégâts matériels, aucun autre conducteur — continuez seul."
                    : "Vous êtes seul impliqué — continuez pour documenter."}
                </div>
                <button onClick={onPartnerJoined}
                  className="w-full rounded-lg border-0 text-white cursor-pointer text-[13px] font-bold touch-manipulation" style={{ padding: '11px', background: 'var(--boom)' }}>
                  Continuer sans autre conducteur →
                </button>
              </div>
            )}
          <div className="flex items-center gap-2.5">
            <button onClick={() => setVehicleCount(v => Math.max(1, v - 1))} disabled={vehicleCount <= 1}
              className="rounded-lg border-0 text-lg font-bold" style={{ width: 32, height: 32, background: vehicleCount <= 2 ? 'rgba(240,237,232,0.05)' : 'rgba(240,237,232,0.1)', color: 'var(--text)', cursor: vehicleCount <= 2 ? 'not-allowed' : 'pointer', opacity: vehicleCount <= 2 ? 0.3 : 1 }}>−</button>
            <span className="text-[22px] font-extrabold text-center" style={{ minWidth: 24, color: 'var(--boom)' }}>{vehicleCount}</span>
            <button onClick={() => setVehicleCount(v => Math.min(MAX_VEHICLES, v + 1))} disabled={vehicleCount >= MAX_VEHICLES}
              className="rounded-lg border-0 text-white text-lg font-bold" style={{ width: 32, height: 32, background: vehicleCount >= MAX_VEHICLES ? 'rgba(240,237,232,0.05)' : 'var(--boom)', cursor: vehicleCount >= MAX_VEHICLES ? 'not-allowed' : 'pointer', opacity: vehicleCount >= MAX_VEHICLES ? 0.3 : 1 }}>+</button>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <div className="rounded-[20px] text-[11px] font-bold" style={{ padding: '4px 10px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#3B82F6' }}>A — Vous ✅</div>
          {roles.map(role => (
            <button key={role} onClick={() => setActiveQR(role)}
              className="rounded-[20px] text-[11px] font-bold cursor-pointer" style={{ padding: '4px 10px', border: `1px solid ${activeQR === role ? ROLE_COLORS[role] : 'rgba(240,237,232,0.15)'}`, background: activeQR === role ? `${ROLE_COLORS[role]}20` : 'transparent', color: joinedRoles.has(role) ? '#22c55e' : ROLE_COLORS[role] }}>
              {role} {joinedRoles.has(role) ? '✅' : '⏳'}
            </button>
          ))}
        </div>
      </div>

      {/* QR for active role */}
      <div className="text-center mb-4">
        <div className="text-xs font-bold mb-2.5 uppercase" style={{ color: ROLE_COLORS[activeQR], letterSpacing: 1 }}>{ROLE_LABELS[activeQR]}</div>
        <div className="flex justify-center p-4 bg-[#06060C] rounded-[20px]" style={{ border: `2px solid ${ROLE_COLORS[activeQR]}33`, boxShadow: `0 0 40px ${ROLE_COLORS[activeQR]}22`, minHeight: 180 }}>
          {qrDataUrls[activeQR]
            ? <img src={qrDataUrls[activeQR]} alt="Code QR pour inviter le conducteur B à rejoindre la session de constat" loading="lazy" className="rounded-lg" style={{ width: 200, height: 200 }} />
            : <div className="flex items-center justify-center" style={{ width: 200, height: 200 }}><div style={{ fontSize: 11, fontFamily: 'monospace', opacity: 0.7 }}>Génération…</div></div>
          }
        </div>
        <div className="mt-2 text-[11px]" style={{ fontFamily: 'monospace', opacity: 0.7 }}>SESSION {sessionId} · {activeQR}</div>
      </div>

      {/* Actions */}
      <div className="flex gap-2" style={{ marginBottom: roles.length > 1 ? 12 : 20 }}>
        <button onClick={() => shareLink(activeQR)} className="rounded-[10px] border-0 text-white cursor-pointer text-sm font-bold flex items-center justify-center gap-2" style={{ flex: 2, padding: '13px', background: ROLE_COLORS[activeQR] }}>
          📤 Partager lien {activeQR}
        </button>
        <button onClick={() => copyLink(activeQR)} className="flex-1 rounded-[10px] cursor-pointer text-[13px] font-semibold" style={{ padding: '13px', border: '1.5px solid rgba(240,237,232,0.15)', background: copied === activeQR ? 'rgba(34,197,94,0.15)' : 'transparent', color: copied === activeQR ? '#22c55e' : 'var(--text)' }}>
          {copied === activeQR ? '✅' : '📋'}
        </button>
      </div>

      {roles.length > 1 && (
        <div className="flex gap-1.5 mb-4 justify-center">
          {roles.map(role => (
            <button key={role} onClick={() => setActiveQR(role)}
              className="rounded-lg cursor-pointer text-xs" style={{ padding: '7px 12px', border: `1.5px solid ${activeQR === role ? ROLE_COLORS[role] : 'rgba(240,237,232,0.1)'}`, background: activeQR === role ? `${ROLE_COLORS[role]}15` : 'transparent', color: 'var(--text)', fontWeight: activeQR === role ? 700 : 400 }}>
              {role} {joinedRoles.has(role) ? '✅' : ''}
            </button>
          ))}
        </div>
      )}

      {/* Waiting */}
      <div className="rounded-[10px] flex items-center gap-3" style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="rounded-full shrink-0" style={{ width: 10, height: 10, background: '#f59e0b', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div>
          <div className="text-[13px] font-semibold">En attente — {joinedRoles.size}/{vehicleCount - 1} rejoint{joinedRoles.size > 1 ? 's' : ''}</div>
          <div className="text-[11px]" style={{ opacity: 0.7, marginTop: 2 }}>Actualisation automatique toutes les 2s.</div>
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      </div>

      {/* Témoin officiel */}
      <div className="mt-3 rounded-[10px]" style={{ padding: '12px 14px', background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)' }}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-base">👁️</span>
          <span className="text-xs font-bold text-[#a855f7]">Témoin officiel</span>
          <span className="text-[10px] ml-auto" style={{ opacity: 0.7 }}>Optionnel</span>
        </div>
        <div className="text-[11px] mb-2 leading-normal" style={{ opacity: 0.75 }}>
          Un témoin peut rejoindre le constat pour enregistrer sa déclaration. Son témoignage est joint au PDF.
        </div>
        <button
          onClick={async () => {
            try {
              const witnessUrl = `${window.location.origin}/join?session=${sessionId}&role=W`;
              if (navigator.share) {
                await navigator.share({ title: 'boom.contact — Témoin', text: 'Rejoignez le constat en tant que témoin', url: witnessUrl });
              } else {
                await navigator.clipboard.writeText(witnessUrl);
                alert('Lien témoin copié !');
              }
            } catch (e) { console.warn('[QRSession] Share/clipboard failed', e); }
          }}
          style={{
            padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.3)',
            background: 'rgba(168,85,247,0.1)', color: '#a855f7',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}
        >
          📤 Partager lien témoin
        </button>
      </div>
    </div>
  );
}


