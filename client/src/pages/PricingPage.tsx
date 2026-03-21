import { useState } from 'react';

interface Props {
  userEmail: string;
  onBack: () => void;
}

const PACKAGES = [
  {
    id: 'single',
    label: '1 constat',
    credits: 1,
    priceEUR: 4.90,
    priceCHF: 4.90,
    description: 'Pour un accident ponctuel',
    popular: false,
    savings: null,
    icon: '📄',
  },
  {
    id: 'pack3',
    label: '3 constats',
    credits: 3,
    priceEUR: 12.90,
    priceCHF: 12.90,
    unitPrice: 4.30,
    description: 'Pour la famille',
    popular: true,
    savings: '12%',
    icon: '👨‍👩‍👧',
  },
  {
    id: 'pack10',
    label: '10 constats',
    credits: 10,
    priceEUR: 34.90,
    priceCHF: 34.90,
    unitPrice: 3.49,
    description: 'Courtiers, flottes d\'entreprise',
    popular: false,
    savings: '29%',
    icon: '🚗',
  },
];

export function PricingPage({ userEmail, onBack }: Props) {
  const [currency, setCurrency] = useState<'EUR' | 'CHF'>('CHF');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async (packageId: string) => {
    setLoading(packageId);
    setError(null);
    try {
      const resp = await fetch('/trpc/payment.createCheckout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          userEmail,
          currency,
          locale: navigator.language?.split('-')[0] || 'fr',
        }),
      });
      const data = await resp.json();
      const url = data?.result?.data?.url;
      if (!url) throw new Error(data?.error?.message || 'Erreur Stripe');
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de paiement');
      setLoading(null);
    }
  };

  const price = (pkg: typeof PACKAGES[0]) =>
    currency === 'CHF' ? pkg.priceCHF : pkg.priceEUR;

  const symbol = currency === 'CHF' ? 'CHF' : '€';

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '24px 20px', minHeight: '100svh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(240,237,232,0.5)', cursor: 'pointer', fontSize: 18, padding: 4 }}>←</button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Choisir un package</div>
          <div style={{ fontSize: 11, opacity: 0.4 }}>Achetez vos crédits à l'avance — payez une seule fois</div>
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
        {PACKAGES.map(pkg => (
          <div key={pkg.id} style={{
            padding: '18px 20px',
            borderRadius: 16,
            background: pkg.popular ? 'rgba(255,53,0,0.08)' : 'rgba(255,255,255,0.03)',
            border: pkg.popular ? '1.5px solid rgba(255,53,0,0.35)' : '1px solid rgba(255,255,255,0.08)',
            position: 'relative',
            transition: 'all 0.2s',
          }}>
            {pkg.popular && (
              <div style={{
                position: 'absolute', top: -10, left: 20,
                background: 'var(--boom)', color: '#fff',
                fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                padding: '3px 10px', borderRadius: 20,
                textTransform: 'uppercase',
              }}>⭐ Populaire</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{pkg.icon}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{pkg.label}</div>
                  <div style={{ fontSize: 12, opacity: 0.5, marginTop: 1 }}>{pkg.description}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: pkg.popular ? 'var(--boom)' : 'var(--text)' }}>
                  {symbol} {price(pkg).toFixed(2)}
                </div>
                {pkg.savings && (
                  <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>
                    Économie {pkg.savings}
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <div style={{ fontSize: 9, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Crédits</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--boom)' }}>{pkg.credits}</div>
              </div>
              {pkg.unitPrice && (
                <div style={{ flex: 1, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Par constat</div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{symbol} {pkg.unitPrice.toFixed(2)}</div>
                </div>
              )}
              <div style={{ flex: 1, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <div style={{ fontSize: 9, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Validité</div>
                <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8 }}>Sans limite</div>
              </div>
            </div>

            <button
              onClick={() => handleBuy(pkg.id)}
              disabled={loading === pkg.id}
              style={{
                width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                background: loading === pkg.id ? 'rgba(255,53,0,0.4)' : pkg.popular ? 'var(--boom)' : 'rgba(255,255,255,0.1)',
                color: '#fff', cursor: loading === pkg.id ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 700, transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading === pkg.id ? (
                <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Redirection Stripe…</>
              ) : (
                <>Acheter — {symbol} {price(pkg).toFixed(2)} <span style={{ opacity: 0.7 }}>→</span></>
              )}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: '#ef4444', marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Trust signals */}
      <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: '🔒', text: 'Paiement sécurisé via Stripe (PCI-DSS)' },
            { icon: '📄', text: 'Crédits sans date d\'expiration' },
            { icon: '🌍', text: 'Document numérique certifié · valable dans 150+ pays' },
            { icon: '🏛️', text: 'PEP\'s Swiss SA — Courgenay, Jura, Suisse' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, opacity: 0.6 }}>
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, opacity: 0.3, lineHeight: 1.6 }}>
        En achetant, vous acceptez les CGU de boom.contact.<br/>
        Remboursement impossible après génération du PDF.
      </div>
    </div>
  );
}
