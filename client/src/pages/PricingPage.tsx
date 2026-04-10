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

  return (
    <div className="mx-auto min-h-[100svh] max-w-[440px] px-4 py-6">
      <h1 className="absolute p-0 overflow-hidden whitespace-nowrap w-px h-px m-[-1px] border-0"  style={{ clip: 'rect(0,0,0,0)' }}>{t('pricingPage.sr_title')}</h1>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="bg-transparent border-0 cursor-pointer text-[15px] font-semibold flex items-center gap-1.5 touch-manipulation" style={{ color: 'rgba(255,255,255,0.55)', padding: '8px 0' }}>{t('pricingPage.back')}</button>
        <div>
          <div className="font-extrabold text-lg">{t('pricingPage.buy_reports')}</div>
          <div className="text-[11px] opacity-70" >{t('pricingPage.credits_no_expiry')}</div>
        </div>
      </div>

      {/* Credits badge if logged in */}
      {authUser && (
        <div className="rounded-xl mb-4 flex justify-between items-center" style={{ background: authUser.credits > 0 ? '#0d2a0d' : '#1a1000', border: `1px solid ${authUser.credits > 0 ? '#1a4a1a' : '#3a2000'}`, padding: '12px 16px' }}>
          <div>
            <div className="font-bold text-sm" style={{ color: authUser.credits > 0 ? '#4ade80' : '#fbbf24' }}>
              {authUser.credits > 0 ? t('pricingPage.credits_available', { count: authUser.credits }) : t('pricingPage.no_credits')}
            </div>
            <div className="text-[#d0d0d0] text-xs mt-0.5" >{authUser.email}</div>
          </div>
          {authUser.credits === 999999 && <span className="text-[#FF3500] font-black text-xl">∞</span>}
        </div>
      )}

      {/* Currency selector */}
      <div className="mb-5">
        <div className="text-[#d0d0d0] text-[11px] font-semibold mb-2 tracking-[1px]">
          {t('pricingPage.currency_label')} {detected && <span className="text-green-400 ml-1.5" >{t('pricingPage.currency_detected')}</span>}
        </div>
        <div className="flex gap-1.5" style={{ flexWrap: 'wrap' as const }}>
          {(Object.keys(CURRENCY_FLAGS) as CurrencyCode[]).map(c => (
            <button key={c} onClick={() => setCurrency(c)} className="text-white rounded-lg text-xs cursor-pointer min-h-[44px] min-w-[44px]" style={{ background: currency === c ? '#D42D00' : '#111', border: `1px solid ${currency === c ? '#D42D00' : '#222'}`, padding: '6px 10px', fontWeight: currency === c ? 700 : 400 }}>
              {CURRENCY_FLAGS[c]} {c}
            </button>
          ))}
        </div>
      </div>

      {/* Packages */}
      <div className="flex flex-col gap-3 mb-6">
        {PACKAGES.map(pkg => {
          const amountCents = PRICES[pkg.id][currency];
          const priceStr    = formatPrice(amountCents, currency);
          const symbol      = CURRENCY_SYMBOL[currency];
          const isLoading   = loading === pkg.id;

          return (
            <div key={pkg.id} className="rounded-2xl overflow-hidden" style={{ border: pkg.popular ? '1.5px solid rgba(255,53,0,0.5)' : '1px solid rgba(255,255,255,0.25)', background: pkg.popular ? 'rgba(255,53,0,0.06)' : 'rgba(255,255,255,0.03)' }}>
              {pkg.popular && (
                <div className="bg-[#D42D00] text-[10px] font-bold text-white px-4 py-1 tracking-[1px]">
                  {t('pricingPage.most_popular', { savings: pkg.savings })}
                </div>
              )}

              <div className="px-5 py-[18px]">
                <div className="flex justify-between items-start mb-2.5">
                  <div>
                    <div className="font-extrabold text-[17px]">{pkg.icon} {pkg.label}</div>
                    <div className="text-[#d0d0d0] text-xs mt-0.5" >{pkg.desc}</div>
                    {!pkg.popular && pkg.savings && (
                      <div className="text-green-400 text-[11px] mt-1">{t('pricingPage.economy', { savings: pkg.savings })}</div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[26px] font-black" style={{ color: pkg.popular ? '#FF3500' : '#fff' }}>
                      {currency === 'JPY' ? `¥${amountCents}` : priceStr}
                    </div>
                    <div className="text-[#d0d0d0] text-[11px]">
                      {currency !== 'JPY' ? symbol : ''} {t('pricingPage.per_pack')}
                    </div>
                    {pkg.credits > 1 && (
                      <div className="text-[#d0d0d0] text-[10px] mt-0.5" >
                        ≈ {currency === 'JPY' ? `¥${Math.round(amountCents / pkg.credits)}` : `${symbol} ${(amountCents / pkg.credits / 100).toFixed(2)}`} {t('pricingPage.per_report')}
                      </div>
                    )}
                  </div>
                </div>

                {pkg.marketing && (
                  <div className="rounded-lg mb-3 text-[#d0d0d0] text-xs leading-normal px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {pkg.marketing}
                  </div>
                )}

                <button
                  onClick={() => handleBuy(pkg.id)}
                  disabled={!!loading}
                  className="w-full rounded-[10px] border-0 text-sm font-bold text-white transition-all duration-200 px-5 py-[13px]" style={{ cursor: loading ? 'not-allowed' : 'pointer', background: pkg.popular ? '#D42D00' : 'rgba(255,255,255,0.08)', opacity: loading ? 0.6 : 1 }}
                >
                  {isLoading ? t('pricingPage.redirecting_stripe') : t('pricingPage.buy_btn', { label: pkg.label, price: `${currency === 'JPY' ? `¥${amountCents}` : `${symbol} ${priceStr}`}` })}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-[10px] p-3 mb-4 text-[13px] bg-[#2a0a0a] text-[#f87171]" style={{ border: '1px solid #5c1a1a' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Trust badges */}
      <div className="grid gap-2 mb-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {[
          { icon: '🔒', text: t('pricingPage.trust_stripe') },
          { icon: '♾️', text: t('pricingPage.trust_no_expiry') },
          { icon: '🎁', text: t('pricingPage.trust_whatsapp') },
          { icon: '🌍', text: t('pricingPage.trust_worldwide') },
          { icon: '📄', text: t('pricingPage.trust_invoice') },
          { icon: '🏢', text: t('pricingPage.trust_fleet') },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span className="text-base">{item.icon}</span>
            <span className="text-[#d0d0d0] text-[11px]">{item.text}</span>
          </div>
        ))}
      </div>

      {/* Scenarios */}
      <div className="rounded-[14px] p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="text-[#d0d0d0] text-xs font-bold mb-2.5 tracking-[0.5px]">
          {t('pricingPage.why_title')}
        </div>
        {[
          { icon: '📱', title: t('pricingPage.scenario_child_title'), text: t('pricingPage.scenario_child_text') },
          { icon: '🚚', title: t('pricingPage.scenario_company_title'), text: t('pricingPage.scenario_company_text') },
          { icon: '✈️', title: t('pricingPage.scenario_abroad_title'), text: t('pricingPage.scenario_abroad_text') },
        ].map((s, i) => (
          <div key={i} className="flex gap-3" style={{ marginBottom: i < 2 ? 12 : 0 }}>
            <span className="text-xl shrink-0">{s.icon}</span>
            <div>
              <div className="font-semibold text-[13px] text-[#ccc]">{s.title}</div>
              <div className="text-[#d0d0d0] text-xs leading-normal mt-0.5" >{s.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-[11px] leading-relaxed text-[#b0b0b0] text-center">
        boom.contact · PEP's Swiss SA · CHE-476.484.632<br/>
        Bellevue 7, 2950 Courgenay, Jura, Suisse<br/>
        <a href="mailto:contact@boom.contact" className="text-[#d0d0d0]">contact@boom.contact</a>
      </div>
    </div>
  );
}
