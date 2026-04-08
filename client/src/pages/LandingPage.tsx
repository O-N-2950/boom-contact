import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ShareBoom } from '../components/ShareBoom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeToggle } from '../components/ThemeToggle';
const CGUModal = React.lazy(() => import('../components/CGUModal').then(m => ({ default: m.CGUModal })));

// ── Reusable style constants (extracted from repeated inline styles) ──
const S = {
  boomColor: { color: 'var(--boom)' } as React.CSSProperties,
  sectionLabel: { fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 3, opacity: 0.7, textTransform: 'uppercase' as const, marginBottom: 10 } as React.CSSProperties,
  sectionLabelAlt: { fontSize: 9, opacity: 0.7, marginBottom: 4, letterSpacing: 1, fontFamily: 'DM Mono, monospace' } as React.CSSProperties,
  boldSmall: { fontSize: 12, fontWeight: 700 } as React.CSSProperties,
  displayBlock: { display: 'block' } as React.CSSProperties,
  centerMb32: { textAlign: 'center' as const, marginBottom: 32 } as React.CSSProperties,
  ghostBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, padding: '6px 12px' } as React.CSSProperties,
  boomCircle: { width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,53,0,0.1)', border: '1px solid rgba(255,53,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Oswald, sans-serif', fontSize: 13, color: 'var(--boom)' } as React.CSSProperties,
} as const;

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
    let timeout: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setW(window.innerWidth), 150);
    };
    window.addEventListener('resize', handler);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handler);
    };
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
      border: '1px solid rgba(255,255,255,0.25)',
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
    <div className="relative w-full mx-auto max-w-[280px]">
      <div style={{
        background: 'linear-gradient(160deg, rgba(255,53,0,0.15) 0%, rgba(0,0,0,0.6) 100%)',
        border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: 28, padding: '18px 14px', backdropFilter: 'blur(20px)',
        boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,53,0,0.1)',
      }}>
        <div className="rounded-[18px]" style={{ background: 'rgba(255,255,255,0.03)', padding: '14px 12px' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="rounded-lg flex items-center justify-center text-sm" style={{ width: 28, height: 28, background: 'var(--boom)' }} aria-hidden="true">💥</div>
            <div>
              <div className="text-[11px] font-bold">boom.contact</div>
              <div className="text-[9px]" style={{ opacity: 0.7, fontFamily: 'DM Mono, monospace' }}>SESSION ACTIVE</div>
            </div>
          </div>
          <div className="rounded-xl mb-2" style={{ background: 'rgba(255,53,0,0.08)', border: '1px solid rgba(255,53,0,0.2)', padding: '12px' }}>
            <div style={S.sectionLabelAlt}>CONDUCTEUR A</div>
            <div style={S.boldSmall}>VW Golf · GE 123 456</div>
            <div className="text-[10px]" style={{ opacity: 0.75 }}>Zurich Insurance · ✅ OCR</div>
          </div>
          <div className="rounded-xl mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.25)', padding: '12px' }}>
            <div style={S.sectionLabelAlt}>CONDUCTEUR B</div>
            <div style={S.boldSmall}>Audi A4 · BE 789 012</div>
            <div className="text-[10px]" style={{ opacity: 0.75 }}>AXA · ✅ Scanné</div>
          </div>
          <div className="rounded-[10px] text-center text-xs font-bold text-white" style={{ background: 'var(--boom)', padding: '10px' }}>
            ✍️ Signer le constat
          </div>
        </div>
      </div>
      <FloatingBadge icon="✅" text="PDF généré" className="text-[11px]" style={{ bottom: -14, left: -20 }} />
      <FloatingBadge icon="🌍" text="150+ pays" className="text-[11px]" style={{ top: 20, right: -24 }} />
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay = 0 }: { icon: string; title: string; desc: string; delay?: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <article ref={ref} style={{
      padding: '18px', borderRadius: 14,
      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
      transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
    }}>
      <div className="text-[26px] mb-2.5" aria-hidden="true">{icon}</div>
      <h3 className="text-sm font-bold" style={{ marginBottom: 5, margin: '0 0 5px 0' }}>{title}</h3>
      <p className="text-xs leading-relaxed m-0" style={{ opacity: 0.85 }}>{desc}</p>
    </article>
  );
}

