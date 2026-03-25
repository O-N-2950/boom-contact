import { useEffect, useRef, useState } from 'react';
import { ShareBoom } from '../components/ShareBoom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

interface Props {
  onStart: () => void;
  onPricing?: () => void;
  onGarage?: () => void;
  onAccount?: () => void;
  onLogout?: () => void;
  authUser?: { email: string; credits: number } | null;
}

function Counter({ to, suffix = '', duration = 2000 }: { to: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(ease * to));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : val.toLocaleString()}{suffix}</span>;
}

function GridBG() {
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      backgroundImage: `linear-gradient(rgba(255,53,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,53,0,0.04) 1px, transparent 1px)`,
      backgroundSize: '40px 40px',
      maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
      WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
    }} />
  );
}

function FloatingBadge({ icon, text, style }: { icon: string; text: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      position: 'absolute', display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', borderRadius: 100,
      background: 'rgba(14,14,24,0.92)',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(12px)',
      fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      animation: 'float 4s ease-in-out infinite',
      zIndex: 2,
      ...style,
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ opacity: 0.85 }}>{text}</span>
    </div>
  );
}

function PhoneMockup() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const steps = ['📄 Scan', '📱 QR', '📋 Form', '✍️ Sign', '📄 PDF'];
  useEffect(() => {
    const timer = setInterval(() => setStep(s => (s + 1) % steps.length), 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ position: 'relative', width: 200, height: 380, margin: '0 auto' }}>
      <FloatingBadge icon="🌍" text={t('landing.badges.languages')} style={{ top: 20, right: -75, animationDelay: '0s' }} />
      <FloatingBadge icon="⚡" text={t('landing.badges.time')} style={{ bottom: 90, left: -70, animationDelay: '1.5s' }} />
      <FloatingBadge icon="🔒" text={t('landing.badges.encrypted')} style={{ top: 150, right: -60, animationDelay: '0.7s' }} />
      <div style={{
        width: 200, height: 380, borderRadius: 36,
        background: 'linear-gradient(160deg, #1a1a2e 0%, #111120 100%)',
        border: '1.5px solid rgba(255,255,255,0.12)',
        boxShadow: '0 40px 80px rgba(0,0,0,0.6), inset 0 0 40px rgba(255,53,0,0.03)',
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{ height: 32, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 9, opacity: 0.5 }}>
          <span>9:41</span>
          <div style={{ width: 60, height: 12, borderRadius: 8, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }} />
          <span>87%</span>
        </div>
        <div style={{ padding: '8px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--boom)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>💥</div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>boom.contact</div>
        </div>
        <div style={{ padding: '6px 14px', display: 'flex', gap: 3 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? 'var(--boom)' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
          ))}
        </div>
        <div style={{ padding: '14px 16px', minHeight: 120 }}>
          {step === 0 && <div style={{ textAlign: 'center', animation: 'fadeInUp 0.4s ease' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6 }}>Permis circulation</div>
            <div style={{ height: 55, borderRadius: 8, background: 'rgba(255,53,0,0.1)', border: '1px dashed rgba(255,53,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 9, opacity: 0.5 }}>{t('landing.mockup.capture')}</span>
            </div>
          </div>}
          {step === 1 && <div style={{ textAlign: 'center', animation: 'fadeInUp 0.4s ease' }}>
            <div style={{ width: 72, height: 72, margin: '0 auto 8px', borderRadius: 8, background: 'linear-gradient(135deg, #FF3500, #FFB300)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📱</div>
            <div style={{ fontSize: 9, opacity: 0.5 }}>{t('landing.mockup.waiting')}</div>
          </div>}
          {step === 2 && <div style={{ animation: 'fadeInUp 0.4s ease' }}>
            {['Plaque', 'Marque', 'Assureur'].map((f, i) => (
              <div key={i} style={{ marginBottom: 7 }}>
                <div style={{ fontSize: 8, opacity: 0.4, marginBottom: 2 }}>{f}</div>
                <div style={{ height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
            ))}
          </div>}
          {step === 3 && <div style={{ textAlign: 'center', animation: 'fadeInUp 0.4s ease' }}>
            <div style={{ height: 72, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 6 }} />
            <div style={{ fontSize: 9, opacity: 0.5 }}>✍️ Sign</div>
          </div>}
          {step === 4 && <div style={{ textAlign: 'center', animation: 'fadeInUp 0.4s ease' }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>📄</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', marginBottom: 6 }}>{t('landing.mockup.done')}</div>
            <div style={{ height: 26, borderRadius: 6, background: 'var(--boom)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 700 }}>{t('landing.mockup.send')}</span>
            </div>
          </div>}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 90, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: -36, left: '50%', transform: 'translateX(-50%)', width: 100, height: 32, background: 'rgba(255,53,0,0.28)', filter: 'blur(20px)', borderRadius: '50%' }} />
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay }: { icon: string; title: string; desc: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      padding: '20px', borderRadius: 14,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
    }}>
      <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.5 }}>{desc}</div>
    </div>
  );
}

export function LandingPage({ onStart, onPricing, onGarage, onAccount, onLogout, authUser }: Props) {
  const [showShare, setShowShare] = useState(false);
  const { t } = useTranslation();
  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setHeroVisible(true)); }, []);

  const flags = ['🇨🇭','🇫🇷','🇩🇪','🇮🇹','🇪🇸','🇬🇧','🇵🇹','🇧🇪','🇳🇱','🇵🇱','🇺🇸','🇯🇵','🇰🇷','🇨🇳','🇮🇳','🇧🇷','🇦🇺','🇲🇦','🇿🇦','🇸🇦'];

  const features = t('landing.features.list', { returnObjects: true }) as { icon: string; title: string; desc: string }[];
  const howSteps = t('landing.how.steps', { returnObjects: true }) as { step: string; icon: string; title: string; desc: string }[];

  const stats = [
    { val: 1800000, suffix: '', label: t('landing.stats.accidents') },
    { val: 50,      suffix: '', label: t('landing.stats.languages') },
    { val: 5,       suffix: ' min', label: t('landing.stats.time') },
  ];

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', overflowX: 'hidden' }}>

      {/* HERO */}
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <GridBG />
        <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(255,53,0,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Nav */}
        <nav style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="boom.contact" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, padding: '5px 12px', borderRadius: 20, border: '1px solid rgba(255,179,0,0.3)', background: 'rgba(255,179,0,0.08)', color: '#FFB300', fontFamily: 'DM Mono, monospace' }}>
              RGPD · nLPD
            </div>
            <LanguageSwitcher compact />
          </div>
        </nav>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 24px 40px', position: 'relative', zIndex: 10 }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: 'rgba(255,53,0,0.1)', border: '1px solid rgba(255,53,0,0.2)', width: 'fit-content', marginBottom: 20, opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(10px)', transition: 'all 0.5s ease' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--boom)', display: 'inline-block', animation: 'pulse-red 2s infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: 'DM Mono, monospace', color: 'var(--boom)' }}>{t('landing.badge')}</span>
          </div>

          {/* Title */}
          <h1 style={{ fontFamily: 'Oswald, sans-serif', fontSize: 'clamp(48px,12vw,72px)', lineHeight: 0.95, letterSpacing: '-1px', marginBottom: 20, opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(20px)', transition: 'all 0.6s ease 0.1s' }}>
            <span style={{ display: 'block' }}>{t('landing.hero.line1')}</span>
            <span style={{ display: 'block' }}>{t('landing.hero.line2').split(' ')[0]}&nbsp;<span style={{ color: 'var(--boom)', textShadow: '0 0 40px rgba(255,53,0,0.5)' }}>{t('landing.hero.line2').split(' ').slice(1).join(' ')}</span></span>
            <span style={{ display: 'block', opacity: 0.35 }}>{t('landing.hero.line3')}</span>
            <span style={{ display: 'block' }}>{t('landing.hero.line4')}</span>
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: 15, lineHeight: 1.65, opacity: heroVisible ? 0.6 : 0, marginBottom: 28, maxWidth: 340, transform: heroVisible ? 'none' : 'translateY(16px)', transition: 'all 0.6s ease 0.2s' }}>
            {t('landing.subtitle')}
          </p>

          {/* CTA */}
          <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(16px)', transition: 'all 0.6s ease 0.3s', marginBottom: 44 }}>

            {/* Header compte si connecté */}
            {authUser && (
              <div style={{
                width: '100%', marginBottom: 10,
                borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', overflow: 'hidden',
              }}>
                {/* Zone cliquable → compte */}
                <button onClick={onAccount} style={{
                  flex: 1, padding: '10px 14px',
                  background: 'none', border: 'none',
                  color: 'var(--text)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
                }}>
                  <span style={{ fontSize: 16 }}>👤</span>
                  <span style={{ opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{authUser.email}</span>
                  <span style={{ marginLeft: 'auto', background: 'var(--boom)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {authUser.credits === 999999 ? '∞' : authUser.credits} crédit{authUser.credits !== 1 ? 's' : ''}
                  </span>
                </button>
                {/* Bouton déconnexion — toujours visible */}
                <button onClick={onLogout} title="Se déconnecter" style={{
                  padding: '10px 14px', background: 'none',
                  border: 'none', borderLeft: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 16,
                  flexShrink: 0, transition: 'color 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#FF3500')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                >
                  ↩
                </button>
              </div>
            )}

            <button onClick={onStart} style={{ width: '100%', padding: '18px 24px', fontSize: 16, fontWeight: 700, borderRadius: 14, border: 'none', background: 'var(--boom)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, boxShadow: '0 8px 32px rgba(255,53,0,0.45)', transition: 'transform 0.15s' }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <span style={{ fontSize: 20 }}>💥</span>
              {t('landing.cta.start')}
              <span style={{ marginLeft: 'auto', fontSize: 20, opacity: 0.7 }}>→</span>
            </button>

            {/* Bouton Garage — préparer à l'avance */}
            <button onClick={onGarage} style={{
              width: '100%', marginTop: 10, padding: '14px 18px',
              borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(240,237,232,0.8)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 600,
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,53,0,0.4)'; e.currentTarget.style.background = 'rgba(255,53,0,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              <span style={{ fontSize: 20 }}>🚗</span>
              <div style={{ textAlign: 'left' as const, flex: 1 }}>
                <div>Préparer mon garage</div>
                <div style={{ fontSize: 11, opacity: 0.45, fontWeight: 400, marginTop: 1 }}>
                  Enregistre tes véhicules à l'avance · 30 sec par scan
                </div>
              </div>
              <span style={{ opacity: 0.35, fontSize: 16 }}>›</span>
            </button>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <p style={{ flex: 1, textAlign: 'center', fontSize: 11, opacity: 0.3, letterSpacing: 1, fontFamily: 'DM Mono, monospace' }}>
                {t('landing.cta.from')}
              </p>
              {onPricing && (
                <button onClick={onPricing} style={{ fontSize: 11, opacity: 0.5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                  {t('landing.cta.pricing')}
                </button>
              )}
            </div>
          </div>

          {/* Phone */}
          <div style={{ opacity: heroVisible ? 1 : 0, transition: 'opacity 0.8s ease 0.5s' }}>
            <PhoneMockup />
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{ padding: '44px 24px', background: 'var(--dark)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 'clamp(22px,6vw,30px)', color: 'var(--boom)', lineHeight: 1, marginBottom: 6 }}>
                <Counter to={stat.val} suffix={stat.suffix} duration={2500} />
              </div>
              <div style={{ fontSize: 10, opacity: 0.4, lineHeight: 1.4, letterSpacing: 0.3 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{ padding: '52px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 3, opacity: 0.3, textTransform: 'uppercase' as const, marginBottom: 10 }}>{t('landing.how.label')}</div>
          <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: 30, letterSpacing: '-0.5px' }}>{t('landing.how.title')} <span style={{ color: 'var(--boom)' }}>{t('landing.how.title_accent')}</span></h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {howSteps.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, position: 'relative', paddingBottom: i < howSteps.length - 1 ? 28 : 0 }}>
              {i < howSteps.length - 1 && <div style={{ position: 'absolute', left: 19, top: 42, width: 1, height: 'calc(100% - 10px)', background: 'linear-gradient(to bottom, rgba(255,53,0,0.25), transparent)' }} />}
              <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,53,0,0.1)', border: '1px solid rgba(255,53,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Oswald, sans-serif', fontSize: 13, color: 'var(--boom)' }}>
                {item.step}
              </div>
              <div style={{ paddingTop: 7 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{item.icon} {item.title}</div>
                <div style={{ fontSize: 12, opacity: 0.5, lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ padding: '0 24px 52px' }}>
        <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: 28, textAlign: 'center', marginBottom: 28 }}>{t('landing.features.title')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {features.map((f, i) => <FeatureCard key={i} {...f} delay={i * 80} />)}
        </div>
      </div>

      {/* COUNTRIES */}
      <div style={{ padding: '36px 24px', background: 'var(--dark)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 3, opacity: 0.3, textTransform: 'uppercase' as const, marginBottom: 8 }}>{t('landing.coverage.label')}</div>
          <h3 style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22 }}>{t('landing.coverage.title')}</h3>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {flags.map((f, i) => <span key={i} style={{ fontSize: 22, opacity: 0.7, cursor: 'default', transition: 'all 0.2s' }} onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '1'; (e.target as HTMLElement).style.transform = 'scale(1.3)'; }} onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '0.7'; (e.target as HTMLElement).style.transform = ''; }}>{f}</span>)}
        </div>
        <p style={{ textAlign: 'center', marginTop: 14, fontSize: 11, opacity: 0.3 }}>{t('landing.coverage.more')}</p>
      </div>

      {/* LEGAL */}
      <div style={{ padding: '36px 24px' }}>
        <div style={{ padding: '22px', borderRadius: 14, background: 'rgba(255,179,0,0.06)', border: '1px solid rgba(255,179,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <span style={{ fontSize: 26, flexShrink: 0 }}>⚖️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 5 }}>{t('landing.legal.title')}</div>
              <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.65 }}>{t('landing.legal.text')}</div>
            </div>
          </div>
        </div>
      </div>


      {/* ── SECTION SUISSE — PARTENARIAT WIN WIN ───────────────────── */}
      <div style={{ padding: '44px 24px', background: 'linear-gradient(160deg, #0A1628 0%, #0F2439 100%)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
        {/* Drapeau suisse décoratif en fond */}
        <div style={{ position: 'absolute', right: -30, top: '50%', transform: 'translateY(-50%)', fontSize: 160, opacity: 0.04, userSelect: 'none', pointerEvents: 'none' }}>🇨🇭</div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Badge Suisse */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, opacity: 0.7, marginBottom: 20 }}>
            🇨🇭 Suisse · Switzerland · Schweiz
          </div>

          <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: 'clamp(22px, 6vw, 28px)', lineHeight: 1.1, marginBottom: 8 }}>
            Clients <span style={{ color: '#3176A6' }}>WIN WIN</span> ?<br/>
            <span style={{ color: 'var(--boom)' }}>Aucun scan requis.</span>
          </h2>

          <p style={{ fontSize: 13, opacity: 0.55, lineHeight: 1.65, marginBottom: 24, maxWidth: 340 }}>
            Si votre véhicule est assuré via{' '}
            <strong style={{ color: 'rgba(255,255,255,0.85)' }}>WIN WIN Finance Group</strong>,
            vos données (plaque, marque, assureur, numéro de police) sont
            automatiquement pré-chargées. Pas de permis à photographier, pas de carte verte à sortir.
          </p>

          {/* Avantages clients WinWin */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {[
              { icon: '⚡', text: 'Constat démarré en 10 secondes depuis le portail WIN WIN' },
              { icon: '📋', text: 'Plaque, marque, assureur et N° de police déjà remplis' },
              { icon: '🤝', text: 'Courtier WIN WIN automatiquement informé du sinistre' },
            ].map(({ icon, text }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Badge partenaire */}
          <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(49,118,166,0.1)', border: '1.5px solid rgba(49,118,166,0.25)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(49,118,166,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🤝</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, color: '#3176A6' }}>Partenaire officiel boom.contact</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2 }}>WIN WIN Finance Group Sàrl</div>
              <a href="https://winwin.swiss" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
                winwin.swiss →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div style={{ padding: '44px 24px 60px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,53,0,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <img src="/logo.png" alt="boom.contact" style={{ width: 120, height: 120, objectFit: 'contain', marginBottom: 14, display: 'inline-block', animation: 'float 4s ease-in-out infinite' }} />
          <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: 28, marginBottom: 10 }}>{t('landing.finalCta.title')}</h2>
          <p style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.65, marginBottom: 28, maxWidth: 280, margin: '0 auto 28px' }}>{t('landing.finalCta.subtitle')}</p>
          {/* Bouton partage viral */}
          <button
            onClick={() => setShowShare(true)}
            style={{
              marginBottom: 16,
              padding: '12px 24px',
              borderRadius: 12,
              border: '1.5px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(240,237,232,0.8)',
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>📤</span>
            Partager boom.contact à tes proches
          </button>
          <br />
          <button onClick={onStart} style={{ padding: '16px 32px', fontSize: 15, fontWeight: 700, borderRadius: 12, border: 'none', background: 'var(--boom)', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(255,53,0,0.5)' }}>
            {t('landing.finalCta.button')} <span style={{ fontSize: 16 }}>→</span>
          </button>
          <p style={{ marginTop: 10, fontSize: 10, opacity: 0.3, letterSpacing: 1, fontFamily: 'DM Mono, monospace' }}>{t('landing.cta.free')}</p>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ padding: '22px', borderTop: '1px solid var(--border)', background: 'var(--dark)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.png" alt="boom.contact" style={{ height: 32, objectFit: 'contain' }} />
          </div>
          <span style={{ fontSize: 10, opacity: 0.25, fontFamily: 'DM Mono, monospace' }}>{t('landing.footer.copyright')}</span>
        </div>
        <div style={{ fontSize: 10, opacity: 0.22, lineHeight: 1.8 }}>
          {t('landing.footer.address').split('\n').map((line, i) => <span key={i}>{line}{i === 0 ? <br/> : ''}</span>)}
        </div>
        {/* Legal links */}
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap' as const, gap: 12 }}>
          {[
            { label: 'Politique de confidentialité', href: '/?privacy=true' },
            { label: 'CGU', href: '#cgu', action: 'cgu' },
            { label: 'Cookies', href: '#cookies' },
            { label: 'Mentions légales', href: '/?privacy=true' },
            { label: 'RGPD · nLPD', href: '/?privacy=true' },
            { label: 'privacy@boom.contact', href: 'mailto:privacy@boom.contact' },
          ].map(({ label, href, action }) => (
            <a key={label} href={href}
              onClick={action === 'cgu' ? (e: any) => { e.preventDefault(); } : undefined}
              style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}
              onMouseOver={(e: any) => e.target.style.color = 'rgba(255,255,255,0.5)'}
              onMouseOut={(e: any) => e.target.style.color = 'rgba(255,255,255,0.2)'}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>

      {showShare && <ShareBoom onClose={() => setShowShare(false)} context="landing" />}  );
}




