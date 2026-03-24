import { useState } from 'react';
import { trpc } from '../../trpc';

interface PostConstatCTAProps {
  sessionId: string;
  authToken?: string;
  authUser?: { id: string; email: string; role: string; credits: number } | null;
  onLogin: () => void;         // Opens AuthModal
  onAccount: () => void;       // Opens AccountPage
  onBuyPack: () => void;       // Opens PricingPage
}

export function PostConstatCTA({
  sessionId,
  authToken,
  authUser,
  onLogin,
  onAccount,
  onBuyPack,
}: PostConstatCTAProps) {
  const [waLinkCopied, setWaLinkCopied] = useState(false);
  const [giftResult, setGiftResult]     = useState('');

  const grantMut = trpc.auth.grantCredits.useMutation();

  const sendGift = async (credits: number) => {
    try {
      const r = await grantMut.mutateAsync({ credits, sendEmail: false });
      window.open(r.waUrl, '_blank');
      setGiftResult(`✅ Lien créé — envoyez-le par WhatsApp !`);
    } catch (e: any) {
      setGiftResult('Erreur : ' + e.message);
    }
  };

  // ── Mode 1 : Utilisateur NON CONNECTÉ ────────────────────
  if (!authUser) {
    return (
      <div style={containerStyle}>
        {/* Accroche émotionnelle */}
        <div style={headerStyle}>
          <div style={emojiStyle}>⚡</div>
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

        {/* Rappel garage — juste après inscription */}
        <div style={{
          marginTop: 10, padding: '12px 16px', borderRadius: 12,
          background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 22 }}>🚗</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(240,237,232,0.9)' }}>
              Ensuite, enregistre ton véhicule
            </div>
            <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>
              Scan permis de circuler + carte verte · 30 sec · plus jamais à resaisir
            </div>
          </div>
          <span style={{ fontSize: 16, opacity: 0.4 }}>›</span>
        </div>

        <div style={dividerStyle}>
          <div style={dividerLine} />
          <span style={dividerText}>ou passez directement</span>
          <div style={dividerLine} />
        </div>

        {/* Pack famille */}
        <div style={packCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ color: '#FF3500', fontWeight: 900, fontSize: 16 }}>🔥 Pack famille</div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>3 constats à partager avec vos proches</div>
            </div>
            <div style={{ textAlign: 'right' as const }}>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 22 }}>12.90</div>
              <div style={{ color: '#666', fontSize: 11 }}>CHF / EUR</div>
            </div>
          </div>

          {/* Scénarios marketing */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 14 }}>
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
          <div style={emojiStyle}>🎯</div>
          <div>
            <div style={titleStyle}>Prêt pour la prochaine fois</div>
            <div style={subtitleStyle}>Rechargez maintenant, partagez quand vous voulez</div>
          </div>
        </div>

        <div style={{ background: '#0d1a0d', border: '1px solid #1a3a1a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ color: '#4ade80', fontWeight: 700, marginBottom: 10 }}>✅ Votre compte boom.contact</div>
          <div style={{ color: '#888', fontSize: 13, lineHeight: 1.6 }}>
            Vos véhicules sont mémorisés. Lors de votre prochain accident, vous partez directement à l'étape QR — aucune saisie, aucun scan.
          </div>
          <button onClick={onAccount} style={{ ...ghostBtnStyle, marginTop: 10, padding: '8px 14px', fontSize: 12 }}>
            Gérer mon garage →
          </button>
        </div>

        {/* Packs avec focus "offrir" */}
        <div style={packCardStyle}>
          <div style={{ color: '#FF3500', fontWeight: 900, fontSize: 15, marginBottom: 6 }}>
            🎁 Offrez un constat par WhatsApp
          </div>
          <div style={{ color: '#888', fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
            Un de vos crédits = un lien unique à envoyer à <strong style={{ color: '#fff' }}>n'importe qui</strong>, sans que la personne ait besoin d'un compte.
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
        <div style={emojiStyle}>💪</div>
        <div>
          <div style={titleStyle}>{authUser.credits} crédit{authUser.credits > 1 ? 's' : ''} disponible{authUser.credits > 1 ? 's' : ''}</div>
          <div style={subtitleStyle}>Partagez, protégez vos proches</div>
        </div>
      </div>

      {/* Envoyer par WhatsApp */}
      <div style={{ background: '#0d1a1a', border: '1px solid #1a3a3a', borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ color: '#60c8f0', fontWeight: 700, marginBottom: 8 }}>📲 Offrir un constat par WhatsApp</div>
        <div style={{ color: '#888', fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
          En 1 clic, envoyez un lien à votre enfant, employé ou ami. Il fait son constat sans compte ni paiement — décompté de vos crédits.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => sendGift(1)} disabled={grantMut.isPending} style={{
            flex: 1, background: '#25D366', color: '#fff', border: 'none',
            borderRadius: 8, padding: '11px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 13,
          }}>
            {grantMut.isPending ? '...' : '📲 Envoyer 1 constat'}
          </button>
          <button onClick={() => sendGift(3)} disabled={grantMut.isPending || authUser.credits < 3} style={{
            flex: 1, background: authUser.credits >= 3 ? '#1da851' : '#1a1a1a',
            color: authUser.credits >= 3 ? '#fff' : '#555',
            border: `1px solid ${authUser.credits >= 3 ? '#1da851' : '#333'}`,
            borderRadius: 8, padding: '11px 12px', fontWeight: 700, cursor: authUser.credits >= 3 ? 'pointer' : 'default', fontSize: 13,
          }}>
            📲 Envoyer 3 constats
          </button>
        </div>
        {giftResult && <div style={{ color: '#4ade80', fontSize: 12, marginTop: 8 }}>{giftResult}</div>}
      </div>

      {/* Garage */}
      <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <div style={{ color: '#fff', fontWeight: 700, marginBottom: 6 }}>🚗 Mémorisez vos autres véhicules</div>
        <div style={{ color: '#888', fontSize: 13, lineHeight: 1.5 }}>
          Flotte d'entreprise, moto, camping-car ? Chaque véhicule scanné = plus jamais de saisie lors d'un accident.
        </div>
        <button onClick={onAccount} style={{ ...ghostBtnStyle, marginTop: 10, padding: '9px 14px', fontSize: 13 }}>
          Gérer mon garage →
        </button>
      </div>

      {/* Recharger si peu de crédits */}
      {authUser.credits <= 2 && (
        <div style={{ background: '#1a1000', border: '1px solid #3a2000', borderRadius: 12, padding: 14 }}>
          <div style={{ color: '#fbbf24', fontWeight: 700, marginBottom: 6 }}>⚡ Il vous reste seulement {authUser.credits} crédit{authUser.credits > 1 ? 's' : ''}</div>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 10 }}>
            Rechargez maintenant et profitez des remises sur les packs famille et entreprise.
          </div>
          <button onClick={onBuyPack} style={primaryBtnStyle}>
            Recharger mes crédits →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────
function Benefit({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: '1px solid #111' }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <span style={{ color: '#ccc', fontSize: 13, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function Scenario({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <span style={{ color: '#888', fontSize: 12, lineHeight: 1.5 }}>{text}</span>
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
    <div style={{ display: 'flex', gap: 8 }}>
      {packs.map(p => (
        <button key={p.id} onClick={onSelect} style={{
          flex: 1, background: p.star ? '#FF3500' : '#1a1a1a',
          border: `1px solid ${p.star ? '#FF3500' : '#333'}`,
          borderRadius: 10, padding: '10px 8px', cursor: 'pointer', textAlign: 'center' as const,
        }}>
          {p.star && <div style={{ color: '#fff', fontSize: 9, fontWeight: 700, marginBottom: 3 }}>⭐ POPULAIRE</div>}
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{p.label}</div>
          <div style={{ color: p.star ? '#ffd0c0' : '#FF3500', fontWeight: 900, fontSize: 16 }}>CHF {p.price}</div>
          <div style={{ color: p.star ? 'rgba(255,255,255,0.6)' : '#555', fontSize: 10, marginTop: 2 }}>{p.note}</div>
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
  color: '#666',
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
  color: '#888',
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
const dividerText: React.CSSProperties = { color: '#444', fontSize: 11, whiteSpace: 'nowrap' as const };

