import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../trpc';

interface Props {
  userEmail: string;
  onBack: () => void;
  authUser?: { id: string; email: string; role: string; credits: number } | null;
  onAuthSuccess?: () => void; // callback to refresh authUser credits after purchase
}

type CurrencyCode = 'CHF' | 'EUR' | 'GBP' | 'AUD' | 'USD' | 'CAD' | 'SGD' | 'JPY';

const CURRENCY_FLAGS: Record<CurrencyCode, string> = {
  CHF: '🇨🇭', EUR: '🇪🇺', GBP: '🇬🇧',
  AUD: '🇦🇺', USD: '🇺🇸', CAD: '🇨🇦',
  SGD: '🇸🇬', JPY: '🇯🇵',
};

const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  CHF: 'CHF', EUR: '€', GBP: '£',
  AUD: 'A$', USD: '$', CAD: 'C$',
  SGD: 'S$', JPY: '¥',
};

// Prices in smallest unit (cents, except JPY in yen)
const PRICES: Record<string, Record<CurrencyCode, number>> = {
  single: { CHF:490,  EUR:490,  GBP:390,  AUD:790,  USD:490,  CAD:690,  SGD:690,  JPY:750 },
  pack3:  { CHF:1290, EUR:1290, GBP:990,  AUD:1990, USD:1290, CAD:1790, SGD:1790, JPY:1900 },
  pack10: { CHF:3490, EUR:3490, GBP:2790, AUD:5490, USD:3490, CAD:4790, SGD:4790, JPY:5200 },
};

function formatPrice(amountCents: number, currency: CurrencyCode): string {
  if (currency === 'JPY') return `¥${amountCents}`;
  return `${(amountCents / 100).toFixed(2)}`;
}

