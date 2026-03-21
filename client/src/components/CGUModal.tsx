import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../trpc';

interface Props {
  onAccept: (email: string, consentMarketing: boolean) => void;
  onClose: () => void;
}

export function CGUModal({ onAccept, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [consentCGU, setConsentCGU] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [tab, setTab] = useState<'cgu' | 'privacy'>('cgu');
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
  const canProceed = isValidEmail(email) && consentCGU;

  const saveConsentMutation = trpc.user.saveConsent.useMutation({
    onSuccess: () => { onAccept(email, consentMarketing); },
    onError: (err) => { setError(err.message || t('cgu.error_network')); },
  });

  const handleSubmit = () => {
    if (!canProceed) return;
    setError(null);
    saveConsentMutation.mutate({
      email,
      consentCGU: true,
      consentMarketing,
      language: i18n.language?.split('-')[0] || 'fr',
    });
  };

  const loading = saveConsentMutation.isPending;

  const cguSections = t('cgu.cgu_sections', { returnObjects: true }) as { title: string; text: string }[];
  const privacySections = t('cgu.privacy_sections', { returnObjects: true }) as { title: string; text: string }[];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#0E0E18',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px 24px 0 0',
        maxHeight: '90svh',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--boom)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>💥</div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>boom.contact</div>
          </div>
          <div style={{ fontSize: 11, opacity: 0.4, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 16 }}>{t('cgu.before_continue')}</div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 0 }}>
            {([['cgu', t('cgu.tab_cgu')], ['privacy', t('cgu.tab_privacy')]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
                color: tab === id ? 'var(--boom)' : 'rgba(240,237,232,0.45)',
                borderBottom: tab === id ? '2px solid var(--boom)' : '2px solid transparent',
                fontSize: 12, fontWeight: tab === id ? 700 : 400,
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {tab === 'cgu' ? (
            <div style={{ fontSize: 12, lineHeight: 1.75, color: 'rgba(240,237,232,0.75)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>{t('cgu.cgu_title')}</div>
              <div style={{ fontSize: 10, opacity: 0.4, marginBottom: 16, fontFamily: 'monospace' }}>{t('cgu.cgu_version')}</div>
              {cguSections.map((s, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontSize: 12 }}>{s.title}</div>
                  <div>{s.text}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, lineHeight: 1.75, color: 'rgba(240,237,232,0.75)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>{t('cgu.privacy_title')}</div>
              <div style={{ fontSize: 10, opacity: 0.4, marginBottom: 16, fontFamily: 'monospace' }}>{t('cgu.privacy_version')}</div>
              {privacySections.map((s, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontSize: 12 }}>{s.title}</div>
                  <div>{s.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom action area */}
        <div style={{ padding: '16px 24px 32px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6, letterSpacing: 0.5 }}>{t('cgu.email_label')}</div>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder={t('cgu.email_placeholder')}
              className="input-boom" style={{ width: '100%' }}
            />
          </div>

          {/* CGU consent (required) */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10, cursor: 'pointer' }}>
            <div onClick={() => setConsentCGU(!consentCGU)} style={{
              width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
              border: consentCGU ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
              background: consentCGU ? 'var(--boom)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
            }}>
              {consentCGU && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.8 }}>
              {/* Parse the consent string with embedded <cgu> and <privacy> tags */}
              {t('cgu.consent_cgu').split(/(<cgu>.*?<\/cgu>|<privacy>.*?<\/privacy>)/g).map((part, i) => {
                if (part.startsWith('<cgu>')) return (
                  <span key={i} onClick={() => setTab('cgu')} style={{ color: 'var(--boom)', cursor: 'pointer', textDecoration: 'underline' }}>
                    {part.replace(/<\/?cgu>/g, '')}
                  </span>
                );
                if (part.startsWith('<privacy>')) return (
                  <span key={i} onClick={() => setTab('privacy')} style={{ color: 'var(--boom)', cursor: 'pointer', textDecoration: 'underline' }}>
                    {part.replace(/<\/?privacy>/g, '')}
                  </span>
                );
                return <span key={i}>{part}</span>;
              })}
              {' '}<span style={{ color: 'var(--boom)' }}>*</span>
            </div>
          </label>

          {/* Marketing consent (optional) */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, cursor: 'pointer' }}>
            <div onClick={() => setConsentMarketing(!consentMarketing)} style={{
              width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
              border: consentMarketing ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
              background: consentMarketing ? '#22c55e' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
            }}>
              {consentMarketing && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.65 }}>
              {t('cgu.consent_marketing').split(/(<opt>.*?<\/opt>)/g).map((part, i) => {
                if (part.startsWith('<opt>')) return (
                  <span key={i} style={{ opacity: 0.5 }}>{part.replace(/<\/?opt>/g, '')}</span>
                );
                return <span key={i}>{part}</span>;
              })}
            </div>
          </label>

          {error && (
            <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', fontSize: 12, color: '#ef4444' }}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={!canProceed || loading} style={{
            width: '100%', padding: '16px', borderRadius: 12, border: 'none',
            background: canProceed ? 'var(--boom)' : 'rgba(255,255,255,0.08)',
            color: canProceed ? '#fff' : 'rgba(255,255,255,0.3)',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            fontSize: 15, fontWeight: 700, transition: 'all 0.2s',
          }}>
            {loading ? t('common.saving') : t('cgu.submit')}
          </button>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10, opacity: 0.3 }}>
            {t('cgu.required_note')}
          </div>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}
