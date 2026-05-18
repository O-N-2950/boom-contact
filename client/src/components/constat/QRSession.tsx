import { useState, useEffect } from 'react';
import { trpc } from '../../trpc';
import { getPublicOrigin } from '../../apiBase';
import type { ParticipantRole } from '../../../../shared/types';

interface Props {
  sessionId: string;
  qrUrl: string;
  tokenA: string;
  onPartnerJoined: () => void;
  isPedestrianMode?: boolean;
  onVehicleCountChange?: (count: number) => void;
}

// VOIE A (store V1) : plafonné à 2 véhicules. Le modèle serveur ne persiste
// fiablement que A/B (updateParticipant écrit C/D/E dans participantB). Tant
// que le refactor multi-véhicules A-E n'est pas fait, on bloque l'UI à 2 pour
// éviter toute corruption de données sur accident 3+ véhicules (audit B4).
const MAX_VEHICLES = 2;
const ROLE_LABELS: Record<ParticipantRole, string> = {
  A: 'Conducteur A (vous)', B: 'Conducteur B', C: 'Conducteur C', D: 'Conducteur D', E: 'Conducteur E',
};
const ROLE_COLORS: Record<ParticipantRole, string> = {
  A: '#3B82F6', B: '#FF6B00', C: '#22C55E', D: '#A855F7', E: '#F59E0B',
};