// Detect country/currency from geo-IP
async function detectCurrency(): Promise<CurrencyCode> {
  const COUNTRY_MAP: Record<string, CurrencyCode> = {
    CH:'CHF', LI:'CHF',
    DE:'EUR', FR:'EUR', BE:'EUR', LU:'EUR', IT:'EUR', ES:'EUR',
    AT:'EUR', NL:'EUR', PT:'EUR', FI:'EUR', IE:'EUR', GR:'EUR',
    GB:'GBP',
    AU:'AUD', NZ:'AUD',
    US:'USD', MX:'USD',
    CA:'CAD',
    SG:'SGD', MY:'SGD',
    JP:'JPY',
  };
  try {
    const res = await fetch('https://ip-api.io/json', { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    return COUNTRY_MAP[data.country_code] || 'EUR';
  } catch {
    const lang = navigator.language?.toUpperCase();
    if (lang?.includes('-CH')) return 'CHF';
    if (lang?.includes('-GB')) return 'GBP';
    if (lang?.includes('-US')) return 'USD';
    if (lang?.includes('-AU')) return 'AUD';
    if (lang?.includes('-CA')) return 'CAD';
    if (lang?.includes('-SG')) return 'SGD';
    if (lang?.includes('-JP')) return 'JPY';
    return 'EUR';
  }
}

export function PricingPage({ userEmail, onBack, authUser, onAuthSuccess }: Props) {
  const { t } = useTranslation();
  const [currency, setCurrency] = useState<CurrencyCode>('CHF');
  const [loading, setLoading]   = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [detected, setDetected] = useState(false);

  const PACKAGES = [
    {
      id: 'single', credits: 1, popular: false, savings: null, icon: '📄',
      label: t('pricingPage.pkg_single_label'), desc: t('pricingPage.pkg_single_desc'),
      marketing: null,
    },
    {
      id: 'pack3', credits: 3, popular: true, savings: '12%', icon: '👨‍👩‍👧',
      label: t('pricingPage.pkg_pack3_label'), desc: t('pricingPage.pkg_pack3_desc'),
      marketing: t('pricingPage.pkg_pack3_marketing'),
    },
    {
      id: 'pack10', credits: 10, popular: false, savings: '29%', icon: '🚗',
      label: t('pricingPage.pkg_pack10_label'), desc: t('pricingPage.pkg_pack10_desc'),
      marketing: t('pricingPage.pkg_pack10_marketing'),
    },
  ];

  // Auto-detect on mount
  useEffect(() => {
    detectCurrency().then(c => {
      setCurrency(c);
      setDetected(true);
    });
  }, []);

  const checkoutMutation = trpc.payment.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        // Store pending callback to refresh credits on return
        if (onAuthSuccess) localStorage.setItem('boom_refresh_credits', '1');
        window.location.href = data.url;
      } else { setError(t('pricingPage.error_missing_url')); setLoading(null); }
    },
    onError: (err) => { setError(err.message || t('pricingPage.error_generic')); setLoading(null); },
  });

  // QR-facture suisse (virement) — CHF uniquement, gating natif hérité de la page
  const [invoiceSuccess, setInvoiceSuccess] = useState<string | null>(null);
  const [invoicePkg, setInvoicePkg] = useState<string>('pack3');
  const invoiceMutation = trpc.payment.createInvoice.useMutation({
    onSuccess: (data) => {
      setInvoiceSuccess(t('pricingPage.invoice_sent', { number: data.displayNumber }));
      setLoading(null); setError(null);
    },
    onError: (err) => { setError(err.message || t('pricingPage.error_generic')); setLoading(null); },
  });
  const handleInvoice = () => {
    if (!effectiveEmail) { setError(t('pricingPage.error_email_required')); return; }
    setLoading('invoice'); setError(null); setInvoiceSuccess(null);
    invoiceMutation.mutate({ packageId: invoicePkg as any, email: effectiveEmail, language: navigator.language?.split('-')[0] || 'fr' });
  };

  const effectiveEmail = authUser?.email || userEmail;

  const handleBuy = (packageId: string) => {
    if (!effectiveEmail) { setError(t('pricingPage.error_email_required')); return; }
    setLoading(packageId);
    setError(null);
    checkoutMutation.mutate({
      packageId: packageId as any,
      userEmail: effectiveEmail,
      currency,
      locale: navigator.language?.split('-')[0] || 'fr',
    });
  };

  const C = { bg:'#F5F8FC', card:'#FFFFFF', elevated:'#EEF4FA', text:'#102033', sec:'#5D6B7C', orange:'#FF6B1A', orangeHover:'#F05A0A', navy:'#123A5A', cyan:'#18B8E8', success:'#16A34A', warning:'#F59E0B', danger:'#DC2626', border:'#DDE7F0', font:'Manrope, ui-sans-serif, system-ui, sans-serif' };

  return (
    <div style={{ margin:'0 auto', minHeight:'100svh', maxWidth:440, padding:'24px 16px', background:C.bg, color:C.text, fontFamily:C.font, boxSizing:'border-box' }}>
      <h1 style={{ position:'absolute', padding:0, overflow:'hidden', whiteSpace:'nowrap', width:1, height:1, margin:-1, border:0, clip:'rect(0,0,0,0)' }}>{t('pricingPage.sr_title')}</h1>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button onClick={onBack} style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:15, fontWeight:600, display:'flex', alignItems:'center', gap:6, color:C.sec, padding:'8px 0' }}>{t('pricingPage.back')}</button>
        <div>
          <div style={{ fontWeight:800, fontSize:18, color:C.text }}>{t('pricingPage.buy_reports')}</div>
          <div style={{ fontSize:11, color:C.sec }}>{t('pricingPage.credits_no_expiry')}</div>
        </div>
      </div>

      {/* Credits badge */}
      {authUser && (
        <div style={{ borderRadius:12, marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background: authUser.credits > 0 ? 'rgba(22,163,74,0.08)' : 'rgba(245,158,11,0.08)', border:`1px solid ${authUser.credits > 0 ? 'rgba(22,163,74,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color: authUser.credits > 0 ? C.success : C.warning }}>
              {authUser.credits > 0 ? t('pricingPage.credits_available', { count: authUser.credits }) : t('pricingPage.no_credits')}
            </div>
            <div style={{ fontSize:12, color:C.sec, marginTop:2 }}>{authUser.email}</div>
          </div>
          {authUser.credits === 999999 && <span style={{ color:C.orange, fontWeight:900, fontSize:20 }}>∞</span>}
        </div>
      )}

      {/* Currency selector */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, marginBottom:8, letterSpacing:1, color:C.sec }}>
          {t('pricingPage.currency_label')} {detected && <span style={{ color:C.success, marginLeft:6 }}>{t('pricingPage.currency_detected')}</span>}
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {(Object.keys(CURRENCY_FLAGS) as CurrencyCode[]).map(c => {
            const active = currency === c;
            return (
              <button key={c} onClick={() => setCurrency(c)} style={{ borderRadius:10, fontSize:12, cursor:'pointer', minHeight:44, minWidth:44, padding:'6px 12px', fontWeight: active ? 700 : 500, color: active ? '#fff' : C.text, background: active ? C.orange : C.card, border:`1px solid ${active ? C.orange : C.border}`, transition:'all .15s' }}>
                {CURRENCY_FLAGS[c]} {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Packages */}
      <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
        {PACKAGES.map(pkg => {
          const amountCents = PRICES[pkg.id][currency];
          const priceStr    = formatPrice(amountCents, currency);
          const symbol      = CURRENCY_SYMBOL[currency];
          const isLoading   = loading === pkg.id;
          return (
            <div key={pkg.id} style={{ borderRadius:16, overflow:'hidden', background: pkg.popular ? '#FFF7F2' : C.card, border:`1.5px solid ${pkg.popular ? 'rgba(255,107,26,0.4)' : C.border}`, boxShadow: pkg.popular ? '0 8px 24px rgba(255,107,26,0.10)' : '0 8px 24px rgba(16,32,51,0.06)' }}>
              {pkg.popular && (
                <div style={{ background:C.orange, fontSize:10, fontWeight:700, color:'#fff', padding:'4px 16px', letterSpacing:1 }}>
                  {t('pricingPage.most_popular', { savings: pkg.savings })}
                </div>
              )}
              <div style={{ padding:'18px 20px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:17, color:C.text }}>{pkg.icon} {pkg.label}</div>
                    <div style={{ fontSize:12, color:C.sec, marginTop:2 }}>{pkg.desc}</div>
                    {!pkg.popular && pkg.savings && (
                      <div style={{ fontSize:11, marginTop:4, color:C.success, fontWeight:700 }}>{t('pricingPage.economy', { savings: pkg.savings })}</div>
                    )}
                  </div>
                  <div style={{ flexShrink:0, textAlign:'right' }}>
                    <div style={{ fontSize:26, fontWeight:900, color: pkg.popular ? C.orange : C.text }}>
                      {currency === 'JPY' ? `¥${amountCents}` : priceStr}
                    </div>
                    <div style={{ fontSize:11, color:C.sec }}>{currency !== 'JPY' ? symbol : ''} {t('pricingPage.per_pack')}</div>
                    {pkg.credits > 1 && (
                      <div style={{ fontSize:10, color:C.sec, marginTop:2 }}>
                        ≈ {currency === 'JPY' ? `¥${Math.round(amountCents / pkg.credits)}` : `${symbol} ${(amountCents / pkg.credits / 100).toFixed(2)}`} {t('pricingPage.per_report')}
                      </div>
                    )}
                  </div>
                </div>
                {pkg.marketing && (
                  <div style={{ borderRadius:10, marginBottom:12, fontSize:12, lineHeight:1.5, padding:'8px 12px', background:C.elevated, color:C.sec }}>
                    {pkg.marketing}
                  </div>
                )}
                <button onClick={() => handleBuy(pkg.id)} disabled={!!loading}
                  style={{ width:'100%', borderRadius:10, border:'none', fontSize:14, fontWeight:700, color:'#fff', padding:'13px 20px', cursor: loading ? 'not-allowed' : 'pointer', background: pkg.popular ? C.orange : C.navy, opacity: loading ? 0.6 : 1, transition:'background .15s' }}>
                  {isLoading ? t('pricingPage.redirecting_stripe') : t('pricingPage.buy_btn', { label: pkg.label, price: `${currency === 'JPY' ? `¥${amountCents}` : `${symbol} ${priceStr}`}` })}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div role="alert" style={{ borderRadius:10, padding:12, marginBottom:16, fontSize:13, background:'rgba(220,38,38,0.08)', color:C.danger, border:'1px solid rgba(220,38,38,0.25)' }}>
          ⚠️ {error}
        </div>
      )}

      {/* QR-facture suisse — virement bancaire (CHF uniquement) */}
      {currency === 'CHF' && (
        <div style={{ borderRadius:14, padding:16, marginBottom:16, background:C.card, border:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <span style={{ fontSize:18 }}>🧾</span>
            <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{t('pricingPage.invoice_title')}</span>
          </div>
          <div style={{ fontSize:12, color:C.sec, lineHeight:1.5, marginBottom:12 }}>{t('pricingPage.invoice_desc')}</div>
          {invoiceSuccess ? (
            <div role="status" style={{ borderRadius:10, padding:12, fontSize:13, background:'rgba(22,163,74,0.08)', color:C.success, border:'1px solid rgba(22,163,74,0.25)' }}>
              ✅ {invoiceSuccess}
            </div>
          ) : (
            <div style={{ display:'flex', gap:8 }}>
              <select value={invoicePkg} onChange={e => setInvoicePkg(e.target.value)} aria-label={t('pricingPage.invoice_select')}
                style={{ flex:1, borderRadius:10, border:`1px solid ${C.border}`, padding:'10px 12px', fontSize:13, background:C.card, color:C.text, minHeight:44 }}>
                {PACKAGES.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>{pkg.label} — CHF {(PRICES[pkg.id as keyof typeof PRICES].CHF/100).toFixed(2)}</option>
                ))}
              </select>
              <button onClick={handleInvoice} disabled={!!loading}
                style={{ borderRadius:10, border:'none', fontSize:13, fontWeight:700, color:'#fff', padding:'10px 16px', minHeight:44, cursor: loading ? 'not-allowed' : 'pointer', background:C.navy, opacity: loading ? 0.6 : 1 }}>
                {loading === 'invoice' ? t('pricingPage.invoice_sending') : t('pricingPage.invoice_btn')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Trust badges */}
      <div style={{ display:'grid', gap:8, marginBottom:20, gridTemplateColumns:'1fr 1fr' }}>
        {[
          { icon:'🔒', text:t('pricingPage.trust_stripe') },
          { icon:'♾️', text:t('pricingPage.trust_no_expiry') },
          { icon:'🎁', text:t('pricingPage.trust_whatsapp') },
          { icon:'🌍', text:t('pricingPage.trust_worldwide') },
          { icon:'📄', text:t('pricingPage.trust_invoice') },
          { icon:'🏢', text:t('pricingPage.trust_fleet') },
        ].map((item, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, borderRadius:10, padding:'8px 10px', background:C.card, border:`1px solid ${C.border}` }}>
            <span style={{ fontSize:16 }}>{item.icon}</span>
            <span style={{ fontSize:11, color:C.sec }}>{item.text}</span>
          </div>
        ))}
      </div>

      {/* Scenarios */}
      <div style={{ borderRadius:14, padding:16, marginBottom:16, background:C.card, border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:12, fontWeight:700, marginBottom:10, letterSpacing:0.5, color:C.text }}>
          {t('pricingPage.why_title')}
        </div>
        {[
          { icon:'📱', title:t('pricingPage.scenario_child_title'), text:t('pricingPage.scenario_child_text') },
          { icon:'🚚', title:t('pricingPage.scenario_company_title'), text:t('pricingPage.scenario_company_text') },
          { icon:'✈️', title:t('pricingPage.scenario_abroad_title'), text:t('pricingPage.scenario_abroad_text') },
        ].map((sc, i) => (
          <div key={i} style={{ display:'flex', gap:12, marginBottom: i < 2 ? 12 : 0 }}>
            <span style={{ fontSize:20, flexShrink:0 }}>{sc.icon}</span>
            <div>
              <div style={{ fontWeight:600, fontSize:13, color:C.text }}>{sc.title}</div>
              <div style={{ fontSize:12, color:C.sec, lineHeight:1.5, marginTop:2 }}>{sc.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize:11, lineHeight:1.6, color:C.sec, textAlign:'center' }}>
        boom.contact · PEP's Swiss SA · CHE-476.484.632<br/>
        Bellevue 7, 2950 Courgenay, Jura, Suisse<br/>
        <a href="mailto:contact@boom.contact" style={{ color:C.navy }}>contact@boom.contact</a>
      </div>
    </div>
  );
}
