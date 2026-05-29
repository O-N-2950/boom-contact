import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../trpc';
import { useFocusTrap } from '../hooks/useFocusTrap';

type AuthMode = 'choose' | 'magic' | 'password' | 'register' | 'magic_sent';

interface AuthModalProps {
  onAuth: (token: string, user: Record<string, unknown>) => void;
  onSkip: () => void;
  title?: string;
  subtitle?: string;
}

// Palette claire "Hybrid" — cohérente avec le reste de l'app (BugReport / ShareBoom / CGU)
const C = {
  card: '#FFFFFF', bg: '#F5F8FC', elevated: '#EEF4FA',
  text: '#102033', sec: '#5D6B7C', orange: '#FF6B1A', orangeDark: '#F05A0A',
  navy: '#123A5A', border: '#DDE7F0', danger: '#DC2626',
};
const FONT = 'Manrope, ui-sans-serif, system-ui, sans-serif';

export function AuthModal({ onAuth, onSkip, title, subtitle }: AuthModalProps) {
  const { t } = useTranslation();
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
      setError(e instanceof Error ? e.message : t('auth.generic_error'));
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
    } catch {
      setError(t('auth.login_error'));
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!email || !password) return;
    setLoading(true); setError('');
    try {
      const res = await registerMut.mutateAsync({ email, password });
      localStorage.setItem('boom_user_token', res.token);
      localStorage.setItem('boom_user', JSON.stringify({ id: (res as any).id, email, role: 'customer', credits: 0 }));
      onAuth(res.token, { id: (res as any).id, email, role: 'customer', credits: 0 });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('auth.register_error'));
    } finally { setLoading(false); }
  };

  const errorBox = (id: string) => error && (
    <div id={id} role="alert" style={{ background: 'rgba(220,38,38,0.08)', border: `1px solid rgba(220,38,38,0.25)`, borderRadius: 10, padding: '9px 12px', color: C.danger, fontSize: 13 }}>
      {error}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(16,32,51,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Authentification"
        className="rounded-[20px] p-7 w-full max-w-[420px] relative"
        style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: '0 20px 50px rgba(16,32,51,0.22)', color: C.text, fontFamily: FONT }}>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span aria-hidden="true" className="text-[22px]">💥</span>
            <h2 className="text-[24px] font-extrabold m-0" style={{ color: C.text, letterSpacing: '-0.02em' }}>
              {title || 'boom.contact'}
            </h2>
          </div>
          <div className="text-[14px] leading-normal" style={{ color: C.sec }}>
            {subtitle || t('auth.default_subtitle')}
          </div>
        </div>

        {/* MODE: choose */}
        {mode === 'choose' && (
          <div className="flex flex-col gap-3">
            <button onClick={() => setMode('magic')} style={btn('primary')}>
              {t('auth.magic_btn')}
            </button>
            <button onClick={() => setMode('password')} style={btn('secondary')}>
              {t('auth.password_btn')}
            </button>
            <button onClick={() => setMode('register')} style={btn('secondary')}>
              {t('auth.register_btn')}
            </button>
            <div className="my-1" style={{ borderTop: `1px solid ${C.border}` }} />
            <button onClick={onSkip} style={btn('ghost')}>
              {t('auth.skip_btn')}
            </button>
            <p className="text-[11px] text-center m-0" style={{ color: C.sec }}>
              {t('auth.skip_note')}
            </p>
          </div>
        )}

        {/* MODE: magic link */}
        {mode === 'magic' && (
          <div className="flex flex-col gap-3">
            <div className="text-[14px] mb-1" style={{ color: C.sec }}>
              {t('auth.magic_instructions')}
            </div>
            <input
              type="email" placeholder="votre@email.com" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleMagicRequest()}
              onFocus={(e) => e.currentTarget.style.outline = `2px solid ${C.orange}`}
              onBlur={(e) => e.currentTarget.style.outline = 'none'}
              aria-label="Email"
              aria-describedby={error ? 'error-magic' : undefined}
              style={input}
            />
            {errorBox('error-magic')}
            <button onClick={handleMagicRequest} disabled={loading || !email} style={btn('primary', loading || !email)}>
              {loading ? t('auth.sending') : t('auth.send_link')}
            </button>
            <button onClick={() => { setMode('choose'); setError(''); }} style={link}>{t('auth.back')}</button>
          </div>
        )}

        {/* MODE: magic sent */}
        {mode === 'magic_sent' && (
          <div className="text-center">
            <div className="text-5xl mb-4" aria-hidden="true">📧</div>
            <div className="font-bold text-lg mb-2" style={{ color: C.text }}>
              {t('auth.email_sent_title')}
            </div>
            <div className="text-[14px] leading-relaxed" style={{ color: C.sec }} dangerouslySetInnerHTML={{ __html: t('auth.email_sent_desc', { email }) }} />
            <div className="text-[14px] leading-relaxed" style={{ color: C.sec }}>
              {t('auth.email_sent_validity')}
            </div>
            <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${C.border}` }}>
              <button onClick={onSkip} style={btn('ghost')}>
                {t('auth.skip_btn')}
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
              onFocus={(e) => e.currentTarget.style.outline = `2px solid ${C.orange}`}
              onBlur={(e) => e.currentTarget.style.outline = 'none'}
              aria-label="Email"
              aria-describedby={error ? 'error-password' : undefined}
              style={input}
            />
            <input
              type="password" placeholder={t('auth.password_placeholder')} value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              onFocus={(e) => e.currentTarget.style.outline = `2px solid ${C.orange}`}
              onBlur={(e) => e.currentTarget.style.outline = 'none'}
              aria-label={t('auth.password_placeholder')}
              style={input}
            />
            {errorBox('error-password')}
            <button onClick={handleLogin} disabled={loading || !email || !password} style={btn('primary', loading || !email || !password)}>
              {loading ? t('auth.logging_in') : t('auth.login_btn')}
            </button>
            <button onClick={() => { setMode('magic'); setError(''); }} style={link}>
              {t('auth.forgot_password')}
            </button>
            <button onClick={() => { setMode('choose'); setError(''); }} style={link}>{t('auth.back')}</button>
          </div>
        )}

        {/* MODE: register */}
        {mode === 'register' && (
          <div className="flex flex-col gap-3">
            <div className="text-[13px] leading-normal" style={{ color: C.sec }}>
              {t('auth.register_desc')}
            </div>
            <input
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={(e) => e.currentTarget.style.outline = `2px solid ${C.orange}`}
              onBlur={(e) => e.currentTarget.style.outline = 'none'}
              aria-label="Email"
              aria-describedby={error ? 'error-register' : undefined}
              style={input}
            />
            <input
              type="password" placeholder={t('auth.password_placeholder')} value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              onFocus={(e) => e.currentTarget.style.outline = `2px solid ${C.orange}`}
              onBlur={(e) => e.currentTarget.style.outline = 'none'}
              aria-label={t('auth.password_placeholder')}
              style={input}
            />
            {errorBox('error-register')}
            <button onClick={handleRegister} disabled={loading || !email || !password} style={btn('primary', loading || !email || !password)}>
              {loading ? t('auth.creating') : t('auth.create_btn')}
            </button>
            <p className="text-[11px] m-0 leading-normal" style={{ color: C.sec }}>
              {t('auth.register_legal')}
            </p>
            <button onClick={() => { setMode('choose'); setError(''); }} style={link}>{t('auth.back')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

const input: React.CSSProperties = {
  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
  color: C.text, padding: '12px 14px', fontSize: 15, width: '100%',
  boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color 0.15s, outline 0.15s',
};

function btn(variant: 'primary' | 'secondary' | 'ghost', disabled = false): React.CSSProperties {
  const base: React.CSSProperties = {
    border: 'none', borderRadius: 12, padding: '13px 16px',
    fontSize: 15, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', width: '100%',
    fontFamily: 'inherit', transition: 'opacity 0.15s, background 0.15s', opacity: disabled ? 0.55 : 1,
  };
  if (variant === 'primary') return { ...base, background: C.orange, color: '#fff' };
  if (variant === 'secondary') return { ...base, background: C.elevated, color: C.navy, fontWeight: 600 };
  return { ...base, background: 'transparent', color: C.sec, border: `1px solid ${C.border}`, fontWeight: 600 };
}

const link: React.CSSProperties = {
  background: 'none', border: 'none', color: C.sec,
  fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0,
  textAlign: 'left' as const, fontFamily: 'inherit',
};
