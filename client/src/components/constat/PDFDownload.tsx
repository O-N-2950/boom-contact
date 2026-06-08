import { track } from '../../analytics';
import { EVENTS } from '../../analytics-events';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../../trpc';
import { getPublicOrigin, isNativeApp } from '../../apiBase';

interface Props {
  sessionId: string;
  role: string;
  participantToken?: string;
  driverEmail?: string;
  insurerName?: string;
  driverName?: string;
  authUser?: { id: string; email: string; role: string; credits: number } | null;
  authToken?: string;
  onLogin?: () => void;
  onBuyPack?: () => void;
}

export const PDFDownload = React.memo(function PDFDownload({ sessionId, role, participantToken, driverEmail, insurerName, driverName, authUser, authToken, onLogin, onBuyPack }: Props) {
  const native = isNativeApp();
  const { t } = useTranslation();
  const [loading, setLoading]           = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfBase64, setPdfBase64]       = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [email, setEmail]               = useState(driverEmail || '');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent]       = useState(false);
  const [emailError, setEmailError]     = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(!!driverEmail);
  const [constatQr, setConstatQr] = useState<string>('');

  // M5 — QR généré localement (lib qrcode) au lieu d'un service tiers
  // (api.qrserver.com) : confidentialité (sessionId plus envoyé à un tiers)
  // + fonctionne hors-ligne.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const QRCode = await import('qrcode');
        const url = await QRCode.toDataURL(`${getPublicOrigin()}/?session=${sessionId}`, {
          width: 140, margin: 2, color: { dark: '#F0EDE8', light: '#0E0E18' },
        });
        if (!cancelled) setConstatQr(url);
      } catch (e) { console.warn('[PDFDownload] QR local generation failed', e); }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);
  const [creditUsed, setCreditUsed]     = useState(false);
  const [showPaywall, setShowPaywall]   = useState(false);
  // One-shot: email saisi sans compte
  const [oneshotEmail, setOneshotEmail] = useState(driverEmail || '');
  const [oneshotLoading, setOneshotLoading] = useState(false);

  const pdfMutation    = trpc.pdf.generate.useMutation({
    onSuccess: (data) => { setPdfBase64(data.pdfBase64); setLoading(false); setIsGenerating(false); track(EVENTS.PDF_GENERATION_SUCCESS); },
    onError:   (err)  => { setError(err.message); setLoading(false); setIsGenerating(false); },
  });
  const creditMutation = trpc.payment.consumeForConstat.useMutation({
    onError: (err) => { setError(err.message); setLoading(false); },
  });
  const checkoutMutation = trpc.payment.createCheckout.useMutation({
    onSuccess: (data) => {
      // Redirige vers Stripe Checkout
      window.location.href = data.url;
    },
    onError: (err) => { setError(err.message); setOneshotLoading(false); },
  });
  const emailMutation  = trpc.email.sendToDriver.useMutation({
    onSuccess: () => { setEmailSent(true); setSendingEmail(false); },
    onError:   (err) => { setEmailError(err.message); setSendingEmail(false); },
  });

  // Paiement one-shot sans compte
  const payOneShot = () => {
    if (!oneshotEmail.includes('@')) return;
    setOneshotLoading(true);
    setError(null);
    track(EVENTS.PAYMENT_STARTED, { method: 'oneshot' });
    checkoutMutation.mutate({
      packageId: 'single',
      userEmail: oneshotEmail,
      currency: 'EUR',
      locale: navigator.language?.split('-')[0] || 'fr',
      constatSessionId: sessionId, // pour auto-consommer après paiement
    });
  };

  // Consume 1 credit then generate PDF
  const generateWithCredit = async (): Promise<string | null> => {
    if (pdfBase64) return pdfBase64; // already generated
    if (isGenerating) return null;   // prevent double-click
    setIsGenerating(true);
    setLoading(true);
    setError(null);

    // Consume credit (idempotent — server ignores if already consumed for this session)
    if (!creditUsed && authUser && authUser.role !== 'admin') {
      try {
        const res = await creditMutation.mutateAsync({ sessionId } as any);
        if ((res as any)?.billingSource === 'organization') track(EVENTS.FLEET_WALLET_USED, { billing_source: 'organization' });
        setCreditUsed(true);
      } catch {
        setLoading(false);
        setIsGenerating(false);
        return null;
      }
    }

    return new Promise((resolve) => {
      pdfMutation.mutate({ sessionId, participantToken: participantToken || '' }, {
        onSuccess: (data) => { resolve(data.pdfBase64); },
        onError:   ()     => { resolve(null); },
      });
    });
  };

  // Gate: check auth + credits before generating
  const handleAction = async (action: 'download' | 'email') => {
    // 1. Not logged in → login first
    if (!authUser) {
      onLogin?.();
      return;
    }
    // 2. No credits (admin always passes) → paywall
    if (authUser.role !== 'admin' && authUser.credits <= 0 && !creditUsed) {
      setShowPaywall(true);
      return;
    }
    // 3. Generate
    const b64 = await generateWithCredit();
    if (!b64) return;

    if (action === 'download') {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const blob  = new Blob([bytes], { type: 'application/pdf' });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement('a');
      a.href     = url;
      a.download = `constat-${sessionId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      setShowEmailForm(true);
    }
  };

  const sendEmail = async () => {
    if (!email.includes('@')) return;
    const b64 = pdfBase64 || await generateWithCredit();
    if (!b64) return;
    setSendingEmail(true);
    setEmailError(null);
    emailMutation.mutate({ sessionId, role: role as any, participantToken: participantToken || '', driverEmail: email, pdfBase64: b64 });
  };

  const isAdmin   = authUser?.role === 'admin';
  const hasCredit = isAdmin || (authUser && authUser.credits > 0) || creditUsed;
  const credits   = authUser?.credits ?? 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="mb-2.5 text-[60px]">🎉</div>
        <h2 className="font-bold text-green-500 mb-2 text-[21px]">
          Constat finalisé !
        </h2>
        <p className="text-[13px] opacity-75 leading-[1.7]">
          {t('legal.pdf_ready_body')}
        </p>
        <div className="inline-flex items-center gap-2 mt-2 rounded-[20px] px-3.5 py-[5px]" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <span className="text-[10px] text-green-500 tracking-[1px]" style={{ fontFamily: 'monospace' }}>
            SESSION {sessionId}
          </span>
        </div>
      </div>

      {/* PDF card */}
      <div className="mb-4 p-3.5 rounded-xl" style={{ border: '1px solid rgba(255,53,0,0.2)', background: 'rgba(255,53,0,0.04)' }}>
        <div className="flex items-center gap-3 mb-2.5">
          <div className="w-[38px] h-[38px] rounded-lg flex items-center justify-center text-lg" style={{ background: 'var(--boom)' }}>📄</div>
          <div>
            <div className="font-bold text-[13px]">Constat numérique — boom.contact</div>
            <div className="text-[11px] opacity-70" >{t('legal.pdf_ready_title')}</div>
          </div>
        </div>
        <div className="grid gap-[5px]"  style={{ gridTemplateColumns: '1fr 1fr' }}>
          {['✅ Véhicules','✅ Conducteurs','✅ Assurances','✅ Circonstances','✅ Zones de choc','✅ Signatures'].map((item, i) => (
            <div key={i} className="text-[11px] opacity-75">{item}</div>
          ))}
        </div>
      </div>

      {/* Insurer info */}
      {insurerName && (
        <div className="mb-4 p-3.5 rounded-[10px]" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div className="text-[11px] uppercase mb-1 tracking-[1.5px] opacity-75" style={{ fontFamily: 'monospace' }}>Votre assureur</div>
          <div className="font-bold text-[15px] mb-1">🟢 {insurerName}</div>
          <div className="text-xs leading-normal opacity-75">
            Contactez votre assureur pour déclarer le sinistre.
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 p-3 rounded-lg text-[13px] text-[var(--red)]" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>⚠️ {error}</div>
      )}

      {/* ── PAYWALL — pas connecté ── */}
      {!authUser && native ? (
        <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="font-bold text-sm mb-1.5">{t('access.inactiveTitle', { defaultValue: 'Aucun accès actif' })}</div>
          <div className="text-[13px] mb-3.5 leading-[1.6]" style={{ opacity: 0.78 }}>
            {t('access.inactiveText', { defaultValue: 'Votre compte ne dispose pas d’un accès actif. Connectez-vous avec un compte actif.' })}
          </div>
          <button onClick={() => onLogin?.()} className="w-full p-[13px] rounded-[10px] bg-transparent cursor-pointer text-sm font-medium" style={{ border: '1.5px solid rgba(255,255,255,0.25)', color: 'var(--text)' }}>
            {t('access.login', { defaultValue: 'Se connecter' })}
          </button>
        </div>
      ) : !authUser ? (
        <div className="mb-4">
          <div className="text-[11px] opacity-70 leading-snug mb-2.5 px-1">
            {t('legal.payment_notice')}
          </div>
          {/* Option 1 : Payer sans compte — one shot */}
          <div className="p-4 rounded-xl mb-2.5" style={{ background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.2)' }}>
            <div className="font-bold text-sm mb-1">
              💳 Payer sans créer de compte
            </div>
            <div className="text-xs mb-3 opacity-75 leading-[1.55]">
              1 constat — <strong>CHF 4.90 / €4.90</strong> · Paiement sécurisé Stripe<br/>
              Votre PDF vous sera envoyé par email après paiement.
            </div>
            <input
              type="email"
              value={oneshotEmail}
              onChange={e => setOneshotEmail(e.target.value)}
              placeholder="votre@email.com"
              aria-label="Adresse email pour recevoir le PDF"
              className="w-full rounded-lg text-sm mb-2.5 px-[13px] py-[11px] box-border" style={{ border: '1.5px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}
            />
            <button
              onClick={payOneShot}
              disabled={oneshotLoading || !oneshotEmail.includes('@')}
              className="w-full p-3.5 rounded-[10px] border-0 text-white font-bold flex items-center justify-center gap-2 text-[15px]" style={{ background: oneshotEmail.includes('@') ? 'var(--navy,#123A5A)' : 'rgba(18,58,90,0.3)', cursor: oneshotEmail.includes('@') ? 'pointer' : 'not-allowed' }}>
              {oneshotLoading ? '⏳ Redirection…' : '💳 Payer CHF 4.90 →'}
            </button>
          </div>

          {/* Séparateur */}
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="flex-1 h-px"  style={{ background: 'rgba(255,255,255,0.08)' }}/>
            <span className="text-[11px] opacity-70" >ou</span>
            <div className="flex-1 h-px"  style={{ background: 'rgba(255,255,255,0.08)' }}/>
          </div>

          {/* Option 2 : Se connecter (compte existant) */}
          <button onClick={() => onLogin?.()} className="w-full p-[13px] rounded-[10px] bg-transparent cursor-pointer text-sm font-medium" style={{ border: '1.5px solid rgba(255,255,255,0.25)', color: 'var(--text)' }}>
            Se connecter (compte existant) →
          </button>
          <div className="text-[11px] text-center mt-2 opacity-70" >
            Pack 3 constats CHF 12.90 · Pack 10 constats CHF 34.90
          </div>
        </div>
      ) : null}

      {/* ── PAYWALL — connecté mais 0 crédit ── */}
      {authUser && !isAdmin && credits <= 0 && !creditUsed && showPaywall && (native ? (
        <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="font-bold text-sm mb-1.5">{t('access.inactiveTitle', { defaultValue: 'Aucun accès actif' })}</div>
          <div className="text-[13px] leading-[1.6]" style={{ opacity: 0.78 }}>
            {t('access.inactiveText', { defaultValue: 'Votre compte ne dispose pas d’un accès actif. Connectez-vous avec un compte actif.' })}
          </div>
        </div>
      ) : (
        <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.2)' }}>
          <div className="font-bold text-sm mb-1.5">
            🔒 1 crédit requis pour télécharger
          </div>
          <div className="text-[13px] mb-3.5 leading-[1.65]" style={{ opacity: 0.755 }}>
            Vous n'avez plus de crédit. Achetez un pack pour récupérer votre constat.
          </div>
          <button onClick={() => onBuyPack?.()} className="w-full p-3.5 rounded-[10px] border-0 text-white cursor-pointer font-bold mb-2 text-[15px]" style={{ background: 'var(--navy,#123A5A)' }}>
            Acheter un pack →
          </button>
          <div className="text-[11px] text-center opacity-70" >
            1 constat CHF 4.90 · 3 constats CHF 12.90 · 10 constats CHF 34.90
          </div>
        </div>
      ))}

      {/* ── ACTIONS — connecté avec crédit ── */}
      {authUser && (hasCredit || creditUsed) && (
        <div className="flex flex-col gap-2.5 mb-4">

          {/* Credit info */}
          {!isAdmin && !creditUsed && (
            <div className="text-xs text-center mb-0.5 opacity-75">
              💳 {credits} crédit{credits > 1 ? 's' : ''} disponible{credits > 1 ? 's' : ''} · 1 sera utilisé
            </div>
          )}
          {creditUsed && (
            <div className="text-xs text-green-500 text-center mb-0.5" >
              ✅ Crédit consommé
            </div>
          )}

          {/* Download */}
          <button onClick={() => handleAction('download')} disabled={loading} className="p-4 rounded-[10px] border-0 text-white font-bold flex items-center justify-center gap-2.5 text-[15px]" style={{ background: loading ? 'rgba(255,53,0,0.5)' : 'var(--boom)', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '⏳ Génération…' : '⬇️ Télécharger le PDF'}
          </button>

          {/* Email */}
          {!emailSent ? (
            <div>
              <button onClick={() => handleAction('email')} className="w-full p-3.5 rounded-[10px] cursor-pointer text-sm font-medium flex items-center justify-center gap-2.5" style={{ border: '1.5px solid rgba(240,237,232,0.15)', background: showEmailForm ? 'rgba(255,255,255,0.06)' : 'transparent', color: 'var(--text)' }}>
                📧 Recevoir le PDF par email
              </button>

              {showEmailForm && (
                <div className="mt-2 p-3.5 rounded-[10px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <div className="text-xs mb-2 leading-normal opacity-75">
                    Entrez votre email pour recevoir le PDF en pièce jointe.
                  </div>
                  <input type="email" aria-label="Adresse email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full rounded-lg text-sm mb-2 px-[13px] py-[11px] box-border" style={{ border: '1.5px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}
                    onKeyDown={e => e.key === 'Enter' && sendEmail()}
                  />
                  {emailError && (
                    <div className="text-xs text-red-500 mb-2">⚠️ {emailError}</div>
                  )}
                  <button onClick={sendEmail} disabled={sendingEmail || !email.includes('@')} className="w-full p-[11px] rounded-lg border-0 text-white text-sm font-semibold" style={{ background: !email.includes('@') ? 'var(--muted)' : 'var(--green)', cursor: !email.includes('@') ? 'not-allowed' : 'pointer' }}>
                    {sendingEmail ? '⏳ Envoi…' : '✉️ Envoyer'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-[10px] text-center text-sm font-semibold text-[var(--green)]" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
              ✅ PDF envoyé à {email}
            </div>
          )}
        </div>
      )}

      {/* ── Si connecté mais paywall pas encore affiché ── */}
      {authUser && !isAdmin && credits <= 0 && !creditUsed && !showPaywall && (
        <div className="flex flex-col gap-2.5 mb-4">
          <button onClick={() => handleAction('download')} className="p-4 rounded-[10px] border-0 text-white cursor-pointer font-bold flex items-center justify-center gap-2.5 text-[15px]" style={{ background: 'var(--boom)' }}>
            ⬇️ Télécharger le PDF
          </button>
          <button onClick={() => handleAction('email')} className="w-full p-3.5 rounded-[10px] bg-transparent cursor-pointer text-sm font-medium flex items-center justify-center gap-2.5" style={{ border: '1.5px solid rgba(240,237,232,0.15)', color: 'var(--text)' }}>
            📧 Recevoir le PDF par email
          </button>
        </div>
      )}

      {/* Legal */}
      <div className="p-3.5 rounded-[10px] mb-3.5" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <div className="text-xs font-bold mb-[5px] text-[var(--amber)]">
          ⏰ À transmettre à votre assureur
        </div>
        <div className="text-xs leading-[1.65]" style={{ opacity: 0.755 }}>
          Transmettez ce document à <strong>votre propre assureur</strong> dans les délais prévus par votre contrat.
        </div>
      </div>

      <button onClick={() => window.location.href = '/'} className="w-full p-[11px] rounded-[10px] bg-transparent cursor-pointer text-[13px] opacity-70" style={{ border: '1px solid rgba(240,237,232,0.08)', color: 'var(--text)' }}>
        Nouveau constat →
      </button>

      {/* QR persistant */}
      <div className="mt-5 p-4 rounded-xl" style={{ background: 'rgba(240,237,232,0.03)', border: '1px solid rgba(240,237,232,0.08)' }}>
        <div className="text-[11px] font-bold opacity-70 uppercase mb-2.5 text-center tracking-[1px]">
          QR du constat — valable 7 jours
        </div>
        <div className="text-center mb-2.5">
          {constatQr
            ? <img src={constatQr} alt="QR du constat" className="rounded-lg w-[140px] h-[140px] inline-block" />
            : <div className="w-[140px] h-[140px] inline-flex items-center justify-center text-[11px] opacity-60" style={{ fontFamily: 'monospace' }}>QR…</div>}
        </div>
        <div className="text-xs text-center leading-relaxed opacity-70" >
          Si la police intervient, elle peut scanner ce QR<br/>pour accéder au constat.
        </div>
      </div>
    </div>
  );
});
