import { useState } from 'react';
import { trpc } from '../trpc';

type AuthMode = 'choose' | 'magic' | 'password' | 'register' | 'magic_sent';

interface AuthModalProps {
  onAuth: (token: string, user: any) => void;
  onSkip: () => void;              // Continuer sans compte
  title?: string;
  subtitle?: string;
}

export function AuthModal({ onAuth, onSkip, title, subtitle }: AuthModalProps) {
  const [mode, setMode]       = useState<AuthMode>('choose');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const magicReqMut  = trpc.auth.magicLinkRequest.useMutation();
  const magicVerMut  = trpc.auth.magicLinkVerify.useMutation();
  const loginMut     = trpc.auth.login.useMutation();
  const registerMut  = trpc.auth.register.useMutation();

  const handleMagicRequest = async () => {
    if (!email) return;
    setLoading(true); setError('');
    try {
      await magicReqMut.mutateAsync({ email });
      setMode('magic_sent');
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally { setLoading(false); }
  };

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true); setError('');
    try {
      const res = await loginMut.mutateAsync({ email, password });
      localStorage.setItem('boom_user_token', res.token);
      localStorage.setItem('boom_user', JSON.stringify(res.user));
      onAuth(res.token, res.user);
    } catch (e: any) {
      setError('Email ou mot de passe incorrect.');
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!email || !password) return;
    setLoading(true); setError('');
    try {
      const res = await registerMut.mutateAsync({ email, password });
      localStorage.setItem('boom_user_token', res.token);
      localStorage.setItem('boom_user', JSON.stringify({ id: res.id, email, role: 'customer', credits: 0 }));
      onAuth(res.token, { id: res.id, email, role: 'customer', credits: 0 });
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'inscription.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#111', border: '1px solid #222', borderRadius: 20,
        padding: 32, width: '100%', maxWidth: 420, position: 'relative',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
            {title || '💥 boom.contact'}
          </div>
          <div style={{ color: '#888', fontSize: 14, lineHeight: 1.5 }}>
            {subtitle || 'Connectez-vous pour sauvegarder vos véhicules et ne plus rien saisir lors de vos constats.'}
          </div>
        </div>

        {/* MODE: choose */}
        {mode === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => setMode('magic')} style={btnStyle('#FF3500')}>
              📧 Connexion par lien email (recommandé)
            </button>
            <button onClick={() => setMode('password')} style={btnStyle('#222')}>
              🔑 Connexion avec mot de passe
            </button>
            <button onClick={() => setMode('register')} style={btnStyle('#222')}>
              ✨ Créer un compte
            </button>
            <div style={{ borderTop: '1px solid #222', marginTop: 4 }} />
            <button onClick={onSkip} style={{ ...btnStyle('transparent'), color: '#888', border: '1px solid #333' }}>
              Continuer sans compte →
            </button>
            <p style={{ color: '#555', fontSize: 11, textAlign: 'center', margin: 0 }}>
              Sans compte, vous pouvez quand même faire un constat et payer avec Stripe.
            </p>
          </div>
        )}

        {/* MODE: magic link */}
        {mode === 'magic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: '#ccc', fontSize: 14, marginBottom: 4 }}>
              Entrez votre email — vous recevrez un lien de connexion valable 15 minutes.
            </div>
            <input
              type="email" placeholder="votre@email.com" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleMagicRequest()}
              style={inputStyle}
            />
            {error && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</div>}
            <button onClick={handleMagicRequest} disabled={loading || !email} style={btnStyle('#FF3500')}>
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
            <button onClick={() => setMode('choose')} style={linkStyle}>← Retour</button>
          </div>
        )}

        {/* MODE: magic sent */}
        {mode === 'magic_sent' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
              Email envoyé !
            </div>
            <div style={{ color: '#888', fontSize: 14, lineHeight: 1.6 }}>
              Vérifiez votre boîte <strong style={{ color: '#fff' }}>{email}</strong>.<br />
              Le lien est valable 15 minutes.
            </div>
            <div style={{ marginTop: 24, borderTop: '1px solid #222', paddingTop: 20 }}>
              <button onClick={onSkip} style={{ ...btnStyle('transparent'), color: '#888', border: '1px solid #333' }}>
                Continuer sans compte →
              </button>
            </div>
          </div>
        )}

        {/* MODE: password login */}
        {mode === 'password' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password" placeholder="Mot de passe" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={inputStyle}
            />
            {error && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</div>}
            <button onClick={handleLogin} disabled={loading || !email || !password} style={btnStyle('#FF3500')}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
            <button onClick={() => { setMode('magic'); setError(''); }} style={linkStyle}>
              Mot de passe oublié ? Utiliser un lien email →
            </button>
            <button onClick={() => setMode('choose')} style={linkStyle}>← Retour</button>
          </div>
        )}

        {/* MODE: register */}
        {mode === 'register' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.5 }}>
              Créez votre compte pour sauvegarder vos véhicules et pré-remplir vos constats automatiquement.
            </div>
            <input
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password" placeholder="Mot de passe (min. 6 caractères)" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              style={inputStyle}
            />
            {error && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</div>}
            <button onClick={handleRegister} disabled={loading || !email || !password} style={btnStyle('#FF3500')}>
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
            <p style={{ color: '#555', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
              En créant un compte vous acceptez nos CGU. Vos données véhicule sont chiffrées et jamais partagées sans votre consentement.
            </p>
            <button onClick={() => setMode('choose')} style={linkStyle}>← Retour</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: '#1a1a1a', border: '1px solid #333', borderRadius: 10,
  color: '#fff', padding: '12px 14px', fontSize: 15, width: '100%',
  boxSizing: 'border-box', outline: 'none',
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg, color: bg === 'transparent' ? '#888' : '#fff',
    border: 'none', borderRadius: 10, padding: '13px 16px',
    fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%',
    transition: 'opacity 0.15s',
  };
}

const linkStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#666',
  fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0,
  textAlign: 'left' as const,
};
