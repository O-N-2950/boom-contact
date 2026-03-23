import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../trpc';

interface Props {
  userEmail: string;
  onBack: () => void;
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

const PACKAGES = [
  {
    id: 'single', credits: 1, popular: false, savings: null, icon: '📄',
    label: '1 constat', desc: 'Pour un accident ponctuel',
    marketing: null,
  },
  {
    id: 'pack3', credits: 3, popular: true, savings: '12%', icon: '👨‍👩‍👧',
    label: '3 constats', desc: 'Pour toute la famille',
    marketing: '🎁 Partagez par WhatsApp — votre enfant, votre employé, votre ami reçoit un lien instantané.',
  },
  {
    id: 'pack10', credits: 10, popular: false, savings: '29%', icon: '🚗',
    label: '10 constats', desc: 'Flottes & entreprises',
    marketing: '🏢 Gérez toute votre flotte. Transférez à vos collaborateurs en 1 clic.',
  },
];

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

export function PricingPage({ userEmail, onBack }: Props) {
  const { t } = useTranslation();
  const [currency, setCurrency] = useState<CurrencyCode>('CHF');
  const [loading, setLoading]   = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [detected, setDetected] = useState(false);

  // Auto-detect on mount
  useEffect(() => {
    detectCurrency().then(c => {
      setCurrency(c);
      setDetected(true);
    });
  }, []);

  const checkoutMutation = trpc.payment.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
      else { setError('URL de paiement manquante'); setLoading(null); }
    },
    onError: (err) => { setError(err.message || 'Erreur'); setLoading(null); },
  });

  const handleBuy = (packageId: string) => {
    if (!userEmail) { setError('Email requis pour acheter'); return; }
    setLoading(packageId);
    setError(null);
    checkoutMutation.mutate({
      packageId: packageId as any,
      userEmail,
      currency,
      locale: navigator.language?.split('-')[0] || 'fr',
    });
  };

  return (
    <div style={{ maxWidth: 440, margin: '0 auto', padding: '24px 16px', minHeight: '100svh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(240,237,232,0.5)', cursor: 'pointer', fontSize: 18, padding: 4 }}>←</button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Acheter des constats</div>
          <div style={{ fontSize: 11, opacity: 0.4 }}>Crédits sans expiration · Partageables par WhatsApp</div>
        </div>
      </div>

      {/* Currency selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#666', fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>
          DEVISE {detected && <span style={{ color: '#4ade80', marginLeft: 6 }}>✓ détectée auto</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
          {(Object.keys(CURRENCY_FLAGS) as CurrencyCode[]).map(c => (
            <button key={c} onClick={() => setCurrency(c)} style={{
              background: currency === c ? '#FF3500' : '#111',
              border: `1px solid ${currency === c ? '#FF3500' : '#222'}`,
              color: '#fff', borderRadius: 8, padding: '6px 10px',
              fontSize: 12, fontWeight: currency === c ? 700 : 400, cursor: 'pointer',
            }}>
              {CURRENCY_FLAGS[c]} {c}
            </button>
          ))}
        </div>
      </div>

      {/* Packages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {PACKAGES.map(pkg => {
          const amountCents = PRICES[pkg.id][currency];
          const priceStr    = formatPrice(amountCents, currency);
          const symbol      = CURRENCY_SYMBOL[currency];
          const isLoading   = loading === pkg.id;

          return (
            <div key={pkg.id} style={{
              borderRadius: 16, overflow: 'hidden',
              border: pkg.popular ? '1.5px solid rgba(255,53,0,0.5)' : '1px solid rgba(255,255,255,0.08)',
              background: pkg.popular ? 'rgba(255,53,0,0.06)' : 'rgba(255,255,255,0.03)',
            }}>
              {pkg.popular && (
                <div style={{ background: '#FF3500', padding: '4px 16px', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#fff' }}>
                  ⭐ PLUS POPULAIRE · ÉCONOMIE {pkg.savings}
                </div>
              )}

              <div style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17 }}>{pkg.icon} {pkg.label}</div>
                    <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>{pkg.desc}</div>
                    {!pkg.popular && pkg.savings && (
                      <div style={{ color: '#4ade80', fontSize: 11, marginTop: 4 }}>Économie {pkg.savings}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: pkg.popular ? '#FF3500' : '#fff' }}>
                      {currency === 'JPY' ? `¥${amountCents}` : priceStr}
                    </div>
                    <div style={{ color: '#555', fontSize: 11 }}>
                      {currency !== 'JPY' ? symbol : ''}{' '}par pack
                    </div>
                    {pkg.credits > 1 && (
                      <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>
                        ≈ {currency === 'JPY' ? `¥${Math.round(amountCents / pkg.credits)}` : `${symbol} ${(amountCents / pkg.credits / 100).toFixed(2)}`} / constat
                      </div>
                    )}
                  </div>
                </div>

                {pkg.marketing && (
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, color: '#888', fontSize: 12, lineHeight: 1.5 }}>
                    {pkg.marketing}
                  </div>
                )}

                <button
                  onClick={() => handleBuy(pkg.id)}
                  disabled={!!loading}
                  style={{
                    width: '100%', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                    padding: '13px 20px', fontSize: 14, fontWeight: 700,
                    background: pkg.popular ? '#FF3500' : 'rgba(255,255,255,0.08)',
                    color: '#fff', opacity: loading ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {isLoading ? '⏳ Redirection Stripe...' : `Acheter ${pkg.label} — ${currency === 'JPY' ? `¥${amountCents}` : `${symbol} ${priceStr}`}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ background: '#2a0a0a', border: '1px solid #5c1a1a', borderRadius: 10, padding: 12, marginBottom: 16, color: '#f87171', fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Trust badges */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {[
          { icon: '🔒', text: 'Paiement Stripe sécurisé PCI-DSS' },
          { icon: '♾️', text: 'Crédits sans expiration' },
          { icon: '🎁', text: 'Partageable par WhatsApp' },
          { icon: '🌍', text: 'Valable dans 150+ pays' },
          { icon: '📄', text: 'Facture PDF automatique' },
          { icon: '🏢', text: 'Idéal flottes entreprise' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 10px' }}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span style={{ color: '#666', fontSize: 11 }}>{item.text}</span>
          </div>
        ))}
      </div>

      {/* Scenarios */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ color: '#888', fontSize: 12, fontWeight: 700, marginBottom: 10, letterSpacing: 0.5 }}>
          POURQUOI AVOIR DES CRÉDITS D'AVANCE ?
        </div>
        {[
          { icon: '📱', title: 'Votre enfant a un accident', text: 'Il vous appelle. Vous lui envoyez un crédit par WhatsApp. Il établit son constat en 5 minutes.' },
          { icon: '🚚', title: 'Véhicule de société', text: 'Votre livreur a un accrochage. Transférez-lui un crédit instantanément depuis votre mobile.' },
          { icon: '✈️', title: 'En voyage à l\'étranger', text: 'Accident en Allemagne, Australie ou Japon. Votre constat est reconnu dans 150+ pays.' },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < 2 ? 12 : 0 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{s.icon}</span>
            <div>
              <div style={{ color: '#ccc', fontWeight: 600, fontSize: 13 }}>{s.title}</div>
              <div style={{ color: '#555', fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>{s.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ color: '#333', fontSize: 11, textAlign: 'center' as const, lineHeight: 1.6 }}>
        boom.contact · PEP's Swiss SA · Groupe NEUKOMM<br/>
        Bellevue 7, 2950 Courgenay, Jura, Suisse<br/>
        <a href="mailto:contact@boom.contact" style={{ color: '#555' }}>contact@boom.contact</a>
      </div>
    </div>
  );
}
