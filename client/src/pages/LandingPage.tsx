import { useEffect, useRef, useState } from 'react';
import { ShareBoom } from '../components/ShareBoom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeToggle } from '../components/ThemeToggle';

interface Props {
  onStart: () => void;
  onPricing?: () => void;
  onGarage?: () => void;
  onAccount?: () => void;
  onLogout?: () => void;
  authUser?: { email: string; credits: number } | null;
}

function useWindowWidth() {
  const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return w;
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
      ...style,
    }}>
      <span>{icon}</span><span>{text}</span>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 280, margin: '0 auto' }}>
      <div style={{
        background: 'linear-gradient(160deg, rgba(255,53,0,0.15) 0%, rgba(0,0,0,0.6) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 28, padding: '18px 14px', backdropFilter: 'blur(20px)',
        boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,53,0,0.1)',
      }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: '14px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--boom)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>💥</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700 }}>boom.contact</div>
              <div style={{ fontSize: 9, opacity: 0.4, fontFamily: 'DM Mono, monospace' }}>SESSION ACTIVE</div>
            </div>
          </div>
          <div style={{ background: 'rgba(255,53,0,0.08)', border: '1px solid rgba(255,53,0,0.2)', borderRadius: 12, padding: '12px', marginBottom: 8 }}>
            <div style={{ fontSize: 9, opacity: 0.4, marginBottom: 4, letterSpacing: 1, fontFamily: 'DM Mono, monospace' }}>CONDUCTEUR A</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>VW Golf · GE 123 456</div>
            <div style={{ fontSize: 10, opacity: 0.5 }}>Zurich Insurance · ✅ OCR</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px', marginBottom: 12 }}>
            <div style={{ fontSize: 9, opacity: 0.4, marginBottom: 4, letterSpacing: 1, fontFamily: 'DM Mono, monospace' }}>CONDUCTEUR B</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Audi A4 · BE 789 012</div>
            <div style={{ fontSize: 10, opacity: 0.5 }}>AXA · ✅ Scanné</div>
          </div>
          <div style={{ background: 'var(--boom)', borderRadius: 10, padding: '10px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
            ✍️ Signer le constat
          </div>
        </div>
      </div>
      <FloatingBadge icon="✅" text="PDF généré" style={{ bottom: -14, left: -20, fontSize: 11 }} />
      <FloatingBadge icon="🌍" text="150+ pays" style={{ top: 20, right: -24, fontSize: 11 }} />
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay = 0 }: { icon: string; title: string; desc: string; delay?: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      padding: '18px', borderRadius: 14,
      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
      transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
    }}>
      <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.5 }}>{desc}</div>
    </div>
  );
}

// ─── Max width container for desktop sections ────────────────
function Section({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', ...style }}>
      {children}
    </div>
  );
}

