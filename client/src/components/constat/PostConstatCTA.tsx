import React, { useState } from 'react';
import { ShareBoom } from '../ShareBoom';
import { trpc } from '../../trpc';

interface PostConstatCTAProps {
  sessionId: string;
  authToken?: string;
  authUser?: { id: string; email: string; role: string; credits: number } | null;
  onLogin: () => void;         // Opens AuthModal
  onAccount: () => void;       // Opens AccountPage
  onBuyPack: () => void;       // Opens PricingPage
}

export const PostConstatCTA = React.memo(function PostConstatCTA({
  sessionId,
  authToken,
  authUser,
  onLogin,
  onAccount,
  onBuyPack,
}: PostConstatCTAProps) {
  const [waLinkCopied, setWaLinkCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [giftResult, setGiftResult]     = useState('');

  const grantMut = trpc.auth.grantCredits.useMutation();

  const sendGift = async (credits: number) => {
    try {
      const r = await grantMut.mutateAsync({ credits, sendEmail: false });
      window.open(r.waUrl, '_blank');
      setGiftResult(`✅ Lien créé — envoyez-le par WhatsApp !`);
    } catch (e: unknown) {
      setGiftResult('Erreur : ' + e.message);
    }
  };

  // ── Mode 1 : Utilisateur NON CONNECTÉ ────────────────────
  if (!authUser) {
    return (
      <div style={containerStyle}>
        {/* Accroche émotionnelle */}
        <div style={headerStyle}>
          <div style={emojiStyle} aria-hidden="true">⚡</div>
          <div>
            <div style={titleStyle}>La prochaine fois : 0 saisie</div>
            <div style={subtitleStyle}>Vos véhicules mémorisés une fois pour toujours</div>
          </div>
        </div>

        {/* Avantages */}
        <div style={benefitsGrid}>
          <Benefit icon="🚗" text="Permis + carte verte scannés une fois" />
          <Benefit icon="⚡" text="Constat en 2 min au lieu de 10" />
          <Benefit icon="🎁" text="Offrez un constat à vos proches en 1 clic" />
          <Benefit icon="👨‍👩‍👧" text="Idéal famille : partagez vos crédits" />
        </div>

        {/* CTA principal */}
        <button onClick={onLogin} style={primaryBtnStyle}>
          Créer mon compte gratuit →
        </button>
        <button onClick={() => setShowShare(true)} className="w-full mt-2 p-3 rounded-[10px] bg-transparent cursor-pointer text-[13px] font-semibold flex items-center justify-center gap-2" style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(240,237,232,0.6)' }}>
          <span>📤</span> Partager à mes proches
        </button>
        {showShare && <ShareBoom onClose={() => setShowShare(false)} context="post_constat" />}

        {/* Rappel garage — juste après inscription */}
        <div className="mt-2.5 rounded-xl flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.2)' }}>
          <span className="text-[22px]">🚗</span>
          <div className="flex-1">
            <div className="text-[13px] font-bold" style={{ color: 'rgba(240,237,232,0.9)' }}>
              Ensuite, enregistre ton véhicule
            </div>
            <div className="text-[11px] opacity-70 mt-0.5" >
              Scan permis de circuler + carte verte · 30 sec · plus jamais à resaisir
            </div>
          </div>
          <span className="text-base opacity-70" >›</span>
        </div>

        <div style={dividerStyle}>
          <div style={dividerLine} />
          <span style={dividerText}>ou passez directement</span>
          <div style={dividerLine} />
        </div>

        {/* Pack famille */}
        <div style={packCardStyle}>
          <div className="flex justify-between items-start mb-2.5">
            <div>
              <div className="font-black text-base text-[#FF5533]">🔥 Pack famille</div>
              <div className="text-[#d0d0d0] text-xs mt-0.5" >3 constats à partager avec vos proches</div>
            </div>
            <div className="text-right">
              <div className="text-white font-black text-[22px]">12.90</div>
              <div className="text-[#d0d0d0] text-[11px]">CHF / EUR</div>
            </div>
          </div>

          {/* Scénarios marketing */}
          <div className="flex gap-1.5 mb-3.5"  style={{ flexDirection: 'column' as const }}>
            <Scenario icon="📱" text="Votre enfant appelle — accident. Envoyez-lui un constat en 3 secondes sur son mobile." />
            <Scenario icon="🏢" text="Employé avec véhicule société. Transférez un crédit par WhatsApp instantanément." />
            <Scenario icon="👫" text="Ami en difficulté à l'étranger. Il reçoit un lien, pas de compte requis." />
          </div>

          <button onClick={onBuyPack} style={primaryBtnStyle}>
            Acheter 3 constats — CHF/EUR 12.90 →
          </button>
        </div>

        <button onClick={onBuyPack} style={ghostBtnStyle}>
          Voir tous les packs →
        </button>
      </div>
    );
  }

  // ── Mode 2 : Connecté, 0 crédit ──────────────────────────
  if (authUser.credits === 0) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div style={emojiStyle} aria-label="Objectif atteint">🎯</div>
          <div>
            <div style={titleStyle}>Prêt pour la prochaine fois</div>
            <div style={subtitleStyle}>Rechargez maintenant, partagez quand vous voulez</div>
          </div>
        </div>

        <div className="rounded-xl p-4 mb-4 bg-[#0d1a0d]" style={{ border: '1px solid #1a3a1a' }}>
          <div className="text-green-400 font-bold mb-2.5">✅ Votre compte boom.contact</div>
          <div className="text-[#d0d0d0] text-[13px] leading-relaxed">
            Vos véhicules sont mémorisés. Lors de votre prochain accident, vous partez directement à l'étape QR — aucune saisie, aucun scan.
          </div>
          <button onClick={onAccount} className="mt-2.5 text-xs px-3.5 py-2">
            Gérer mon garage →
          </button>
        </div>

        {/* Packs avec focus "offrir" */}
        <div style={packCardStyle}>
          <div className="font-black text-[15px] mb-1.5 text-[#FF5533]">
            🎁 Offrez un constat par WhatsApp
          </div>
          <div className="text-[#d0d0d0] text-[13px] leading-relaxed mb-3.5" >
            Un de vos crédits = un lien unique à envoyer à <strong className="text-white">n'importe qui</strong>, sans que la personne ait besoin d'un compte.
          </div>
          <PackChoice onSelect={onBuyPack} />
        </div>
      </div>
    );
  }

  // ── Mode 3 : Connecté avec crédits ──────────────────────
  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={emojiStyle} aria-label="Force et puissance">💪</div>
        <div>
          <div style={titleStyle}>{authUser.credits} crédit{authUser.credits > 1 ? 's' : ''} disponible{authUser.credits > 1 ? 's' : ''}</div>
          <div style={subtitleStyle}>Partagez, protégez vos proches</div>
        </div>
      </div>

      {/* Envoyer par WhatsApp */}
      <div className="rounded-xl p-4 mb-3 bg-[#0d1a1a]" style={{ border: '1px solid #1a3a3a' }}>
        <div className="font-bold mb-2 text-[#60c8f0]">📲 Offrir un constat par WhatsApp</div>
        <div className="text-[#d0d0d0] text-[13px] mb-3 leading-relaxed">
          En 1 clic, envoyez un lien à votre enfant, employé ou ami. Il fait son constat sans compte ni paiement — décompté de vos crédits.
        </div>
        <div className="flex gap-2">
          <button onClick={() => sendGift(1)} disabled={grantMut.isPending} className="flex-1 text-white border-0 rounded-lg font-bold cursor-pointer text-[13px] px-3 py-[11px] bg-[#25D366]">
            {grantMut.isPending ? '...' : '📲 Envoyer 1 constat'}
          </button>
          <button onClick={() => sendGift(3)} disabled={grantMut.isPending || authUser.credits < 3} className="flex-1 rounded-lg font-bold text-[13px]" style={{ background: authUser.credits >= 3 ? '#1da851' : '#1a1a1a', color: authUser.credits >= 3 ? '#fff' : '#aaa', border: `1px solid ${authUser.credits >= 3 ? '#1da851' : '#333'}`, padding: '11px 12px', cursor: authUser.credits >= 3 ? 'pointer' : 'default' }}>
            📲 Envoyer 3 constats
          </button>
        </div>
        {giftResult && <div className="text-green-400 text-xs mt-2">{giftResult}</div>}
      </div>

      {/* Partage viral — après constat */}
      <div className="rounded-xl p-3.5 mb-3" style={{ background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.2)' }}>
        <div className="font-bold text-sm mb-1.5 text-[#FF5533]">📤 Partage boom.contact</div>
        <div className="text-[#d0d0d0] text-[13px] leading-normal mb-2.5">
          Tu viens de faire ton constat en 5 min. Tes amis méritent de savoir que ça existe.
        </div>
        <button onClick={() => setShowShare(true)} className="w-full p-[11px] rounded-[10px] border-0 text-white cursor-pointer text-sm font-bold flex items-center justify-center gap-2" style={{ background: 'var(--boom)' }}>
          <span className="text-lg">📤</span> Partager à mes proches
        </button>
      </div>
      {showShare && <ShareBoom onClose={() => setShowShare(false)} context="post_constat" />}

      {/* Garage */}
      <div className="bg-[#111] rounded-xl p-3.5 mb-3" style={{ border: '1px solid #1a1a1a' }}>
        <div className="text-white font-bold mb-1.5">🚗 Mémorisez vos autres véhicules</div>
        <div className="text-[#d0d0d0] text-[13px] leading-normal">
          Flotte d'entreprise, moto, camping-car ? Chaque véhicule scanné = plus jamais de saisie lors d'un accident.
        </div>
        <button onClick={onAccount} className="mt-2.5 text-[13px] px-3.5 py-[9px]">
          Gérer mon garage →
        </button>
      </div>

      {/* Recharger si peu de crédits */}
      {authUser.credits <= 2 && (
        <div className="rounded-xl p-3.5 bg-[#1a1000]" style={{ border: '1px solid #3a2000' }}>
          <div className="font-bold mb-1.5 text-[#fbbf24]">⚡ Il vous reste seulement {authUser.credits} crédit{authUser.credits > 1 ? 's' : ''}</div>
          <div className="text-[#d0d0d0] text-[13px] mb-2.5">
            Rechargez maintenant et profitez des remises sur les packs famille et entreprise.
          </div>
          <button onClick={onBuyPack} style={primaryBtnStyle}>
            Recharger mes crédits →
          </button>
        </div>
      )}
    </div>
  );
});

