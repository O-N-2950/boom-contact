import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../trpc';
import { useFocusTrap } from '../hooks/useFocusTrap';

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

  // Checkbox marketing PEP's uniquement pour la Suisse
  const detectedCountry = sessionStorage.getItem('boom_detected_country') || '';
  const lang = i18n.language?.split('-')[0] || 'fr';
  const isSwiss = detectedCountry === 'CH'
    || detectedCountry === 'LI'
    || (!detectedCountry && ['fr', 'de', 'it'].includes(lang));

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
  const canProceed = isValidEmail(email) && consentCGU;

  const modalRef = useFocusTrap<HTMLDivElement>(onClose);
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
    <div className="fixed inset-0 z-[1000] flex items-end justify-center" style={{ background: 'rgba(16,32,51,0.55)', backdropFilter: 'blur(8px)' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Conditions générales" className="w-full max-w-[480px] flex flex-col bg-[#FFFFFF]" style={{ border: '1px solid #DDE7F0', borderRadius: '24px 24px 0 0', maxHeight: '90svh', color: '#102033', fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif", animation: 'slideUp 0.3s ease' }}>
        {/* Handle */}
        <div className="flex justify-center" style={{ padding: '12px 0 0' }}>
          <div className="w-10 h-1 rounded-sm" style={{ background: '#DDE7F0' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '16px 24px 0' }}>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex items-center justify-center text-sm w-7 h-7 rounded-[7px]"  style={{ background: '#FF6B1A' }}>💥</div>
            <div className="font-extrabold text-base">boom.contact</div>
          </div>
          <div className="text-[11px] mb-4 opacity-70 tracking-[1px]" style={{ fontFamily: 'DM Mono, monospace' }}>{t('cgu.before_continue')}</div>

          {/* Tabs */}
          <div className="flex mb-0"  style={{ borderBottom: '1px solid #DDE7F0' }}>
            {([['cgu', t('cgu.tab_cgu')], ['privacy', t('cgu.tab_privacy')]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className="bg-none border-0 cursor-pointer text-xs px-4 py-2" style={{ color: tab === id ? '#FF6B1A' : '#9AA8B6', borderBottom: tab === id ? '2px solid #FF6B1A' : '2px solid transparent', fontWeight: tab === id ? 700 : 400 }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === 'cgu' ? (
            <div className="text-xs leading-[1.75]" style={{ color: '#5D6B7C' }}>
              <div className="font-bold text-[13px] mb-2" style={{ color: '#102033' }}>{t('cgu.cgu_title')}</div>
              <div className="text-[10px] mb-4 opacity-70"  style={{ fontFamily: 'monospace' }}>{t('cgu.cgu_version')}</div>
              {cguSections.map((s, i) => (
                <div key={i} className="mb-4">
                  <div className="font-bold mb-1 text-xs" style={{ color: '#102033' }}>{s.title}</div>
                  <div>{s.text}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs leading-[1.75]" style={{ color: '#5D6B7C' }}>
              <div className="font-bold text-[13px] mb-2" style={{ color: '#102033' }}>{t('cgu.privacy_title')}</div>
              <div className="text-[10px] mb-4 opacity-70"  style={{ fontFamily: 'monospace' }}>{t('cgu.privacy_version')}</div>
              {privacySections.map((s, i) => (
                <div key={i} className="mb-4">
                  <div className="font-bold mb-1 text-xs" style={{ color: '#102033' }}>{s.title}</div>
                  <div>{s.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom action area */}
        <div className="shrink-0 px-6 pt-4 pb-8" style={{ borderTop: '1px solid #DDE7F0' }}>
          {/* Email */}
          <div className="mb-3.5">
            <div className="text-[11px] mb-1.5 opacity-75 tracking-[0.5px]">{t('cgu.email_label')}</div>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder={t('cgu.email_placeholder')}
              aria-label="Adresse email"
              className="w-full" style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #DDE7F0", background: "#F5F8FC", color: "#102033", fontSize: 14, boxSizing: "border-box" }} />
          </div>

          {/* CGU consent (required) */}
          <label className="flex items-start gap-3 mb-2.5 cursor-pointer">
            <input type="checkbox" checked={consentCGU} onChange={() => setConsentCGU(!consentCGU)} aria-label="Accepter les conditions générales" required className="w-5 h-5 rounded-[5px] shrink-0 mt-px cursor-pointer" style={{ accentColor: '#FF6B1A' }} />
            <div className="text-xs leading-normal opacity-80" >
              {/* Parse the consent string with embedded <cgu> and <privacy> tags */}
              {t('cgu.consent_cgu').split(/(<cgu>.*?<\/cgu>|<privacy>.*?<\/privacy>)/g).map((part, i) => {
                if (part.startsWith('<cgu>')) return (
                  <span key={i} onClick={() => setTab('cgu')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTab('cgu'); } }} role="button" tabIndex={0} className="cursor-pointer underline" style={{ color: '#FF6B1A' }}>
                    {part.replace(/<\/?cgu>/g, '')}
                  </span>
                );
                if (part.startsWith('<privacy>')) return (
                  <span key={i} onClick={() => setTab('privacy')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTab('privacy'); } }} role="button" tabIndex={0} className="cursor-pointer underline" style={{ color: '#FF6B1A' }}>
                    {part.replace(/<\/?privacy>/g, '')}
                  </span>
                );
                return <span key={i}>{part}</span>;
              })}
              {' '}<span style={{ color: '#FF6B1A' }}>*</span>
            </div>
          </label>

          {/* Marketing consent (optional) — Suisse uniquement */}
          {isSwiss && (
          <label className="flex items-start gap-3 mb-4 cursor-pointer">
            <input type="checkbox" checked={consentMarketing} onChange={() => setConsentMarketing(!consentMarketing)} aria-label="Consentement marketing" className="w-5 h-5 rounded-[5px] shrink-0 mt-px cursor-pointer" style={{ accentColor: '#22c55e' }} />
            <div className="text-xs leading-normal opacity-75">
              {t('cgu.consent_marketing').split(/(<opt>.*?<\/opt>)/g).map((part, i) => {
                if (part.startsWith('<opt>')) return (
                  <span key={i} className="opacity-75">{part.replace(/<\/?opt>/g, '')}</span>
                );
                return <span key={i}>{part}</span>;
              })}
            </div>
          </label>
          )}

          {error && (
            <div role="alert" className="mb-2.5 rounded-lg text-xs text-red-500 px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)' }}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={!canProceed || loading} className="w-full p-4 rounded-xl border-0 font-bold transition-all duration-200 text-[15px]" style={{ background: canProceed ? '#FF6B1A' : '#EEF4FA', color: canProceed ? '#fff' : '#5D6B7C', cursor: canProceed ? 'pointer' : 'not-allowed' }}>
            {loading ? t('common.saving') : t('cgu.submit')}
          </button>
          <div className="text-center mt-2 text-[10px] opacity-70" >
            {t('cgu.required_note')}
          </div>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}
