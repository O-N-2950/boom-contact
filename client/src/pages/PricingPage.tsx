import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../trpc';

interface Props {
  userEmail: string;
  onBack: () => void;
}

const PACKAGES = [
  { id: 'single', credits: 1,  priceEUR: 4.90,  priceCHF: 4.90,  popular: false, savings: null,  icon: '📄' },
  { id: 'pack3',  credits: 3,  priceEUR: 12.90, priceCHF: 12.90, unitPrice: 4.30, popular: true,  savings: '12%', icon: '👨‍👩‍👧' },
  { id: 'pack10', credits: 10, priceEUR: 34.90, priceCHF: 34.90, unitPrice: 3.49, popular: false, savings: '29%', icon: '🚗' },
];

export function PricingPage({ userEmail, onBack }: Props) {
  const { t } = useTranslation();
  const [currency, setCurrency] = useState<'EUR' | 'CHF'>('CHF');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkoutMutation = trpc.payment.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
      else { setError(t('pricing.error_missing_url')); setLoading(null); }
    },
    onError: (err) => { setError(err.message || t('common.error')); setLoading(null); },
  });

  const handleBuy = (packageId: string) => {
    setLoading(packageId);
    setError(null);
    checkoutMutation.mutate({ packageId, userEmail, currency, locale: navigator.language?.split('-')[0] || 'fr' });
  };

  const price = (pkg: typeof PACKAGES[0]) => currency === 'CHF' ? pkg.priceCHF : pkg.priceEUR;
  const symbol = currency === 'CHF' ? 'CHF' : '€';

  const trustItems = [
    t('pricing.trust.stripe'),
    t('pricing.trust.no_expiry'),
    t('pricing.trust.worldwide'),
    t('pricing.trust.company'),
  ];

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '24px 20px', minHeight: '100svh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(240,237,232,0.5)', cursor: 'pointer', fontSize: 18, padding: 4 }}>
          {t('common.back')}
        </button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{t('pricing.title')}</div>
          <div style={{ fontSize: 11, opacity: 0.4 }}>{t('pricing.subtitle')}</div>
        </div>
      </div>

      {/* Currency toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, width: 'fit-content' }}>
        {(['CHF', 'EUR'] as const).map(c => (
          <button key={c} onClick={() => setCurrency(c)} style={{
            padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: currency === c ? 'var(--boom)' : 'transparent',
            color: currency === c ? '#fff' : 'rgba(240,237,232,0.5)',
            fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
          }}>{c}</button>
        ))}
      </div>

      {/* Packages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {PACKAGES.map(pkg => {
          const pkgLabel = t(`pricing.packages.${pkg.id}.label`);
          const pkgDesc  = t(`pricing.packages.${pkg.id}.description`);
          return (
            <div key={pkg.id} style={{
              padding: '18px 20px', borderRadius: 16, position: 'relative', transition: 'all 0.2s',
              background: pkg.popular ? 'rgba(255,53,0,0.08)' : 'rgba(255,255,255,0.03)',
              border: pkg.popular ? '1.5px solid rgba(255,53,0,0.35)' : '1px solid rgba(255,255,255,0.08)',
            }}>
              {pkg.popular && (
                <div style={{
                  position: 'absolute', top: -10, left: 20,
                  background: 'var(--boom)', color: '#fff',
                  fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                  padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase',
                }}>{t('pricing.popular_badge')}</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{pkg.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{pkgLabel}</div>
                    <div style={{ fontSize: 12, opacity: 0.5, marginTop: 1 }}>{pkgDesc}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: pkg.popular ? 'var(--boom)' : 'var(--text)' }}>
                    {symbol} {price(pkg).toFixed(2)}
                  </div>
                  {pkg.savings && (
                    <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>
                      {t('pricing.economy', { pct: pkg.savings })}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <div style={{ flex: 1, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{t('pricing.credits_label')}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--boom)' }}>{pkg.credits}</div>
                </div>
                {'unitPrice' in pkg && pkg.unitPrice && (
                  <div style={{ flex: 1, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{t('pricing.per_report')}</div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{symbol} {pkg.unitPrice.toFixed(2)}</div>
                  </div>
                )}
                <div style={{ flex: 1, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{t('pricing.validity')}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8 }}>{t('pricing.no_expiry')}</div>
                </div>
              </div>

              <button onClick={() => handleBuy(pkg.id)} disabled={loading === pkg.id} style={{
                width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                background: loading === pkg.id ? 'rgba(255,53,0,0.4)' : pkg.popular ? 'var(--boom)' : 'rgba(255,255,255,0.1)',
                color: '#fff', cursor: loading === pkg.id ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 700, transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {loading === pkg.id ? (
                  <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> {t('pricing.redirecting')}</>
                ) : (
                  t('pricing.buy_btn', { symbol, price: price(pkg).toFixed(2) })
                )}
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: '#ef4444', marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Trust signals */}
      <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {trustItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, opacity: 0.6 }}>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, opacity: 0.3, lineHeight: 1.6 }}>
        {t('pricing.legal').split('\n').map((line, i) => <span key={i}>{line}{i === 0 ? <br/> : ''}</span>)}
      </div>
    </div>
  );
}