// ── Sub-components ────────────────────────────────────────────
function Benefit({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2" style={{ padding: '8px 0', borderBottom: '1px solid #111' }}>
      <span className="text-lg shrink-0">{icon}</span>
      <span className="text-[13px] leading-normal text-[#ccc]">{text}</span>
    </div>
  );
}

function Scenario({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="bg-[#111] rounded-lg flex gap-2.5 items-start px-3 py-2.5">
      <span className="text-base shrink-0">{icon}</span>
      <span className="text-[#d0d0d0] text-xs leading-normal">{text}</span>
    </div>
  );
}

function PackChoice({ onSelect }: { onSelect: () => void }) {
  const packs = [
    { id: 'single', label: '1 constat', price: '4.90', note: 'Usage ponctuel' },
    { id: 'pack3', label: '3 constats', price: '12.90', note: 'Famille · économie 12%', star: true },
    { id: 'pack10', label: '10 constats', price: '34.90', note: 'Entreprise · économie 29%' },
  ];
  return (
    <div className="flex gap-2">
      {packs.map(p => (
        <button key={p.id} onClick={onSelect} className="flex-1 rounded-[10px] cursor-pointer" style={{ background: p.star ? '#FF3500' : '#1a1a1a', border: `1px solid ${p.star ? '#FF3500' : '#333'}`, padding: '10px 8px', textAlign: 'center' as const }}>
          {p.star && <div className="text-white text-[9px] font-bold mb-[3px]" >⭐ POPULAIRE</div>}
          <div className="text-white font-bold text-[13px]">{p.label}</div>
          <div className="font-black text-base" style={{ color: p.star ? '#ffd0c0' : '#FF5533' }}>CHF {p.price}</div>
          <div className="text-[10px] mt-0.5"  style={{ color: p.star ? 'rgba(255,255,255,0.6)' : '#aaa' }}>{p.note}</div>
        </button>
      ))}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const containerStyle: React.CSSProperties = {
  marginTop: 24,
  borderTop: '1px solid #1a1a1a',
  paddingTop: 24,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  marginBottom: 20,
};

const emojiStyle: React.CSSProperties = {
  width: 48, height: 48,
  background: '#FF3500',
  borderRadius: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 24, flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  color: '#fff',
  fontWeight: 900,
  fontSize: 18,
  lineHeight: 1.2,
};

const subtitleStyle: React.CSSProperties = {
  color: '#d0d0d0',
  fontSize: 13,
  marginTop: 3,
};

const benefitsGrid: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  marginBottom: 20,
  background: '#111',
  borderRadius: 12,
  padding: '4px 16px',
  border: '1px solid #1a1a1a',
};

const packCardStyle: React.CSSProperties = {
  background: '#111',
  border: '1px solid #2a1a0a',
  borderRadius: 14,
  padding: 16,
  marginBottom: 12,
};

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  background: '#FF3500',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: '14px 20px',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  textAlign: 'center' as const,
};

const ghostBtnStyle: React.CSSProperties = {
  width: '100%',
  background: 'none',
  color: '#d0d0d0',
  border: '1px solid #333',
  borderRadius: 10,
  padding: '11px 16px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'center' as const,
};

const dividerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  margin: '16px 0',
};

const dividerLine: React.CSSProperties = { flex: 1, height: 1, background: '#1a1a1a' };
const dividerText: React.CSSProperties = { color: '#c0c0c0', fontSize: 11, whiteSpace: 'nowrap' as const };

