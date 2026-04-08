import { useState } from 'react';
import { trpc } from '../trpc';
import { useFocusTrap } from '../hooks/useFocusTrap';

type AuthMode = 'choose' | 'magic' | 'password' | 'register' | 'magic_sent';

interface AuthModalProps {
  onAuth: (token: string, user: Record<string, unknown>) => void;
  onSkip: () => void;
  title?: string;
  subtitle?: string;
}

export function AuthModal({ onAuth, onSkip, title, subtitle }: AuthModalProps) {
  const [mode, setMode]         = useState<AuthMode>('choose');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const modalRef = useFocusTrap<HTMLDivElement>(onSkip);
  const magicReqMut  = trpc.auth.magicLinkRequest.useMutation();
  const loginMut     = trpc.auth.login.useMutation();
  const registerMut  = trpc.auth.register.useMutation();

  const handleMagicRequest = async () => {
    if (!email) return;
    setLoading(true); setError('');
    try {
      await magicReqMut.mutateAsync({ email });
      setMode('magic_sent');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
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
    } catch (e: unknown) {
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'inscription.");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Authentification" className="rounded-[20px] p-8 w-full max-w-[420px] relative bg-[#111]" style={{ border: '1px solid #444' }}>
        <div className="mb-6">
          <h2 className="text-[28px] font-extrabold text-white mb-1.5">
            {title || '💥 boom.contact'}
          </h2>
          <div className="text-[#d0d0d0] text-sm leading-normal">
            {subtitle || 'Connectez-vous pour sauvegarder vos véhicules et ne plus rien saisir lors de vos constats.'}
          </div>
        </div>

        {/* MODE: choose */}
        {mode === 'choose' && (
          <div className="flex flex-col gap-3">
            <button onClick={() => setMode('magic')} style={btnStyle('#D42D00')}>
              📧 Connexion par lien email (recommandé)
            </button>
            <button onClick={() => setMode('password')} style={btnStyle('#444')}>
              🔑 Connexion avec mot de passe
            </button>
            <button onClick={() => setMode('register')} style={btnStyle('#444')}>
              ✨ Créer un compte
            </button>
            <div className="mt-1" style={{ borderTop: '1px solid #444' }} />
            <button onClick={onSkip} className="text-[#d0d0d0]" style={{ border: '1px solid #555' }}>
              Continuer sans compte →
            </button>
            <p className="text-[#d0d0d0] text-[11px] text-center m-0">
              Sans compte, vous pouvez quand même faire un constat et payer avec Stripe.
            </p>
          </div>
        )}

        {/* MODE: magic link */}
        {mode === 'magic' && (
          <div className="flex flex-col gap-3">
            <div className="text-sm mb-1 text-[#ccc]">
              Entrez votre email — vous recevrez un lien de connexion valable 15 minutes.
            </div>
            <input
              type="email" placeholder="votre@email.com" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleMagicRequest()}
              onFocus={(e) => e.currentTarget.style.outline = '2px solid #FF3500'}
              onBlur={(e) => e.currentTarget.style.outline = 'none'}
              aria-label="Adresse email"
              aria-describedby={error ? "error-magic" : undefined}
              style={inputStyle}
            />
            {error && <div id="error-magic" role="alert" className="text-[13px] text-[#ff6b6b]">{error}</div>}
            <button onClick={handleMagicRequest} disabled={loading || !email} style={btnStyle('#D42D00')}>
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
            <button onClick={() => setMode('choose')} style={linkStyle}>← Retour</button>
          </div>
        )}

        {/* MODE: magic sent */}
        {mode === 'magic_sent' && (
          <div className="text-center">
            <div className="text-5xl mb-4" aria-hidden="true">📧</div>
            <div className="text-white font-bold text-lg mb-2">
              Email envoyé !
            </div>
            <div className="text-[#d0d0d0] text-sm leading-relaxed">
              Vérifiez votre boîte <strong className="text-white">{email}</strong>.<br />
              Le lien est valable 15 minutes.
            </div>
            <div className="mt-6 pt-5" style={{ borderTop: '1px solid #444' }}>
              <button onClick={onSkip} className="text-[#d0d0d0]" style={{ border: '1px solid #555' }}>
                Continuer sans compte →
              </button>
            </div>
          </div>
        )}

        {/* MODE: password login */}
        {mode === 'password' && (
          <div className="flex flex-col gap-3">
            <input
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={(e) => e.currentTarget.style.outline = '2px solid #FF3500'}
              onBlur={(e) => e.currentTarget.style.outline = 'none'}
              aria-label="Adresse email"
              aria-describedby={error ? "error-password" : undefined}
              style={inputStyle}
            />
            <input
              type="password" placeholder="Mot de passe" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              onFocus={(e) => e.currentTarget.style.outline = '2px solid #FF3500'}
              onBlur={(e) => e.currentTarget.style.outline = 'none'}
              aria-label="Mot de passe"
              style={inputStyle}
            />
            {error && <div id="error-password" role="alert" className="text-[13px] text-[#ff6b6b]">{error}</div>}
            <button onClick={handleLogin} disabled={loading || !email || !password} style={btnStyle('#D42D00')}>
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
          <div className="flex flex-col gap-3">
            <div className="text-[13px] leading-normal text-[#ccc]">
              Créez votre compte pour sauvegarder vos véhicules et pré-remplir vos constats automatiquement.
            </div>
            <input
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={(e) => e.currentTarget.style.outline = '2px solid #FF3500'}
              onBlur={(e) => e.currentTarget.style.outline = 'none'}
              aria-label="Adresse email"
              aria-describedby={error ? "error-register" : undefined}
              style={inputStyle}
            />
            <input
              type="password" placeholder="Mot de passe (min. 6 caractères)" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              onFocus={(e) => e.currentTarget.style.outline = '2px solid #FF3500'}
              onBlur={(e) => e.currentTarget.style.outline = 'none'}
              aria-label="Mot de passe"
              style={inputStyle}
            />
            {error && <div id="error-register" role="alert" className="text-[13px] text-[#ff6b6b]">{error}</div>}
            <button onClick={handleRegister} disabled={loading || !email || !password} style={btnStyle('#D42D00')}>
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
            <p className="text-[#d0d0d0] text-[11px] m-0 leading-normal">
              En créant un compte vous acceptez nos CGU. Vos données véhicule sont chiffrées et jamais partagées sans votre consentement.
            </p>
            <button onClick={() => setMode('choose')} style={linkStyle}>← Retour</button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#1a1a1a', border: '1px solid #555', borderRadius: 10,
  color: '#fff', padding: '12px 14px', fontSize: 15, width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, outline 0.15s',
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg, color: bg === 'transparent' ? '#b0b0b0' : '#fff',
    border: 'none', borderRadius: 10, padding: '13px 16px',
    fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%',
    transition: 'opacity 0.15s',
  };
}

const linkStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#d0d0d0',
  fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0,
  textAlign: 'left' as const,
};