export function LandingPage({ onStart, onPricing, onGarage, onAccount, onLogout, authUser }: Props) {
  const [showShare, setShowShare] = useState(false);
  const { t } = useTranslation();
  const [heroVisible, setHeroVisible] = useState(false);
  const width = useWindowWidth();
  const isDesktop = width >= 900;

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
    <div style={{ overflowX: 'hidden' }}>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <GridBG />
        <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: isDesktop ? 900 : 600, height: 400, background: 'radial-gradient(ellipse, rgba(255,53,0,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* NAV */}
        <nav style={{ padding: isDesktop ? '20px 48px' : '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10, maxWidth: isDesktop ? 1200 : 'none', margin: isDesktop ? '0 auto' : undefined, width: '100%', boxSizing: 'border-box' as const }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo.png" alt="boom.contact" style={{ width: 64, height: 64, objectFit: 'contain' }} />
            {isDesktop && (
              <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, letterSpacing: '-0.5px' }}>
                <span style={{ color: 'var(--boom)' }}>boom</span>
                <span style={{ opacity: 0.3 }}>.</span>
                <span>contact</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isDesktop ? 16 : 10 }}>
            {isDesktop && (
              <>
                <button onClick={onGarage} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600, padding: '6px 12px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
                  🚗 Mon garage
                </button>
                <button onClick={() => { const el = document.getElementById('tarifs'); el?.scrollIntoView({ behavior: 'smooth' }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600, padding: '6px 12px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
                  Tarifs
                </button>
              </>
            )}
            <div style={{ fontSize: 10, letterSpacing: 2, padding: '5px 12px', borderRadius: 20, border: '1px solid rgba(255,179,0,0.3)', background: 'rgba(255,179,0,0.08)', color: '#FFB300', fontFamily: 'DM Mono, monospace' }}>
              RGPD · nLPD
            </div>
            <LanguageSwitcher compact />
            {isDesktop && (
              <button onClick={onStart} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: 'var(--boom)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(255,53,0,0.4)' }}>
                💥 Démarrer
              </button>
            )}
          </div>
        </nav>

        {/* HERO CONTENT */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: isDesktop ? 'center' : 'stretch',
          padding: isDesktop ? '40px 48px 60px' : '16px 24px 40px',
          position: 'relative', zIndex: 10,
          maxWidth: isDesktop ? 1200 : 'none',
          margin: isDesktop ? '0 auto' : undefined,
          width: '100%',
          boxSizing: 'border-box' as const,
          gap: isDesktop ? 60 : 0,
        }}>

          {/* LEFT — Text + CTAs */}
          <div style={{ flex: isDesktop ? '0 0 55%' : undefined }}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: 'rgba(255,53,0,0.1)', border: '1px solid rgba(255,53,0,0.2)', width: 'fit-content', marginBottom: 20, opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(10px)', transition: 'all 0.5s ease' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--boom)', display: 'inline-block', animation: 'pulse-red 2s infinite' }} />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: 'DM Mono, monospace', color: 'var(--boom)' }}>{t('landing.badge')}</span>
            </div>

            {/* Title */}
            <h1 style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 'clamp(56px,5vw,80px)' : 'clamp(48px,12vw,72px)', lineHeight: 0.95, letterSpacing: '-1px', marginBottom: 20, opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(20px)', transition: 'all 0.6s ease 0.1s' }}>
              <span style={{ display: 'block' }}>{t('landing.hero.line1')}</span>
              <span style={{ display: 'block' }}>{t('landing.hero.line2').split(' ')[0]}&nbsp;<span style={{ color: 'var(--boom)', textShadow: '0 0 40px rgba(255,53,0,0.5)' }}>{t('landing.hero.line2').split(' ').slice(1).join(' ')}</span></span>
              <span style={{ display: 'block', opacity: 0.35 }}>{t('landing.hero.line3')}</span>
              <span style={{ display: 'block' }}>{t('landing.hero.line4')}</span>
            </h1>

            {/* Subtitle */}
            <p style={{ fontSize: isDesktop ? 16 : 15, lineHeight: 1.65, opacity: heroVisible ? 0.6 : 0, marginBottom: 28, maxWidth: 440, transform: heroVisible ? 'none' : 'translateY(16px)', transition: 'all 0.6s ease 0.2s' }}>
              {t('landing.subtitle')}
            </p>

            {/* CTAs */}
            <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(16px)', transition: 'all 0.6s ease 0.3s', marginBottom: isDesktop ? 0 : 44, maxWidth: isDesktop ? 440 : 'none' }}>

              {authUser && (
                <div style={{ width: '100%', marginBottom: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                  <button onClick={onAccount} style={{ flex: 1, padding: '10px 14px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <span style={{ fontSize: 16 }}>👤</span>
                    <span style={{ opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{authUser.email}</span>
                    <span style={{ marginLeft: 'auto', background: 'var(--boom)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {authUser.credits === 999999 ? '∞' : authUser.credits} crédit{authUser.credits !== 1 ? 's' : ''}
                    </span>
                  </button>
                  <button onClick={onLogout} title="Se déconnecter" style={{ padding: '10px 14px', background: 'none', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 16, flexShrink: 0, transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#FF3500')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
                    ↩
                  </button>
                </div>
              )}

              <button onClick={onStart} style={{ width: '100%', padding: '18px 24px', fontSize: 16, fontWeight: 700, borderRadius: 14, border: 'none', background: 'var(--boom)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, boxShadow: '0 8px 32px rgba(255,53,0,0.45)', transition: 'transform 0.15s' }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>
                <span style={{ fontSize: 20 }}>💥</span>
                {t('landing.cta.start')}
                <span style={{ marginLeft: 'auto', fontSize: 20, opacity: 0.7 }}>→</span>
              </button>

              <button onClick={onGarage} style={{ width: '100%', marginTop: 10, padding: '14px 18px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'rgba(240,237,232,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 600, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,53,0,0.4)'; e.currentTarget.style.background = 'rgba(255,53,0,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}>
                <span style={{ fontSize: 20 }}>🚗</span>
                <div style={{ textAlign: 'left' as const, flex: 1 }}>
                  <div>Préparer mon garage</div>
                  <div style={{ fontSize: 11, opacity: 0.45, fontWeight: 400, marginTop: 1 }}>Enregistre tes véhicules à l'avance · 30 sec par scan</div>
                </div>
                <span style={{ opacity: 0.35, fontSize: 16 }}>›</span>
              </button>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <p style={{ flex: 1, textAlign: 'center', fontSize: 11, opacity: 0.3, letterSpacing: 1, fontFamily: 'DM Mono, monospace' }}>{t('landing.cta.from')}</p>
                {onPricing && (
                  <button onClick={() => { const el = document.getElementById('tarifs'); el ? el.scrollIntoView({ behavior: 'smooth' }) : onPricing?.(); }} style={{ fontSize: 11, opacity: 0.5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                    {t('landing.cta.pricing')}
                  </button>
                )}
              </div>

              {/* Badges desktop */}
              {isDesktop && (
                <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' as const }}>
                  {[
                    { icon: '🔒', text: 'Chiffré SSL' },
                    { icon: '🌍', text: '50 langues' },
                    { icon: '⚡', text: '5 minutes' },
                    { icon: '📄', text: 'PDF certifié' },
                  ].map(b => (
                    <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 11, opacity: 0.7 }}>
                      <span>{b.icon}</span><span>{b.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Phone mockup (desktop only inline, mobile below) */}
          <div style={{ flex: isDesktop ? '0 0 40%' : undefined, opacity: heroVisible ? 1 : 0, transition: 'opacity 0.8s ease 0.5s', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: isDesktop ? 0 : 0 }}>
            <PhoneMockup />
          </div>

        </div>
      </div>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <div style={{ padding: isDesktop ? '52px 48px' : '44px 24px', background: 'var(--dark)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <Section>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: isDesktop ? 40 : 8 }}>
            {stats.map((stat, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 'clamp(36px,4vw,52px)' : 'clamp(22px,6vw,30px)', color: 'var(--boom)', lineHeight: 1, marginBottom: 8 }}>
                  <Counter to={stat.val} suffix={stat.suffix} duration={2500} />
                </div>
                <div style={{ fontSize: isDesktop ? 13 : 10, opacity: 0.45, lineHeight: 1.4, letterSpacing: 0.3 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <div style={{ padding: isDesktop ? '72px 48px' : '52px 24px' }}>
        <Section>
          <div style={{ textAlign: 'center', marginBottom: isDesktop ? 52 : 36 }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 3, opacity: 0.3, textTransform: 'uppercase' as const, marginBottom: 10 }}>{t('landing.how.label')}</div>
            <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 36 : 30, letterSpacing: '-0.5px' }}>{t('landing.how.title')} <span style={{ color: 'var(--boom)' }}>{t('landing.how.title_accent')}</span></h2>
          </div>

          {isDesktop ? (
            /* Desktop: horizontal steps */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20 }}>
              {howSteps.map((item, i) => (
                <div key={i} style={{ position: 'relative', textAlign: 'center' }}>
                  {i < howSteps.length - 1 && (
                    <div style={{ position: 'absolute', top: 19, left: '60%', width: '80%', height: 1, background: 'linear-gradient(to right, rgba(255,53,0,0.3), transparent)' }} />
                  )}
                  <div style={{ width: 40, height: 40, borderRadius: '50%', margin: '0 auto 14px', background: 'rgba(255,53,0,0.1)', border: '1px solid rgba(255,53,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Oswald, sans-serif', fontSize: 13, color: 'var(--boom)' }}>
                    {item.step}
                  </div>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{item.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.5, lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          ) : (
            /* Mobile: vertical list */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {howSteps.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, position: 'relative', paddingBottom: i < howSteps.length - 1 ? 28 : 0 }}>
                  {i < howSteps.length - 1 && <div style={{ position: 'absolute', left: 19, top: 42, width: 1, height: 'calc(100% - 10px)', background: 'linear-gradient(to bottom, rgba(255,53,0,0.25), transparent)' }} />}
                  <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,53,0,0.1)', border: '1px solid rgba(255,53,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Oswald, sans-serif', fontSize: 13, color: 'var(--boom)' }}>{item.step}</div>
                  <div style={{ paddingTop: 7 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{item.icon} {item.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.5, lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <div style={{ padding: isDesktop ? '0 48px 72px' : '0 24px 52px' }}>
        <Section>
          <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 34 : 28, textAlign: 'center', marginBottom: 32 }}>{t('landing.features.title')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr 1fr' : '1fr 1fr', gap: isDesktop ? 16 : 10 }}>
            {features.map((f, i) => <FeatureCard key={i} {...f} delay={i * 80} />)}
          </div>
        </Section>
      </div>

      {/* ── COUNTRIES ─────────────────────────────────────────── */}
      <div style={{ padding: isDesktop ? '52px 48px' : '36px 24px', background: 'var(--dark)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <Section>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 3, opacity: 0.3, textTransform: 'uppercase' as const, marginBottom: 8 }}>{t('landing.coverage.label')}</div>
            <h3 style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 28 : 22 }}>{t('landing.coverage.title')}</h3>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {flags.map((f, i) => <span key={i} style={{ fontSize: isDesktop ? 28 : 22, opacity: 0.7, cursor: 'default', transition: 'all 0.2s' }} onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '1'; (e.target as HTMLElement).style.transform = 'scale(1.3)'; }} onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '0.7'; (e.target as HTMLElement).style.transform = ''; }}>{f}</span>)}
          </div>
          <p style={{ textAlign: 'center', marginTop: 14, fontSize: 11, opacity: 0.3 }}>{t('landing.coverage.more')}</p>
        </Section>
      </div>

      {/* ── LEGAL ─────────────────────────────────────────────── */}
      <div style={{ padding: isDesktop ? '52px 48px' : '36px 24px' }}>
        <Section>
          <div style={{ padding: isDesktop ? '28px 32px' : '22px', borderRadius: 14, background: 'rgba(255,179,0,0.06)', border: '1px solid rgba(255,179,0,0.15)', display: 'flex', alignItems: isDesktop ? 'center' : 'flex-start', gap: 16 }}>
            <span style={{ fontSize: 32, flexShrink: 0 }}>⚖️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: isDesktop ? 16 : 14, marginBottom: 6 }}>{t('landing.legal.title')}</div>
              <div style={{ fontSize: 13, opacity: 0.6, lineHeight: 1.65 }}>{t('landing.legal.text')}</div>
            </div>
          </div>
        </Section>
      </div>

      {/* ── WIN WIN ───────────────────────────────────────────── */}
      <div style={{ padding: isDesktop ? '72px 48px' : '44px 24px', background: 'linear-gradient(160deg, #0A1628 0%, #0F2439 100%)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -30, top: '50%', transform: 'translateY(-50%)', fontSize: 200, opacity: 0.04, userSelect: 'none', pointerEvents: 'none' }}>🇨🇭</div>
        <Section style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: isDesktop ? 60 : 0, alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, opacity: 0.7, marginBottom: 20 }}>
                🇨🇭 Suisse · Switzerland · Schweiz
              </div>
              <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 36 : 'clamp(22px, 6vw, 28px)', lineHeight: 1.1, marginBottom: 10 }}>
                Clients <span style={{ color: '#3176A6' }}>WIN WIN</span> ?<br/>
                <span style={{ color: 'var(--boom)' }}>Aucun scan requis.</span>
              </h2>
              <p style={{ fontSize: 13, opacity: 0.55, lineHeight: 1.65, marginBottom: 28, maxWidth: 400 }}>
                Si votre véhicule est assuré via{' '}
                <strong style={{ color: 'rgba(255,255,255,0.85)' }}>WIN WIN Finance Group</strong>,
                vos données sont automatiquement pré-chargées. Pas de permis à photographier, pas de carte verte à sortir.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            </div>
            <div style={{ marginTop: isDesktop ? 0 : 32 }}>
              <div style={{ padding: isDesktop ? '28px' : '16px', borderRadius: 16, background: 'rgba(49,118,166,0.1)', border: '1.5px solid rgba(49,118,166,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(49,118,166,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🤝</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, color: '#3176A6' }}>Partenaire officiel boom.contact</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>WIN WIN Finance Group Sàrl</div>
                    <a href="https://winwin.swiss" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>winwin.swiss →</a>
                  </div>
                </div>
                {isDesktop && (
                  <div style={{ fontSize: 12, opacity: 0.5, lineHeight: 1.7, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                    Clients WIN WIN : connectez-vous via le portail WinWin pour démarrer un constat pré-rempli instantanément, ou identifiez-vous directement dans boom.contact en tant que conducteur B.
                  </div>
                )}
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* ── TARIFS ────────────────────────────────────────────── */}
      <div id="tarifs" style={{ padding: isDesktop ? '72px 48px' : '52px 20px', background: 'var(--dark)', borderTop: '1px solid var(--border)' }}>
        <Section>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,53,0,0.12)', border: '1px solid rgba(255,53,0,0.3)', borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700, color: 'var(--boom)', letterSpacing: 1, marginBottom: 12 }}>TARIFS</div>
            <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 36 : 26, fontWeight: 700, marginBottom: 8 }}>Simple, transparent, mondial</h2>
            <p style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.6 }}>1 crédit = 1 constat complet · Valable dans 150+ pays · Sans abonnement</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr 1fr' : '1fr', gap: isDesktop ? 16 : 12, maxWidth: isDesktop ? 'none' : 480, margin: '0 auto' }}>
            {[
              { id: 'single', icon: '📄', label: '1 constat',  price: '4.90', currency: 'CHF / EUR', desc: 'Pour un accident ponctuel', badge: null, savings: null },
              { id: 'pack3',  icon: '👨‍👩‍👧', label: '3 constats', price: '12.90', currency: 'CHF / EUR', desc: 'Pour toute la famille',    badge: '⭐ Populaire', savings: '-12%' },
              { id: 'pack10', icon: '🚗', label: '10 constats', price: '34.90', currency: 'CHF / EUR', desc: 'Pour flottes et courtiers', badge: null, savings: '-29%' },
            ].map((pkg) => (
              <div key={pkg.id} onClick={onPricing} style={{ background: pkg.badge ? 'rgba(255,53,0,0.06)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${pkg.badge ? 'rgba(255,53,0,0.35)' : 'var(--border)'}`, borderRadius: 16, padding: isDesktop ? '24px 20px' : '18px 20px', cursor: 'pointer', display: 'flex', flexDirection: isDesktop ? 'column' : 'row', alignItems: isDesktop ? 'flex-start' : 'center', gap: isDesktop ? 10 : 16, transition: 'all 0.15s', position: 'relative' as const }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                {pkg.badge && (
                  <div style={{ position: 'absolute' as const, top: -10, left: 20, background: 'var(--boom)', color: '#fff', borderRadius: 20, padding: '2px 12px', fontSize: 10, fontWeight: 700 }}>{pkg.badge}</div>
                )}
                <span style={{ fontSize: isDesktop ? 36 : 28, flexShrink: 0 }}>{pkg.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: isDesktop ? 16 : 15 }}>{pkg.label}</span>
                    {pkg.savings && <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{pkg.savings}</span>}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.45 }}>{pkg.desc}</div>
                </div>
                <div style={{ textAlign: isDesktop ? 'left' : 'right' as const, flexShrink: 0, marginTop: isDesktop ? 8 : 0 }}>
                  <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 28 : 22, fontWeight: 700, color: pkg.badge ? 'var(--boom)' : 'var(--text)', lineHeight: 1 }}>{pkg.price}</div>
                  <div style={{ fontSize: 10, opacity: 0.4, marginTop: 2 }}>{pkg.currency}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, justifyContent: 'center', marginTop: 24 }}>
            {['✅ Sans abonnement', '✅ Crédits sans expiration', '✅ PDF certifié', '✅ 150+ pays'].map(g => (
              <span key={g} style={{ fontSize: 11, opacity: 0.55, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 10px' }}>{g}</span>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button onClick={onPricing} style={{ padding: '15px 40px', borderRadius: 12, border: 'none', background: 'var(--boom)', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 6px 24px rgba(255,53,0,0.4)' }}>
              Acheter des crédits →
            </button>
          </div>
        </Section>
      </div>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <div style={{ padding: isDesktop ? '80px 48px' : '44px 24px 60px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,53,0,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <img src="/logo.png" alt="boom.contact" style={{ width: 120, height: 120, objectFit: 'contain', marginBottom: 14, display: 'inline-block', animation: 'float 4s ease-in-out infinite' }} />
          <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 40 : 28, marginBottom: 10 }}>{t('landing.finalCta.title')}</h2>
          <p style={{ fontSize: 14, opacity: 0.5, lineHeight: 1.65, marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>{t('landing.finalCta.subtitle')}</p>
          <button onClick={onStart} style={{ padding: '18px 44px', fontSize: 16, fontWeight: 700, borderRadius: 14, border: 'none', background: 'var(--boom)', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(255,53,0,0.5)' }}>
            {t('landing.finalCta.button')} <span style={{ fontSize: 18 }}>→</span>
          </button>
          <p style={{ marginTop: 12, fontSize: 10, opacity: 0.3, letterSpacing: 1, fontFamily: 'DM Mono, monospace' }}>{t('landing.cta.free')}</p>
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <div style={{ padding: isDesktop ? '32px 48px' : '22px', borderTop: '1px solid var(--border)', background: 'var(--dark)' }}>
        <Section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start', flexDirection: isDesktop ? 'row' : 'column', gap: isDesktop ? 0 : 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/logo.png" alt="boom.contact" style={{ height: 36, objectFit: 'contain' }} />
              {isDesktop && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>boom.contact</div>
                  <div style={{ fontSize: 10, opacity: 0.3, fontFamily: 'DM Mono, monospace' }}>PEP's Swiss SA · CHE-476.484.632</div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: isDesktop ? 20 : 12, flexWrap: 'wrap' as const, alignItems: 'center' }}>
              {[
                { label: 'Confidentialité', href: '/?privacy=true' },
                { label: 'CGU', href: '#cgu' },
                { label: 'RGPD · nLPD', href: '/?privacy=true' },
                { label: 'privacy@boom.contact', href: 'mailto:privacy@boom.contact' },
              ].map(({ label, href }) => (
                <a key={label} href={href} style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}
                  onMouseOver={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.55)'}
                  onMouseOut={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.25)'}>
                  {label}
                </a>
              ))}
            </div>
            <div style={{ fontSize: 10, opacity: 0.22, lineHeight: 1.8, textAlign: isDesktop ? 'right' : 'left' as const }}>
              {t('landing.footer.address').split('\n').map((line, i) => <span key={i}>{line}{i === 0 ? <br/> : ''}</span>)}
            </div>
          </div>
          <div style={{ marginTop: 16, fontSize: 10, opacity: 0.2, textAlign: 'center' }}>{t('landing.footer.copyright')}</div>
        </Section>
      </div>

      {showShare && <ShareBoom onClose={() => setShowShare(false)} context="landing" />}
    </div>
  );
}