// ─── Max width container for desktop sections ────────────────
function Section({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="mx-auto max-w-[1200px]">
      {children}
    </div>
  );
}

export function LandingPage({ onStart, onPricing, onGarage, onAccount, onLogout, authUser }: Props) {
  const [showShare, setShowShare] = useState(false);
  const [showCGU, setShowCGU] = useState(false);
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
    <div className="overflow-x-hidden">

      {/* ── HERO ──────────────────────────────────────────────── */}
      <div className="min-h-[100svh] flex flex-col relative overflow-hidden">
        <GridBG />
        <div className="absolute pointer-events-none" style={{ top: -100, left: '50%', transform: 'translateX(-50%)', width: isDesktop ? 900 : 600, height: 400, background: 'radial-gradient(ellipse, rgba(255,53,0,0.12) 0%, transparent 70%)' }} />

        {/* NAV */}
        <header>
        <nav className="flex items-center justify-between relative z-10 w-full" style={{ padding: isDesktop ? '20px 48px' : '20px 24px', maxWidth: isDesktop ? 1200 : 'none', margin: isDesktop ? '0 auto' : undefined, boxSizing: 'border-box' as const }}>
          <div className="flex items-center gap-3">
            <img src="/logo.webp" alt="boom.contact" className="object-contain" style={{ width: 64, height: 64 }} />
            {isDesktop && (
              <div className="text-[22px]" style={{ fontFamily: 'Oswald, sans-serif', letterSpacing: '-0.5px' }}>
                <span style={S.boomColor}>boom</span>
                <span style={{ opacity: 0.7 }}>.</span>
                <span>contact</span>
              </div>
            )}
          </div>
          <div className="flex items-center" style={{ gap: isDesktop ? 16 : 10 }}>
            {isDesktop && (
              <>
                <button onClick={onGarage} style={S.ghostBtn}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}>
                  🚗 Mon garage
                </button>
                <button onClick={() => { const el = document.getElementById('tarifs'); el?.scrollIntoView({ behavior: 'smooth' }); }} style={S.ghostBtn}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}>
                  Tarifs
                </button>
              </>
            )}
            <div className="text-[10px] rounded-[20px]" style={{ letterSpacing: 2, padding: '5px 12px', border: '1px solid rgba(255,179,0,0.3)', background: 'rgba(255,179,0,0.08)', color: '#FFB300', fontFamily: 'DM Mono, monospace' }}>
              RGPD · nLPD
            </div>
            <LanguageSwitcher compact />
            {isDesktop && (
              <button onClick={onStart} className="rounded-[10px] border-0 text-white cursor-pointer font-bold text-[13px] flex items-center gap-2" style={{ padding: '9px 20px', background: 'var(--boom)', boxShadow: '0 4px 16px rgba(255,53,0,0.4)' }}>
                💥 Démarrer
              </button>
            )}
          </div>
        </nav>
        </header>

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
            <div className="inline-flex items-center gap-2 rounded-full mb-5" style={{ padding: '6px 14px', background: 'rgba(255,53,0,0.1)', border: '1px solid rgba(255,53,0,0.2)', width: 'fit-content', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(10px)', transition: 'all 0.5s ease' }}>
              <span className="rounded-full" style={{ width: 6, height: 6, background: 'var(--boom)', display: 'inline-block', animation: 'pulse-red 2s infinite' }} />
              <span className="text-[10px] font-semibold" style={{ letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: 'DM Mono, monospace', color: 'var(--boom)' }}>{t('landing.badge')}</span>
            </div>

            {/* Title */}
            <h1 className="mb-5" style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 'clamp(56px,5vw,80px)' : 'clamp(48px,12vw,72px)', lineHeight: 0.95, letterSpacing: '-1px', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(20px)', transition: 'all 0.6s ease 0.1s' }}>
              <span style={S.displayBlock}>{t('landing.hero.line1')}</span>
              <span style={S.displayBlock}>{t('landing.hero.line2').split(' ')[0]}&nbsp;<span style={{ color: 'var(--boom)', textShadow: '0 0 40px rgba(255,53,0,0.5)' }}>{t('landing.hero.line2').split(' ').slice(1).join(' ')}</span></span>
              <span className="block" style={{ opacity: 0.7 }}>{t('landing.hero.line3')}</span>
              <span style={S.displayBlock}>{t('landing.hero.line4')}</span>
            </h1>

            {/* SEO subtitle — keywords "constat amiable numérique" */}
            <p className="leading-normal mb-1.5" style={{ fontSize: isDesktop ? 13 : 12, opacity: heroVisible ? 0.55 : 0, maxWidth: 440, transform: heroVisible ? 'none' : 'translateY(14px)', transition: 'all 0.6s ease 0.15s', fontFamily: 'DM Mono, monospace', letterSpacing: 0.5 }}>
              {t('landing.seoLine', { defaultValue: 'Le constat amiable numérique mondial · Digital accident report' })}
            </p>

            {/* Subtitle */}
            <p className="mb-7" style={{ fontSize: isDesktop ? 16 : 15, lineHeight: 1.65, opacity: heroVisible ? 0.6 : 0, maxWidth: 440, transform: heroVisible ? 'none' : 'translateY(16px)', transition: 'all 0.6s ease 0.2s' }}>
              {t('landing.subtitle')}
            </p>

            {/* CTAs */}
            <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(16px)', transition: 'all 0.6s ease 0.3s', marginBottom: isDesktop ? 0 : 44, maxWidth: isDesktop ? 440 : 'none' }}>

              {authUser && (
                <div className="w-full mb-2.5 rounded-xl flex items-center overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.04)' }}>
                  <button onClick={onAccount} className="flex-1 bg-transparent border-0 cursor-pointer flex items-center gap-2.5 text-[13px]" style={{ padding: '10px 14px', color: 'var(--text)' }}>
                    <span className="text-base">👤</span>
                    <span className="overflow-hidden whitespace-nowrap" style={{ opacity: 0.7, textOverflow: 'ellipsis', maxWidth: 160 }}>{authUser.email}</span>
                    <span className="ml-auto text-white rounded-[20px] text-[11px] font-bold shrink-0" style={{ background: 'var(--boom)', padding: '2px 10px' }}>
                      {authUser.credits === 999999 ? '∞' : authUser.credits} crédit{authUser.credits !== 1 ? 's' : ''}
                    </span>
                  </button>
                  <button onClick={onLogout} title="Se déconnecter" className="bg-transparent border-0 cursor-pointer text-base shrink-0" style={{ padding: '10px 14px', borderLeft: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.55)', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#FF3500')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
                    ↩
                  </button>
                </div>
              )}

              <button onClick={onStart} className="w-full text-base font-bold rounded-[14px] border-0 text-white cursor-pointer flex items-center justify-center gap-3" style={{ padding: '18px 24px', background: 'var(--boom)', boxShadow: '0 8px 32px rgba(255,53,0,0.45)', transition: 'transform 0.15s' }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>
                <span className="text-xl">💥</span>
                {t('landing.cta.start')}
                <span className="ml-auto text-xl" style={{ opacity: 0.7 }}>→</span>
              </button>

              <button onClick={onGarage} className="w-full mt-2.5 rounded-xl cursor-pointer flex items-center gap-3 text-sm font-semibold" style={{ padding: '14px 18px', border: '1.5px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.04)', color: 'rgba(240,237,232,0.8)', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,53,0,0.4)'; e.currentTarget.style.background = 'rgba(255,53,0,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}>
                <span className="text-xl">🚗</span>
                <div className="flex-1 text-left">
                  <div>Préparer mon garage</div>
                  <div className="text-[11px] font-normal" style={{ opacity: 0.7, marginTop: 1 }}>Enregistre tes véhicules à l'avance · 30 sec par scan</div>
                </div>
                <span className="text-base" style={{ opacity: 0.7 }}>›</span>
              </button>

              <div className="flex gap-2.5 mt-2.5">
                <p className="flex-1 text-center text-[11px]" style={{ opacity: 0.7, letterSpacing: 1, fontFamily: 'DM Mono, monospace' }}>{t('landing.cta.from')}</p>
                {onPricing && (
                  <button onClick={() => { const el = document.getElementById('tarifs'); el ? el.scrollIntoView({ behavior: 'smooth' }) : onPricing?.(); }} className="text-[11px] bg-transparent border-0 cursor-pointer underline whitespace-nowrap" style={{ opacity: 0.75, color: 'var(--text)' }}>
                    {t('landing.cta.pricing')}
                  </button>
                )}
              </div>

              {/* Badges desktop */}
              {isDesktop && (
                <div className="flex gap-2 mt-5" style={{ flexWrap: 'wrap' as const }}>
                  {[
                    { icon: '🔒', text: 'Chiffré SSL' },
                    { icon: '🌍', text: '50 langues' },
                    { icon: '⚡', text: '5 minutes' },
                    { icon: '📄', text: 'PDF certifié' },
                  ].map(b => (
                    <div key={b.text} className="flex items-center rounded-[20px] text-[11px]" style={{ gap: 5, padding: '5px 11px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.25)', opacity: 0.7 }}>
                      <span>{b.icon}</span><span>{b.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Phone mockup (desktop only inline, mobile below) */}
          <div className="flex items-center justify-center" style={{ flex: isDesktop ? '0 0 40%' : undefined, opacity: heroVisible ? 1 : 0, transition: 'opacity 0.8s ease 0.5s', paddingTop: isDesktop ? 0 : 0 }}>
            <PhoneMockup />
          </div>

        </div>
      </div>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <div style={{ padding: isDesktop ? '52px 48px' : '44px 24px', background: 'var(--dark)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <Section>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: isDesktop ? 40 : 8 }}>
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="leading-none mb-2" style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 'clamp(36px,4vw,52px)' : 'clamp(22px,6vw,30px)', color: 'var(--boom)' }}>
                  <Counter to={stat.val} suffix={stat.suffix} duration={2500} />
                </div>
                <div className="leading-snug" style={{ fontSize: isDesktop ? 13 : 10, opacity: 0.7, letterSpacing: 0.3 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <div style={{ padding: isDesktop ? '72px 48px' : '52px 24px' }}>
        <Section>
          <div className="text-center" style={{ marginBottom: isDesktop ? 52 : 36 }}>
            <div style={S.sectionLabel} id="how-works-label" role="doc-subtitle">{t('landing.how.label')}</div>
            <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 36 : 30, letterSpacing: '-0.5px' }}>{t('landing.how.title')} <span style={S.boomColor}>{t('landing.how.title_accent')}</span></h2>
          </div>

          {isDesktop ? (
            /* Desktop: horizontal steps */
            <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              {howSteps.map((item, i) => (
                <div key={i} className="relative text-center">
                  {i < howSteps.length - 1 && (
                    <div className="absolute" style={{ top: 19, left: '60%', width: '80%', height: 1, background: 'linear-gradient(to right, rgba(255,53,0,0.3), transparent)' }} />
                  )}
                  <div style={{ ...S.boomCircle, margin: '0 auto 14px' }}>
                    {item.step}
                  </div>
                  <div className="text-[22px] mb-2">{item.icon}</div>
                  <div className="text-[13px] font-bold mb-1.5">{item.title}</div>
                  <div className="text-[11px] leading-relaxed" style={{ opacity: 0.75 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          ) : (
            /* Mobile: vertical list */
            <div className="flex flex-col" style={{ gap: 0 }}>
              {howSteps.map((item, i) => (
                <div key={i} className="flex gap-4 relative" style={{ paddingBottom: i < howSteps.length - 1 ? 28 : 0 }}>
                  {i < howSteps.length - 1 && <div className="absolute" style={{ left: 19, top: 42, width: 1, height: 'calc(100% - 10px)', background: 'linear-gradient(to bottom, rgba(255,53,0,0.25), transparent)' }} />}
                  <div className="shrink-0">{item.step}</div>
                  <div style={{ paddingTop: 7 }}>
                    <div className="text-sm font-bold" style={{ marginBottom: 3 }}>{item.icon} {item.title}</div>
                    <div className="text-xs leading-relaxed" style={{ opacity: 0.75 }}>{item.desc}</div>
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
          <h2 className="text-center mb-8" style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 34 : 28 }} id="features">{t('landing.features.title')}</h2>
          <div className="grid" style={{ gridTemplateColumns: isDesktop ? '1fr 1fr 1fr' : '1fr 1fr', gap: isDesktop ? 16 : 10 }}>
            {features.map((f, i) => <FeatureCard key={i} {...f} delay={i * 80} />)}
          </div>
        </Section>
      </div>

      {/* ── COUNTRIES ─────────────────────────────────────────── */}
      <div style={{ padding: isDesktop ? '52px 48px' : '36px 24px', background: 'var(--dark)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <Section>
          <div className="text-center mb-5">
            <div className="text-[10px] mb-2" style={{ fontFamily: 'DM Mono, monospace', letterSpacing: 3, opacity: 0.7, textTransform: 'uppercase' as const }} role="doc-subtitle">{t('landing.coverage.label')}</div>
            <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 28 : 22 }}>{t('landing.coverage.title')}</h2>
          </div>
          <div className="flex gap-2.5 flex-wrap justify-center">
            {flags.map((f, i) => <span key={i} className="cursor-default" style={{ fontSize: isDesktop ? 28 : 22, opacity: 0.7, transition: 'all 0.2s' }} onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '1'; (e.target as HTMLElement).style.transform = 'scale(1.3)'; }} onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '0.7'; (e.target as HTMLElement).style.transform = ''; }}>{f}</span>)}
          </div>
          <p className="text-center text-[11px]" style={{ marginTop: 14, opacity: 0.7 }}>{t('landing.coverage.more')}</p>
        </Section>
      </div>

      {/* ── LEGAL ─────────────────────────────────────────────── */}
      <div style={{ padding: isDesktop ? '52px 48px' : '36px 24px' }}>
        <Section>
          <div className="rounded-[14px] flex gap-4" style={{ padding: isDesktop ? '28px 32px' : '22px', background: 'rgba(255,179,0,0.06)', border: '1px solid rgba(255,179,0,0.15)', alignItems: isDesktop ? 'center' : 'flex-start' }}>
            <span className="text-[32px] shrink-0">⚖️</span>
            <div>
              <h2 className="font-bold mb-1.5" style={{ fontSize: isDesktop ? 16 : 14 }}>{t('landing.legal.title')}</h2>
              <div className="text-[13px]" style={{ opacity: 0.75, lineHeight: 1.65 }}>{t('landing.legal.text')}</div>
            </div>
          </div>
        </Section>
      </div>
      {/* ── TARIFS ────────────────────────────────────────────── */}
      <div id="tarifs" style={{ padding: isDesktop ? '72px 48px' : '52px 20px', background: 'var(--dark)', borderTop: '1px solid var(--border)' }}>
        <Section>
          <div className="text-center" style={{ marginBottom: 36 }}>
            <div className="rounded-[20px] text-[11px] font-bold mb-3" style={{ display: 'inline-block', background: 'rgba(255,53,0,0.12)', border: '1px solid rgba(255,53,0,0.3)', padding: '4px 14px', color: 'var(--boom)', letterSpacing: 1 }} role="doc-subtitle">TARIFS</div>
            <h2 className="font-bold mb-2" style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 36 : 26 }}>Simple, transparent, mondial</h2>
            <p className="text-[13px] leading-relaxed" style={{ opacity: 0.75 }}>1 crédit = 1 constat complet · Valable dans 150+ pays · Sans abonnement</p>
          </div>

          <div className="grid mx-auto" style={{ gridTemplateColumns: isDesktop ? '1fr 1fr 1fr' : '1fr', gap: isDesktop ? 16 : 12, maxWidth: isDesktop ? 'none' : 480 }}>
            {[
              { id: 'single', icon: '📄', label: '1 constat',  price: '4.90', currency: 'CHF / EUR', desc: 'Pour un accident ponctuel', badge: null, savings: null },
              { id: 'pack3',  icon: '👨‍👩‍👧', label: '3 constats', price: '12.90', currency: 'CHF / EUR', desc: 'Pour toute la famille',    badge: '⭐ Populaire', savings: '-12%' },
              { id: 'pack10', icon: '🚗', label: '10 constats', price: '34.90', currency: 'CHF / EUR', desc: 'Pour flottes et courtiers', badge: null, savings: '-29%' },
            ].map((pkg) => (
              <button key={pkg.id} onClick={onPricing} aria-label={`Acheter ${pkg.label}`} className="rounded-2xl cursor-pointer flex border-0" style={{ background: pkg.badge ? 'rgba(255,53,0,0.06)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${pkg.badge ? 'rgba(255,53,0,0.35)' : 'var(--border)'}`, padding: isDesktop ? '24px 20px' : '18px 20px', flexDirection: isDesktop ? 'column' : 'row', alignItems: isDesktop ? 'flex-start' : 'center', gap: isDesktop ? 10 : 16, transition: 'all 0.15s', position: 'relative' as const }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                {pkg.badge && (
                  <div className="text-white rounded-[20px] text-[10px] font-bold" style={{ position: 'absolute' as const, top: -10, left: 20, background: 'var(--boom)', padding: '2px 12px' }}>{pkg.badge}</div>
                )}
                <span className="shrink-0" style={{ fontSize: isDesktop ? 36 : 28 }}>{pkg.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2" style={{ marginBottom: 2 }}>
                    <span className="font-bold" style={{ fontSize: isDesktop ? 16 : 15 }}>{pkg.label}</span>
                    {pkg.savings && <span className="text-green-500 rounded-[20px] text-[11px] font-bold" style={{ background: 'rgba(34,197,94,0.15)', padding: '1px 8px' }}>{pkg.savings}</span>}
                  </div>
                  <div className="text-xs" style={{ opacity: 0.7 }}>{pkg.desc}</div>
                </div>
                <div className="shrink-0" style={{ textAlign: isDesktop ? 'left' : 'right' as const, marginTop: isDesktop ? 8 : 0 }}>
                  <div className="font-bold leading-none" style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 28 : 22, color: pkg.badge ? 'var(--boom)' : 'var(--text)' }}>{pkg.price}</div>
                  <div className="text-[10px]" style={{ opacity: 0.7, marginTop: 2 }}>{pkg.currency}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-2 justify-center mt-6" style={{ flexWrap: 'wrap' as const }}>
            {['✅ Sans abonnement', '✅ Crédits sans expiration', '✅ PDF certifié', '✅ 150+ pays'].map(g => (
              <span key={g} className="text-[11px] rounded-[20px]" style={{ opacity: 0.75, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', padding: '4px 10px' }}>{g}</span>
            ))}
          </div>
          <div className="text-center mt-6">
            <button onClick={onPricing} className="rounded-xl border-0 text-white cursor-pointer text-[15px] font-bold inline-flex items-center gap-2.5" style={{ padding: '15px 40px', background: 'var(--boom)', boxShadow: '0 6px 24px rgba(255,53,0,0.4)' }}>
              Acheter des crédits →
            </button>
          </div>
        </Section>
      </div>

      {/* ── SOCIAL PROOF / TRUST ─────────────────────────────── */}
      <div style={{ padding: isDesktop ? '60px 48px' : '40px 24px' }}>
        <Section>
          <div className="text-center mb-8">
            <div style={S.sectionLabel}>ILS NOUS FONT CONFIANCE</div>
            <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 34 : 26 }}>Utilisé dans <span style={S.boomColor}>150+ pays</span></h2>
          </div>

          {/* Testimonials */}
          <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: isDesktop ? '1fr 1fr 1fr' : '1fr' }}>
            {[
              { name: 'Sarah M.', loc: '🇨🇭 Zurich', text: "Accident à l'étranger, l'autre conducteur parlait italien. On a chacun rempli dans notre langue. PDF reçu en 4 minutes. Mon assureur a accepté immédiatement.", stars: 5 },
              { name: 'Thomas K.', loc: '🇩🇪 München', text: "Nie wieder Papierkram nach einem Unfall. QR-Code gescannt, Dokumente fotografiert, fertig. Der digitale Unfallbericht funktioniert einwandfrei.", stars: 5 },
              { name: 'Emma L.', loc: '🇬🇧 London', text: "Had a fender bender in France. No French, no paper form. boom.contact saved us — everything in English, signed digitally, PDF in my inbox.", stars: 5 },
            ].map((t, i) => (
              <div key={i} className="rounded-[14px]" style={{ padding: isDesktop ? '20px' : '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                <div className="flex gap-1 mb-2.5">
                  {Array.from({ length: t.stars }).map((_, j) => <span key={j} className="text-sm text-[#FFB300]">★</span>)}
                </div>
                <p className="text-[13px] mb-3" style={{ lineHeight: 1.65, opacity: 0.7, fontStyle: 'italic' }}>"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="rounded-full flex items-center justify-center text-sm font-bold" style={{ width: 32, height: 32, background: 'rgba(255,53,0,0.15)', color: 'var(--boom)' }}>{t.name[0]}</div>
                  <div>
                    <div style={S.boldSmall}>{t.name}</div>
                    <div className="text-[10px]" style={{ opacity: 0.7 }}>{t.loc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="flex justify-center" style={{ gap: isDesktop ? 20 : 10, flexWrap: 'wrap' as const }}>
            {[
              { icon: '🇨🇭', text: 'Made in Switzerland' },
              { icon: '🔒', text: 'Chiffrement SSL 256-bit' },
              { icon: '🏛️', text: 'Conforme RGPD · nLPD' },
              { icon: '✅', text: 'PDF conforme CEA' },
              { icon: '💳', text: 'Paiement Stripe sécurisé' },
              { icon: '🗑️', text: 'Données supprimées sous 30j' },
            ].map(b => (
              <div key={b.text} className="flex items-center gap-2 rounded-[10px] text-[11px]" style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', opacity: 0.7 }}>
                <span className="text-base">{b.icon}</span>
                <span className="font-semibold">{b.text}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── FAQ — SEO "constat amiable numérique" ─────────────── */}
      <div style={{ padding: isDesktop ? '60px 48px' : '40px 24px', background: 'var(--dark)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <Section>
          <div className="text-center mb-8">
            <div style={S.sectionLabel}>FAQ</div>
            <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 34 : 26 }}>Questions fréquentes sur le <span style={S.boomColor}>constat amiable numérique</span></h2>
          </div>

          <div className="mx-auto flex flex-col gap-3 max-w-[720px]">
            {[
              { q: "Qu'est-ce qu'un constat amiable numérique ?", a: "Un constat amiable numérique remplace le formulaire papier traditionnel. Avec boom.contact, vous remplissez votre constat d'accident directement depuis votre téléphone en 5 minutes. L'OCR scanne vos documents automatiquement, les deux conducteurs signent digitalement, et un PDF certifié conforme au standard européen (CEA) est généré instantanément." },
              { q: "Le constat amiable numérique est-il accepté par les assureurs ?", a: "Oui. Le PDF généré par boom.contact est conforme au formulaire européen standardisé CEA (Constat Européen d'Accident). Il est accepté par les assureurs dans plus de 150 pays. Les signatures digitales sont horodatées et géolocalisées, ce qui leur confère une valeur probante supérieure au papier." },
              { q: "Combien coûte le constat amiable numérique boom.contact ?", a: "À partir de CHF 4.90 / EUR 4.90 pour un constat unique. Pack famille de 3 constats à CHF 12.90 (-12%), ou pack flotte de 10 constats à CHF 34.90 (-29%). Sans abonnement, sans expiration. Disponible en CHF, EUR, GBP, USD, AUD, CAD, SGD et JPY." },
              { q: "Dois-je installer une application ?", a: "Non. boom.contact fonctionne directement dans le navigateur de votre téléphone (Safari, Chrome, Firefox…). Aucun téléchargement requis. Vous pouvez également ajouter boom.contact à votre écran d'accueil comme une Progressive Web App (PWA) pour un accès hors-ligne." },
              { q: "Le constat numérique fonctionne-t-il si l'autre conducteur parle une autre langue ?", a: "C'est justement la force de boom.contact. Chaque conducteur utilise l'interface dans sa propre langue parmi les 50 langues disponibles. L'OCR reconnaît les documents de circulation de tous les pays. Le PDF final est généré dans la langue de chaque conducteur." },
              { q: "Que se passe-t-il si l'autre conducteur n'a pas boom.contact ?", a: "Aucun problème. Vous créez la session et un QR code s'affiche. L'autre conducteur scanne le QR avec son téléphone — boom.contact s'ouvre directement dans son navigateur. Pas d'inscription, pas de téléchargement. C'est prêt en 3 secondes." },
              { q: "Mes données sont-elles protégées ?", a: "boom.contact est développé en Suisse et conforme au RGPD européen et à la nLPD suisse. Les données sont chiffrées en transit (SSL 256-bit), les sessions sont automatiquement supprimées après 30 jours, et la police n'est jamais notifiée automatiquement." },
            ].map((faq, i) => (
              <details key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <summary className="cursor-pointer text-sm font-bold flex items-center gap-3" style={{ padding: '16px 18px', listStyle: 'none' }}>
                  <span className="text-base shrink-0" style={{ color: 'var(--boom)' }}>+</span>
                  {faq.q}
                </summary>
                <div className="text-[13px]" style={{ padding: '0 18px 16px 46px', lineHeight: 1.7, opacity: 0.755 }}>
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </Section>
      </div>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <div className="text-center relative overflow-hidden" style={{ padding: isDesktop ? '80px 48px' : '44px 24px 60px' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,53,0,0.08) 0%, transparent 70%)' }} />
        <div className="relative" style={{ zIndex: 1 }}>
          <img src="/logo.webp" alt="boom.contact" loading="lazy" className="object-contain" style={{ width: 120, height: 120, marginBottom: 14, display: 'inline-block', animation: 'float 4s ease-in-out infinite' }} />
          <h2 className="mb-2.5" style={{ fontFamily: 'Oswald, sans-serif', fontSize: isDesktop ? 40 : 28 }}>{t('landing.finalCta.title')}</h2>
          <p className="text-sm mb-7" style={{ opacity: 0.75, lineHeight: 1.65, maxWidth: 400, margin: '0 auto 28px' }}>{t('landing.finalCta.subtitle')}</p>
          <button onClick={onStart} className="text-base font-bold rounded-[14px] border-0 text-white cursor-pointer inline-flex items-center gap-2.5" style={{ padding: '18px 44px', background: 'var(--boom)', boxShadow: '0 8px 32px rgba(255,53,0,0.5)' }}>
            {t('landing.finalCta.button')} <span className="text-lg">→</span>
          </button>
          <p className="mt-3 text-[10px]" style={{ opacity: 0.7, letterSpacing: 1, fontFamily: 'DM Mono, monospace' }}>{t('landing.cta.free')}</p>
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer style={{ padding: isDesktop ? '32px 48px' : '22px', borderTop: '1px solid var(--border)', background: 'var(--dark)' }}>
        <Section>
          <div className="flex justify-between" style={{ alignItems: isDesktop ? 'center' : 'flex-start', flexDirection: isDesktop ? 'row' : 'column', gap: isDesktop ? 0 : 16 }}>
            <div className="flex items-center gap-2.5">
              <img src="/logo.webp" alt="boom.contact" loading="lazy" className="object-contain" style={{ height: 36 }} />
              {isDesktop && (
                <div>
                  <div className="text-xs font-bold" style={{ opacity: 0.7 }}>boom.contact</div>
                  <div className="text-[10px]" style={{ opacity: 0.7, fontFamily: 'DM Mono, monospace' }}>PEP's Swiss SA · CHE-476.484.632</div>
                </div>
              )}
            </div>
            <div className="flex items-center" style={{ gap: isDesktop ? 20 : 12, flexWrap: 'wrap' as const }}>
              {[
                { label: 'Confidentialité', href: '/?privacy=true' },
                { label: 'CGU', href: '#cgu', onClick: (e: React.MouseEvent) => { e.preventDefault(); setShowCGU(true); } },
                { label: 'RGPD · nLPD', href: '/?privacy=true' },
                { label: 'privacy@boom.contact', href: 'mailto:privacy@boom.contact' },
              ].map(({ label, href, onClick }) => (
                <a key={label} href={href} onClick={onClick} className="text-[11px] no-underline" style={{ color: 'rgba(255,255,255,0.7)' }}
                  onMouseOver={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.7)'}
                  onMouseOut={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.25)'}>
                  {label}
                </a>
              ))}
            </div>
            <div className="text-[10px]" style={{ opacity: 0.7, lineHeight: 1.8, textAlign: isDesktop ? 'right' : 'left' as const }}>
              {t('landing.footer.address').split('\n').map((line, i) => <span key={i}>{line}{i === 0 ? <br/> : ''}</span>)}
            </div>
          </div>
          <div className="mt-4 text-[10px] text-center" style={{ opacity: 0.7 }}>{t('landing.footer.copyright')}</div>
        </Section>
      </footer>

      {showShare && <ShareBoom onClose={() => setShowShare(false)} context="landing" />}
      {showCGU && <CGUModal onAccept={() => setShowCGU(false)} onClose={() => setShowCGU(false)} />}
    </div>
  );
}
