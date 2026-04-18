import React, { useCallback } from 'react';

// ── Style constants ──────────────────────────────────────────
const BOOM = '#FF3500';
const BG = '#06060C';

interface Props {
  onBack: () => void;
}

export function B2BPage({ onBack }: Props) {
  const handleDemo = useCallback(() => {
    window.location.href = 'mailto:contact@boom.contact?subject=boom.contact%20API%20%E2%80%94%20Demo%20Request&body=Hello%2C%0A%0AWe%20are%20interested%20in%20integrating%20boom.contact%20into%20our%20claims%20workflow.%0A%0ACompany%3A%20%0AContact%20name%3A%20%0ARole%3A%20%0A%0APlease%20schedule%20a%20demo%20at%20your%20earliest%20convenience.';
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>

      {/* ── HEADER / NAV ── */}
      <header style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600 }}>
          &larr; boom.contact
        </button>
        <span style={{ fontSize: 11, letterSpacing: 2, opacity: 0.4, fontFamily: 'monospace', textTransform: 'uppercase' }}>B2B / API Partners</span>
      </header>

      {/* ── HERO ── */}
      <section style={{ textAlign: 'center', padding: '80px 24px 60px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: BOOM, fontWeight: 700, marginBottom: 16, fontFamily: 'monospace' }}>
          For Insurance Companies
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 24, letterSpacing: -1 }}>
          Reduce claim processing time by{' '}
          <span style={{ color: BOOM }}>80%</span>
        </h1>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', maxWidth: 640, margin: '0 auto 40px', lineHeight: 1.7 }}>
          boom.contact is the world's first digital accident report platform. Integrate our API to receive structured, certified accident data instantly -- no more paper forms, no more manual data entry.
        </p>
        <button
          onClick={handleDemo}
          style={{
            background: BOOM, color: '#fff', border: 'none', padding: '16px 40px',
            borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(255,53,0,0.4)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          Schedule a Demo
        </button>
      </section>

      {/* ── KEY STATS ── */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          {[
            { value: '50', label: 'Languages supported', icon: '🌍' },
            { value: '150+', label: 'Countries covered', icon: '🗺' },
            { value: '5 min', label: 'Average completion', icon: '⚡' },
            { value: 'PDF', label: 'Certified & timestamped', icon: '📄' },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: '28px 24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{stat.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: BOOM, marginBottom: 4, fontFamily: 'Oswald, Inter, sans-serif' }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── VALUE PROPOSITION ── */}
      <section style={{ background: 'rgba(255,255,255,0.02)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: BOOM, fontWeight: 700, marginBottom: 12, fontFamily: 'monospace', textAlign: 'center' }}>
            Why boom.contact?
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 800, textAlign: 'center', marginBottom: 48, letterSpacing: -0.5 }}>
            From accident to structured data in minutes
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
            {[
              {
                title: 'Zero data entry',
                desc: 'OCR + AI extracts vehicle registration, insurance card, and driver info automatically. Structured JSON delivered via API.',
                icon: '🤖',
              },
              {
                title: 'Legally compliant',
                desc: 'European Accident Statement (CEA) standard. Dual digital signatures. Blockchain-timestamped PDF. GDPR compliant.',
                icon: '⚖',
              },
              {
                title: 'Real-time notifications',
                desc: 'Get notified instantly when your policyholder completes a report. No more waiting days for paper forms.',
                icon: '🔔',
              },
              {
                title: 'Fraud detection ready',
                desc: 'GPS-stamped location, timestamped photos, blockchain proof. All data points available for fraud analysis.',
                icon: '🛡',
              },
              {
                title: 'Multi-vehicle support',
                desc: 'Handles 1-to-5 vehicle accidents, pedestrians, cyclists, e-scooters. QR code pairing between all parties.',
                icon: '🚗',
              },
              {
                title: 'Global coverage',
                desc: '50 languages including RTL (Arabic, Hebrew). Emergency numbers for every country. Works offline (PWA).',
                icon: '🌐',
              },
            ].map((item) => (
              <div key={item.title} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16, padding: '28px 24px',
              }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── API INTEGRATION FLOW ── */}
      <section style={{ padding: '80px 24px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: BOOM, fontWeight: 700, marginBottom: 12, fontFamily: 'monospace', textAlign: 'center' }}>
          Integration
        </div>
        <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 800, textAlign: 'center', marginBottom: 48, letterSpacing: -0.5 }}>
          Simple API integration
        </h2>

        <div style={{ position: 'relative' }}>
          {[
            { step: '1', title: 'Policyholder has an accident', desc: 'They open boom.contact on their phone (or your branded app via SDK).' },
            { step: '2', title: 'Both drivers fill the report', desc: 'QR code pairing. OCR scans documents. Voice input in 50 languages. 5 minutes.' },
            { step: '3', title: 'API webhook fires', desc: 'Your system receives structured JSON: vehicles, drivers, insurance, circumstances, photos, GPS, signatures.' },
            { step: '4', title: 'Auto-create claim', desc: 'Pre-populate your claims system. Certified PDF attached. Blockchain timestamp for legal proof.' },
          ].map((item, i) => (
            <div key={item.step} style={{ display: 'flex', gap: 20, marginBottom: i < 3 ? 32 : 0, alignItems: 'flex-start' }}>
              <div style={{
                minWidth: 44, height: 44, borderRadius: '50%', background: BOOM, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 800, flexShrink: 0,
              }}>
                {item.step}
              </div>
              <div style={{ paddingTop: 4 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ROI SECTION ── */}
      <section style={{ background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.15)', borderRadius: 24, padding: '48px 32px', maxWidth: 800, margin: '0 auto 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>ROI for your organization</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24, marginBottom: 32 }}>
          {[
            { metric: '80%', label: 'Faster claim intake' },
            { metric: '60%', label: 'Less manual data entry' },
            { metric: '90%', label: 'Data accuracy (OCR + AI)' },
            { metric: '0', label: 'Paper forms needed' },
          ].map((r) => (
            <div key={r.label}>
              <div style={{ fontSize: 36, fontWeight: 800, color: BOOM, fontFamily: 'Oswald, Inter, sans-serif' }}>{r.metric}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginTop: 4 }}>{r.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIAL PLACEHOLDER ── */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px 80px', textAlign: 'center' }}>
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: '40px 32px',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>"</div>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 20 }}>
            We are currently onboarding our first insurance partners. Your company could be featured here as an early adopter and shape the future of digital claims processing.
          </p>
          <div style={{ fontSize: 13, color: BOOM, fontWeight: 700 }}>
            Become our first partner &rarr;
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section style={{ textAlign: 'center', padding: '60px 24px 100px' }}>
        <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 16 }}>
          Ready to modernize accident claims?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.6 }}>
          Schedule a 30-minute demo. We'll show you the full API, webhook integration, and white-label options.
        </p>
        <button
          onClick={handleDemo}
          style={{
            background: BOOM, color: '#fff', border: 'none', padding: '16px 40px',
            borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(255,53,0,0.4)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          Schedule a Demo
        </button>
        <div style={{ marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
          contact@boom.contact
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.8 }}>
          boom.contact &middot; PEP's Swiss SA &middot; IDE CHE-476.484.632 &middot; Bellevue 7, 2950 Courgenay, Jura, Suisse<br />
          World's first digital accident report &middot; 50 languages &middot; 150+ countries &middot; Blockchain certified
        </div>
      </footer>
    </div>
  );
}

export default B2BPage;