export function QRSession({ sessionId, qrUrl, tokenA, onPartnerJoined, isPedestrianMode = false, onVehicleCountChange }: Props) {
  const [partnerJoined, setPartnerJoined] = useState(false);
  const [copied, setCopied] = useState<ParticipantRole | null>(null);
  const [vehicleCount, setVehicleCount] = useState(isPedestrianMode ? 1 : 2);
  const [secondPartyType, setSecondPartyType] = useState<'vehicle'|'pedestrian'|'object'|'solo'>(isPedestrianMode ? 'pedestrian' : 'vehicle');
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [activeQR, setActiveQR] = useState<ParticipantRole>('B');
  const [joinedRoles, setJoinedRoles] = useState<Set<string>>(new Set());

  const { data: sessionData } = trpc.session.get.useQuery(
    { sessionId, participantToken: tokenA },
    { enabled: !!sessionId && !!tokenA && !partnerJoined, retry: 3, refetchInterval: 2000 }
  );

  useEffect(() => {
    if (!sessionData) return;
    const newJoined = new Set(joinedRoles);
    const sd = sessionData as any;
    // Détecter que B a REJOINT (pas forcément rempli son prénom)
    if (sd.participantB) newJoined.add('B');
    if (sd.participantC) newJoined.add('C');
    if (sd.participantD) newJoined.add('D');
    if (sd.participantE) newJoined.add('E');
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
        // B utilise le qrUrl du serveur (contient tokenB sécurisé)
        // C/D/E utilisent le même tokenB (le serveur les accepte aussi)
        let joinUrl: string;
        if (role === 'B') {
          joinUrl = qrUrl; // qrUrl du serveur = /join?session=xxx&tokenB=yyy
        } else {
          // Extraire tokenB de la qrUrl du serveur pour les rôles C/D/E
          const urlObj = new URL(qrUrl, getPublicOrigin());
          const tokenB = urlObj.searchParams.get('tokenB') || '';
          joinUrl = `${getPublicOrigin()}/join?session=${sessionId}&role=${role}&tokenB=${encodeURIComponent(tokenB)}`;
        }
        const url = await QRCode.toDataURL(joinUrl, {
          width: 240, margin: 2,
          color: { dark: ROLE_COLORS[role], light: '#06060C' },
          errorCorrectionLevel: 'M',
        });
        setQrDataUrls(prev => ({ ...prev, [role]: url }));
      } catch (e) { console.warn('[QRSession] QR generation failed', e); }
    });
  }, [vehicleCount, sessionId, qrUrl]);

  const buildJoinUrl = (role: ParticipantRole): string => {
    if (role === 'B') return qrUrl;
    const urlObj = new URL(qrUrl, getPublicOrigin());
    const tokenB = urlObj.searchParams.get('tokenB') || '';
    return `${getPublicOrigin()}/join?session=${sessionId}&role=${role}&tokenB=${encodeURIComponent(tokenB)}`;
  };

  const copyLink = async (role: ParticipantRole) => {
    await navigator.clipboard.writeText(buildJoinUrl(role));
    setCopied(role);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareLink = async (role: ParticipantRole) => {
    const joinUrl = buildJoinUrl(role);
    if (navigator.share) await navigator.share({ title: `boom.contact — Conducteur ${role}`, url: joinUrl });
    else copyLink(role);
  };

  if (partnerJoined) return (
    <div className="p-8 text-center">
      <div className="text-[64px] mb-4" style={{ animation: 'bounceIn 0.5s ease' }}>🤝</div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--boom)' }}>
        {vehicleCount > 2 ? `${joinedRoles.size} conducteur${joinedRoles.size > 1 ? 's' : ''} ont rejoint !` : "L'autre conducteur a rejoint !"}
      </h2>
      <p className="text-sm opacity-75">Connexion établie. Passage au formulaire…</p>
      <style>{`@keyframes bounceIn{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}`}</style>
    </div>
  );

  const roles: ParticipantRole[] = ['B', 'C', 'D', 'E'].slice(0, vehicleCount - 1) as ParticipantRole[];

  return (
    <div className="p-5">
      <div className="text-center mb-5">
        <h2 className="text-xl font-bold mb-1.5">Partagez le constat</h2>
        <p className="text-[13px] leading-relaxed opacity-75">Chaque conducteur scanne son QR pour rejoindre.</p>
      </div>

      {/* Vehicle count */}
      <div className="mb-5 rounded-xl px-4 py-3.5" style={{ background: 'rgba(240,237,232,0.04)', border: '1px solid rgba(240,237,232,0.08)' }}>
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <div className="text-[13px] font-bold">Véhicules impliqués</div>
            <div className="text-[11px] opacity-70 mt-0.5" >Ajoutez si nécessaire (max {MAX_VEHICLES})</div>
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
                  className="rounded-[20px] cursor-pointer text-[11px] px-2.5 py-[5px] touch-manipulation" style={{ border: secondPartyType === opt.val ? '1.5px solid var(--boom)' : '1px solid rgba(255,255,255,0.25)', background: secondPartyType === opt.val ? 'rgba(255,53,0,0.1)' : 'rgba(255,255,255,0.03)', color: secondPartyType === opt.val ? 'var(--boom)' : 'rgba(255,255,255,0.55)', fontWeight: secondPartyType === opt.val ? 700 : 400 }}>{opt.icon} {opt.label}</button>
              ))}
            </div>

            {vehicleCount === 1 && (
              <div className="mt-2.5 rounded-[10px] px-3.5 py-3" style={{ background: 'rgba(255,179,0,0.07)', border: '1px solid rgba(255,179,0,0.2)' }}>
                <div className="text-xs font-bold mb-1.5 text-[#f59e0b]">
                  {secondPartyType === 'pedestrian' ? '🚶 Piéton impliqué' :
                   secondPartyType === 'object' ? '🏗️ Aucun autre conducteur' : '🧍 Conducteur seul'}
                </div>
                <div className="text-[11px] leading-relaxed mb-2.5 opacity-75">
                  {secondPartyType === 'pedestrian'
                    ? "Piéton sans téléphone? Continuez seul. Coordonnées saisies dans le formulaire. Appelez le 117 si blessé."
                    : secondPartyType === 'object'
                    ? "Dégâts matériels, aucun autre conducteur — continuez seul."
                    : "Vous êtes seul impliqué — continuez pour documenter."}
                </div>
                <button onClick={onPartnerJoined}
                  className="w-full rounded-lg border-0 text-white cursor-pointer text-[13px] font-bold touch-manipulation p-[11px]"  style={{ background: 'var(--boom)' }}>
                  Continuer sans autre conducteur →
                </button>
              </div>
            )}
          <div className="flex items-center gap-2.5">
            <button onClick={() => setVehicleCount(v => Math.max(1, v - 1))} disabled={vehicleCount <= 1}
              className="rounded-lg border-0 text-lg font-bold w-8 h-8"  style={{ background: vehicleCount <= 2 ? 'rgba(240,237,232,0.05)' : 'rgba(240,237,232,0.1)', color: 'var(--text)', cursor: vehicleCount <= 2 ? 'not-allowed' : 'pointer', opacity: vehicleCount <= 2 ? 0.3 : 1 }}>−</button>
            <span className="text-[22px] font-extrabold text-center min-w-[24px]"  style={{ color: 'var(--boom)' }}>{vehicleCount}</span>
            <button onClick={() => setVehicleCount(v => Math.min(MAX_VEHICLES, v + 1))} disabled={vehicleCount >= MAX_VEHICLES}
              className="rounded-lg border-0 text-white text-lg font-bold w-8 h-8"  style={{ background: vehicleCount >= MAX_VEHICLES ? 'rgba(240,237,232,0.05)' : 'var(--boom)', cursor: vehicleCount >= MAX_VEHICLES ? 'not-allowed' : 'pointer', opacity: vehicleCount >= MAX_VEHICLES ? 0.3 : 1 }}>+</button>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <div className="rounded-[20px] text-[11px] font-bold px-2.5 py-1 text-[#3B82F6]" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>A — Vous ✅</div>
          {roles.map(role => (
            <button key={role} onClick={() => setActiveQR(role)}
              className="rounded-[20px] text-[11px] font-bold cursor-pointer px-2.5 py-1" style={{ border: `1px solid ${activeQR === role ? ROLE_COLORS[role] : 'rgba(240,237,232,0.15)'}`, background: activeQR === role ? `${ROLE_COLORS[role]}20` : 'transparent', color: joinedRoles.has(role) ? '#22c55e' : ROLE_COLORS[role] }}>
              {role} {joinedRoles.has(role) ? '✅' : '⏳'}
            </button>
          ))}
        </div>
      </div>

      {/* QR for active role */}
      <div className="text-center mb-4">
        <div className="text-xs font-bold mb-2.5 uppercase tracking-[1px]" style={{ color: ROLE_COLORS[activeQR] }}>{ROLE_LABELS[activeQR]}</div>
        <div className="flex justify-center p-4 bg-[#06060C] rounded-[20px] min-h-[180px]"  style={{ border: `2px solid ${ROLE_COLORS[activeQR]}33`, boxShadow: `0 0 40px ${ROLE_COLORS[activeQR]}22` }}>
          {qrDataUrls[activeQR]
            ? <img src={qrDataUrls[activeQR]} alt="Code QR pour inviter le conducteur B à rejoindre la session de constat" loading="lazy" className="rounded-lg w-[200px] h-[200px]"  />
            : <div className="flex items-center justify-center w-[200px] h-[200px]" ><div className="text-[11px] opacity-70" style={{ fontFamily: 'monospace' }}>Génération…</div></div>
          }
        </div>
        <div className="mt-2 text-[11px] opacity-70"  style={{ fontFamily: 'monospace' }}>SESSION {sessionId} · {activeQR}</div>
      </div>

      {/* Actions */}
      <div className="flex gap-2" style={{ marginBottom: roles.length > 1 ? 12 : 20 }}>
        <button onClick={() => shareLink(activeQR)} className="rounded-[10px] border-0 text-white cursor-pointer text-sm font-bold flex items-center justify-center gap-2 p-[13px]"  style={{ flex: 2, background: ROLE_COLORS[activeQR] }}>
          📤 Partager lien {activeQR}
        </button>
        <button onClick={() => copyLink(activeQR)} className="flex-1 rounded-[10px] cursor-pointer text-[13px] font-semibold p-[13px]"  style={{ border: '1.5px solid rgba(240,237,232,0.15)', background: copied === activeQR ? 'rgba(34,197,94,0.15)' : 'transparent', color: copied === activeQR ? '#22c55e' : 'var(--text)' }}>
          {copied === activeQR ? '✅' : '📋'}
        </button>
      </div>

      {roles.length > 1 && (
        <div className="flex gap-1.5 mb-4 justify-center">
          {roles.map(role => (
            <button key={role} onClick={() => setActiveQR(role)}
              className="rounded-lg cursor-pointer text-xs px-3 py-[7px]" style={{ border: `1.5px solid ${activeQR === role ? ROLE_COLORS[role] : 'rgba(240,237,232,0.1)'}`, background: activeQR === role ? `${ROLE_COLORS[role]}15` : 'transparent', color: 'var(--text)', fontWeight: activeQR === role ? 700 : 400 }}>
              {role} {joinedRoles.has(role) ? '✅' : ''}
            </button>
          ))}
        </div>
      )}

      {/* Waiting */}
      <div className="rounded-[10px] flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="rounded-full shrink-0 w-2.5 h-2.5 bg-[#f59e0b]" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div>
          <div className="text-[13px] font-semibold">En attente — {joinedRoles.size}/{vehicleCount - 1} rejoint{joinedRoles.size > 1 ? 's' : ''}</div>
          <div className="text-[11px] opacity-70 mt-0.5" >Actualisation automatique toutes les 2s.</div>
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      </div>

      {/* Témoin officiel — MASQUÉ V1 (audit H3).
          Le rôle 'W' n'est pas supporté côté serveur : non présent dans
          l'enum Zod updateParticipant ['A','B','C','D','E'] ni dans le
          keyMap de signSession. Le lien était de plus un no-op
          (replace /role=B/ sur une qrUrl sans 'role=B'). Fonctionnalité
          roadmap (Mode Témoin officiel) — réactiver après support serveur.
      {false && (
      <div className="mt-3 rounded-[10px] px-3.5 py-3" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)' }}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-base">👁️</span>
          <span className="text-xs font-bold text-[#a855f7]">Témoin officiel</span>
          <span className="text-[10px] ml-auto opacity-70" >Optionnel</span>
        </div>
        <div className="text-[11px] mb-2 leading-normal opacity-75">
          Un témoin peut rejoindre le constat pour enregistrer sa déclaration. Son témoignage est joint au PDF.
        </div>
        <button
          onClick={async () => {
            try {
              const witnessUrl = buildJoinUrl('B').replace(/role=B/, 'role=W');
              if (navigator.share) {
                await navigator.share({ title: 'boom.contact — Témoin', text: 'Rejoignez le constat en tant que témoin', url: witnessUrl });
              } else {
                await navigator.clipboard.writeText(witnessUrl);
                alert('Lien témoin copié !');
              }
            } catch (e) { console.warn('[QRSession] Share/clipboard failed', e); }
          }}
          className="rounded-lg cursor-pointer text-xs font-semibold px-3.5 py-2 text-[#a855f7]" style={{ border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.1)' }}
        >
          📤 Partager lien témoin
        </button>
      </div>
      )} */}
    </div>
  );
}


