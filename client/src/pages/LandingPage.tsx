import { track } from '../analytics';
import { EVENTS } from '../analytics-events';
import React, { useEffect, useRef, useState } from 'react';
import { ShareBoom } from '../components/ShareBoom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { UserMenu } from '../components/UserMenu';
const CGUModal = React.lazy(() => import('../components/CGUModal').then(m => ({ default: m.CGUModal })));

/* ── Hybrid Marketing Landing — palette officielle ────────────────────────── */
const C = {
  bg: '#F5F8FC',
  card: '#FFFFFF',
  elevated: '#EEF4FA',
  text: '#102033',
  textSec: '#5D6B7C',
  orange: '#FF6B1A',
  orangeHover: '#F05A0A',
  navy: '#123A5A',
  cyan: '#18B8E8',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  border: '#DDE7F0',
  shadow: '0 8px 24px rgba(16, 32, 51, 0.06)',
  shadowLg: '0 24px 60px rgba(16, 32, 51, 0.14)',
  font: "Manrope, ui-sans-serif, system-ui, -apple-system, sans-serif",
} as const;

function useWindowWidth() {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(timeout); timeout = setTimeout(() => setW(window.innerWidth), 150); };
    window.addEventListener('resize', onResize);
    return () => { clearTimeout(timeout); window.removeEventListener('resize', onResize); };
  }, []);
  return w;
}

function Section({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ maxWidth: 1180, margin: '0 auto', ...style }}>{children}</div>;
}

function Reveal({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(18px)', transition: `opacity .55s ease ${delay}ms, transform .55s ease ${delay}ms`, ...style }}>
      {children}
    </div>
  );
}

/* Light product mockup (Hybrid Trust Premium) */
function ProductMockup() {
  const { t } = useTranslation();
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 300, margin: '0 auto' }}>
      <div style={{ borderRadius: 26, padding: 14, background: C.card, border: `1px solid ${C.border}`, boxShadow: C.shadowLg }}>
        <div style={{ borderRadius: 18, padding: 16, background: C.elevated }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }} aria-hidden="true">💥</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>boom.contact</div>
              <div style={{ fontSize: 9, color: C.success, fontWeight: 700 }}>● {t('landing.mockup.sessionActive', { defaultValue: 'Session active' })}</div>
            </div>
          </div>
          <div style={{ borderRadius: 12, marginBottom: 8, padding: 12, background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.orange}` }}>
            <div style={{ fontSize: 9, color: C.textSec, fontWeight: 700, letterSpacing: 1 }}>{t('landing.mockup.vehicleA', { defaultValue: 'VÉHICULE A' })}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>VW Golf · GE 123 456</div>
            <div style={{ fontSize: 10, color: C.textSec }}>{t('landing.mockup.photosSig', { defaultValue: 'Photos · signature ✓' })}</div>
          </div>
          <div style={{ borderRadius: 12, marginBottom: 12, padding: 12, background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.navy}` }}>
            <div style={{ fontSize: 9, color: C.textSec, fontWeight: 700, letterSpacing: 1 }}>{t('landing.mockup.vehicleB', { defaultValue: 'VÉHICULE B' })}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Audi A4 · BE 789 012</div>
            <div style={{ fontSize: 10, color: C.textSec }}>{t('landing.mockup.qrJoined', { defaultValue: 'QR rejoint · en cours' })}</div>
          </div>
          <div style={{ borderRadius: 10, textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#fff', padding: 11, background: C.navy }}>
            {t('landing.mockup.payGenerate', { defaultValue: 'Payer et générer le PDF' })}
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: -14, left: -16, background: C.card, border: `1px solid ${C.border}`, boxShadow: C.shadow, borderRadius: 100, fontSize: 11, fontWeight: 700, color: C.text, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>📄</span> {t('landing.mockup.pdfBadge', { defaultValue: 'PDF horodaté' })}
      </div>
      <div style={{ position: 'absolute', top: 14, right: -18, background: C.card, border: `1px solid ${C.border}`, boxShadow: C.shadow, borderRadius: 100, fontSize: 11, fontWeight: 700, color: C.text, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>📱</span> {t('landing.mockup.qrBadge', { defaultValue: 'QR partagé' })}
      </div>
    </div>
  );
}

interface Props {
  onStart: () => void;
  onPricing?: () => void;
  onGarage?: () => void;
  onAccount?: () => void;
  onLogout?: () => void;
  onLogin?: () => void;
  authUser?: { email: string; credits: number } | null;
}

export function LandingPage({ onStart, onPricing, onGarage, onAccount, onLogout, onLogin, authUser }: Props) {
  const [showShare, setShowShare] = useState(false);
  const [showCGU, setShowCGU] = useState(false);
  const { t } = useTranslation();
  const w = useWindowWidth();
  const isDesktop = w >= 900;
  const [heroVisible, setHeroVisible] = useState(false);
  const trackedStart = () => { track(EVENTS.CTA_START_CONSTAT_CLICKED); onStart(); };
  const trackedGarage = () => { track(EVENTS.CTA_PREPARE_GARAGE_CLICKED); onGarage?.(); };
  useEffect(() => { requestAnimationFrame(() => setHeroVisible(true)); track(EVENTS.LANDING_VIEWED); }, []);

  const howSteps = t('landing.how.steps', { returnObjects: true }) as { step: string; icon: string; title: string; desc: string }[];
  const scrollTo = (id: string) => { const el = document.getElementById(id); el?.scrollIntoView({ behavior: 'smooth' }); };

  const padX = isDesktop ? 48 : 22;

  /* primary orange CTA */
  const ctaOrange: React.CSSProperties = {
    background: C.orange, color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer',
    fontWeight: 800, fontSize: 16, fontFamily: C.font, padding: '16px 26px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    boxShadow: '0 8px 22px rgba(255,107,26,0.28)', transition: 'background .15s, transform .15s',
  };
  /* trust navy action */
  const ctaNavyOutline: React.CSSProperties = {
    background: 'transparent', color: C.navy, border: `1.5px solid ${C.navy}`, borderRadius: 14, cursor: 'pointer',
    fontWeight: 700, fontSize: 15, fontFamily: C.font, padding: '15px 24px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .15s',
  };
  const sectionLabel: React.CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: C.cyan, marginBottom: 10 };
  const h2: React.CSSProperties = { fontFamily: C.font, fontWeight: 800, color: C.text, fontSize: isDesktop ? 34 : 26, lineHeight: 1.15, margin: 0 };
  const cardBase: React.CSSProperties = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: C.shadow };

  const featureIcons = ['📱', '📸', '📄', '📨'];
  const featureItems = (t('landing.features', { returnObjects: true }) as { title: string; desc: string }[])
    .map((f, i) => ({ icon: featureIcons[i] ?? '•', ...f }));

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: C.font, minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <header>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box', padding: `16px ${padX}px`, maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <img src="/logo.webp" alt="boom.contact" style={{ width: isDesktop ? 50 : 48, height: isDesktop ? 50 : 48, objectFit: 'contain', display: 'block' }} />
            {isDesktop && (
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', color: C.text }}>
                <span style={{ color: C.orange }}>boom</span><span style={{ color: C.textSec }}>.contact</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isDesktop ? 12 : 6, minWidth: 0 }}>
            {isDesktop && <span style={{ fontSize: 11, fontWeight: 700, color: C.navy, border: `1px solid ${C.border}`, background: C.card, borderRadius: 20, padding: '5px 12px' }}>RGPD · nLPD</span>}
            <LanguageSwitcher compact={!isDesktop} />
            {authUser ? (
              <UserMenu
                authUser={authUser}
                onAccount={() => onAccount?.()}
                onGarage={() => onGarage?.()}
                onBuyCredits={() => onPricing?.()}
                onLogout={() => onLogout?.()}
                compact={!isDesktop}
              />
            ) : (
              <button onClick={() => { track(EVENTS.CTA_LOGIN_CLICKED); (onLogin ? onLogin() : onAccount?.()); }}
                style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.navy, fontWeight: 700, fontSize: 13, borderRadius: 11, padding: isDesktop ? '9px 16px' : '8px 12px', cursor: 'pointer', fontFamily: C.font }}>
                {t('account.login', { defaultValue: 'Me connecter' })}
              </button>
            )}
            {isDesktop && (
              <button onClick={trackedStart} style={{ ...ctaOrange, fontSize: 14, padding: '10px 20px', borderRadius: 11 }}>
                {t('landing.cta.start', { defaultValue: 'Commencer un constat' })}
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* ── HERO (Boom Dark Signature adouci) ───────────────── */}
      <div style={{ padding: `0 ${isDesktop ? 24 : 14}px`, marginBottom: isDesktop ? 64 : 40 }}>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: isDesktop ? 28 : 22, background: 'linear-gradient(155deg, #102033 0%, #123A5A 100%)', maxWidth: 1180, margin: '0 auto', boxShadow: C.shadowLg }}>
          {/* subtle grid */}
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(ellipse 75% 70% at 70% 20%, black 30%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 75% 70% at 70% 20%, black 30%, transparent 100%)' }} />
          <div aria-hidden="true" style={{ position: 'absolute', top: -120, right: -80, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(24,184,232,0.18) 0%, transparent 70%)' }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: isDesktop ? 'row' : 'column', alignItems: 'center', gap: isDesktop ? 48 : 28, padding: isDesktop ? '64px 56px' : '36px 24px 40px' }}>
            {/* Left */}
            <div style={{ flex: isDesktop ? '0 0 56%' : undefined, width: '100%' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 100, padding: '6px 14px', marginBottom: 18, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', opacity: heroVisible ? 1 : 0, transition: 'opacity .5s ease' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan, display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#DCEAF5' }}>{t('landing.badge', { defaultValue: 'Constat amiable numérique' })}</span>
              </div>

              <h1 style={{ fontFamily: C.font, fontWeight: 800, color: '#fff', fontSize: isDesktop ? 'clamp(36px,4vw,52px)' : 'clamp(30px,8vw,40px)', lineHeight: 1.08, letterSpacing: '-0.5px', margin: '0 0 18px', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(16px)', transition: 'all .6s ease .1s' }}>
                {t('landing.hero.title', { defaultValue: 'Documentez un accident sans papier, sans confusion.' })}
              </h1>

              <p style={{ fontSize: isDesktop ? 17 : 15, lineHeight: 1.6, color: '#B9CBDB', maxWidth: 540, margin: '0 0 28px', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(16px)', transition: 'all .6s ease .2s' }}>
                {t('landing.hero.subtitle', { defaultValue: 'boom.contact vous guide étape par étape pour collecter les informations utiles, ajouter photos, localisation, déclarations et signatures, puis générer un dossier PDF horodaté à transmettre à votre assureur.' })}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(16px)', transition: 'all .6s ease .3s' }}>
                <button onClick={trackedStart} style={ctaOrange}
                  onMouseEnter={e => (e.currentTarget.style.background = C.orangeHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = C.orange)}>
                  {t('landing.cta.start', { defaultValue: 'Commencer un constat' })} <span style={{ fontSize: 18 }}>→</span>
                </button>
                <button onClick={() => scrollTo('how')} style={{ ...ctaNavyOutline, color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  Voir comment ça marche
                </button>
              </div>

              {onGarage && (
                <button onClick={trackedGarage} style={{ marginTop: 14, background: 'transparent', border: 'none', cursor: 'pointer', color: '#9FB4C7', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8, padding: 0 }}>
                  🚗 Préparer mon garage — enregistrez vos véhicules à l'avance ›
                </button>
              )}

              <p style={{ fontSize: 11, color: '#7F95A8', marginTop: 16, letterSpacing: 0.5 }}>
                {t('landing.cta.from', { defaultValue: 'À partir de CHF / EUR 4.90' })}
              </p>
            </div>

            {/* Right — light mockup */}
            <div style={{ flex: isDesktop ? '0 0 40%' : undefined, width: '100%', display: 'flex', justifyContent: 'center', opacity: heroVisible ? 1 : 0, transition: 'opacity .8s ease .4s' }}>
              <ProductMockup />
            </div>
          </div>
        </div>
      </div>

      {/* ── COMMENT ÇA MARCHE ───────────────────────────────── */}
      <div id="how" style={{ padding: `${isDesktop ? 24 : 8}px ${padX}px ${isDesktop ? 64 : 44}px` }}>
        <Section>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: isDesktop ? 44 : 30 }}>
              <div style={sectionLabel}>{t('landing.how.label', { defaultValue: 'Comment ça marche' })}</div>
              <h2 style={h2}>{t('landing.how.title', { defaultValue: 'Guidé étape par étape' })} <span style={{ color: C.orange }}>{t('landing.how.title_accent', { defaultValue: '' })}</span></h2>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(5, 1fr)' : '1fr', gap: isDesktop ? 16 : 12 }}>
            {howSteps.map((item, i) => (
              <Reveal key={i} delay={i * 70}>
                <div style={{ ...cardBase, padding: 18, height: '100%', display: 'flex', flexDirection: isDesktop ? 'column' : 'row', gap: 12, alignItems: isDesktop ? 'flex-start' : 'center' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: C.elevated, color: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{item.step}</div>
                  <div>
                    <div style={{ fontSize: 20, marginBottom: 4 }} aria-hidden="true">{item.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: C.textSec }}>{item.desc}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>
      </div>

      {/* ── FEATURES (QR · photos/voix/signature · PDF · assureur) ── */}
      <div style={{ padding: `${isDesktop ? 56 : 36}px ${padX}px`, background: C.card, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <Section>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: isDesktop ? 40 : 28 }}>
              <div style={sectionLabel}>{t('landing.flow.label', { defaultValue: 'Tout en un seul flux' })}</div>
              <h2 style={h2}>{t('landing.flow.title', { defaultValue: "De l'accident au dossier prêt à transmettre" })}</h2>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: isDesktop ? 18 : 12 }}>
            {featureItems.map((f, i) => (
              <Reveal key={i} delay={i * 70}>
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: isDesktop ? 24 : 18, height: '100%', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }} aria-hidden="true">{f.icon}</div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: '2px 0 6px' }}>{f.title}</h3>
                    <p style={{ fontSize: 14, lineHeight: 1.6, color: C.textSec, margin: 0 }}>{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>
      </div>

      {/* ── CONÇU POUR LES SITUATIONS STRESSANTES ───────────── */}
      <div style={{ padding: `${isDesktop ? 60 : 40}px ${padX}px` }}>
        <Section>
          <Reveal>
            <div style={{ ...cardBase, padding: isDesktop ? '36px 40px' : '24px 22px', display: 'flex', flexDirection: isDesktop ? 'row' : 'column', gap: 24, alignItems: isDesktop ? 'center' : 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={sectionLabel}>{t('landing.stress.label', { defaultValue: "Pensé pour le moment de l'accident" })}</div>
                <h2 style={{ ...h2, marginBottom: 12 }}>{t('landing.stress.title', { defaultValue: 'Conçu pour les situations stressantes' })}</h2>
                <p style={{ fontSize: 15, lineHeight: 1.65, color: C.textSec, margin: '0 0 14px' }}>
                  {t('landing.stress.text', { defaultValue: "Après un choc, on n'a pas l'esprit clair. boom.contact avance pas à pas, dans votre langue, et garde une trace de chaque information collectée. Tout fonctionne depuis le navigateur du téléphone, même avec une connexion limitée." })}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(t('landing.stress.bullets', { returnObjects: true }) as string[]).map(b => (
                    <span key={b} style={{ fontSize: 12, fontWeight: 600, color: C.navy, background: C.elevated, borderRadius: 20, padding: '6px 12px' }}>{b}</span>
                  ))}
                </div>
              </div>
              <div style={{ flexShrink: 0, background: 'rgba(245,158,11,0.08)', border: `1px solid rgba(245,158,11,0.25)`, borderRadius: 14, padding: 18, maxWidth: isDesktop ? 320 : '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <strong style={{ fontSize: 14, color: C.text }}>{t('landing.stress.emergencyTitle', { defaultValue: "En cas d'urgence" })}</strong>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: C.textSec, margin: 0 }}>
                  {t('landing.stress.emergencyText', { defaultValue: "boom.contact ne remplace pas les secours, la police, un avocat ou l'assureur. En cas de blessé ou de danger, contactez d'abord les services d'urgence." })}
                </p>
              </div>
            </div>
          </Reveal>
        </Section>
      </div>

      {/* ── TARIFS ──────────────────────────────────────────── */}
      <div id="tarifs" style={{ padding: `${isDesktop ? 56 : 40}px ${padX}px`, background: C.card, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <Section>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: isDesktop ? 36 : 26 }}>
              <div style={sectionLabel}>{t('landing.pricing.label', { defaultValue: 'Tarifs' })}</div>
              <h2 style={h2}>{t('landing.pricing.title', { defaultValue: 'Simple, transparent, sans abonnement' })}</h2>
              <p style={{ fontSize: 14, color: C.textSec, marginTop: 8 }}>{t('landing.pricing.caption', { defaultValue: '1 crédit = 1 constat complet · multilingue · crédits sans expiration' })}</p>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr 1fr' : '1fr', gap: isDesktop ? 16 : 12, maxWidth: isDesktop ? 'none' : 480, margin: '0 auto' }}>
            {(() => { const _pp = t('landing.pricing.plans', { returnObjects: true }) as { label: string; desc: string }[]; const _pop = t('landing.pricing.badgePopular', { defaultValue: 'Populaire' }); return [
              { id: 'single', icon: '📄', label: _pp[0]?.label, price: '4.90', desc: _pp[0]?.desc, badge: null as string | null, savings: null as string | null },
              { id: 'pack3', icon: '👨‍👩‍👧', label: _pp[1]?.label, price: '12.90', desc: _pp[1]?.desc, badge: `⭐ ${_pop}`, savings: '−12%' },
              { id: 'pack10', icon: '🚗', label: _pp[2]?.label, price: '34.90', desc: _pp[2]?.desc, badge: null, savings: '−29%' },
            ]; })().map(pkg => (
              <button key={pkg.id} onClick={onPricing} aria-label={`Voir le pack ${pkg.label}`} style={{ position: 'relative', textAlign: 'left', cursor: 'pointer', borderRadius: 16, padding: isDesktop ? '24px 20px' : '18px 20px', background: pkg.badge ? '#FFF7F2' : C.bg, border: `1.5px solid ${pkg.badge ? 'rgba(255,107,26,0.4)' : C.border}`, display: 'flex', flexDirection: isDesktop ? 'column' : 'row', alignItems: isDesktop ? 'flex-start' : 'center', gap: isDesktop ? 10 : 16, transition: 'transform .15s, box-shadow .15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = C.shadow; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'none'; }}>
                {pkg.badge && <div style={{ position: 'absolute', top: -10, left: 18, background: C.orange, color: '#fff', borderRadius: 20, fontSize: 10, fontWeight: 700, padding: '2px 10px' }}>{pkg.badge}</div>}
                <span style={{ fontSize: isDesktop ? 32 : 26, flexShrink: 0 }} aria-hidden="true">{pkg.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{pkg.label}</span>
                    {pkg.savings && <span style={{ fontSize: 11, fontWeight: 700, color: C.success, background: 'rgba(22,163,74,0.12)', borderRadius: 20, padding: '1px 8px' }}>{pkg.savings}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>{pkg.desc}</div>
                </div>
                <div style={{ flexShrink: 0, textAlign: isDesktop ? 'left' : 'right', marginTop: isDesktop ? 6 : 0 }}>
                  <div style={{ fontSize: isDesktop ? 26 : 22, fontWeight: 800, color: pkg.badge ? C.orange : C.text, lineHeight: 1 }}>{pkg.price}</div>
                  <div style={{ fontSize: 10, color: C.textSec, marginTop: 2 }}>CHF / EUR</div>
                </div>
              </button>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 26 }}>
            <button onClick={onPricing} style={ctaOrange}
              onMouseEnter={e => (e.currentTarget.style.background = C.orangeHover)}
              onMouseLeave={e => (e.currentTarget.style.background = C.orange)}>
              {t('landing.cta.pricing', { defaultValue: 'Voir les tarifs' })} →
            </button>
          </div>
        </Section>
      </div>

      {/* ── B2B (Swiss Calm) ────────────────────────────────── */}
      <div style={{ padding: `${isDesktop ? 64 : 44}px ${padX}px` }}>
        <Section>
          <Reveal>
            <div style={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 20, padding: isDesktop ? '44px 48px' : '28px 24px' }}>
              <div style={{ display: 'flex', flexDirection: isDesktop ? 'row' : 'column', gap: 28, alignItems: isDesktop ? 'center' : 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ ...sectionLabel, color: C.navy }}>{t('landing.b2b.label', { defaultValue: 'Pour les professionnels' })}</div>
                  <h2 style={{ ...h2, marginBottom: 12 }}>{t('landing.b2b.title', { defaultValue: 'Pour courtiers, flottes et partenaires assurance' })}</h2>
                  <p style={{ fontSize: 15, lineHeight: 1.65, color: C.textSec, margin: '0 0 18px', maxWidth: 620 }}>
                    {t('landing.b2b.text', { defaultValue: "Équipez vos clients et vos conducteurs d'un outil clair pour documenter un accident et générer un dossier PDF horodaté. Packs de crédits pour les flottes et les courtiers, déploiement simple, sans abonnement." })}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 10, maxWidth: 620 }}>
                    {(() => { const _bi = t('landing.b2b.items', { returnObjects: true }) as { title: string; desc: string }[]; const _ic = ['🚗', '🤝', '🔒', '📨']; return _bi.map((it, i) => [_ic[i], it.title, it.desc] as const); })().map(([ic, ti, de]) => (
                      <div key={ti} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                        <span style={{ fontSize: 18 }} aria-hidden="true">{ic}</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{ti}</div>
                          <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.5 }}>{de}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <button onClick={() => { track(EVENTS.FLEET_CTA_CLICKED); setShowShare(true); }} style={ctaNavyOutline}
                    onMouseEnter={e => (e.currentTarget.style.background = C.card)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    {t('landing.b2b.cta', { defaultValue: 'Contacter / partager' })}
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </Section>
      </div>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <div style={{ padding: `${isDesktop ? 56 : 40}px ${padX}px`, background: C.card, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <Section style={{ maxWidth: 760 }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: isDesktop ? 32 : 24 }}>
              <div style={sectionLabel}>{t('landing.faq.label', { defaultValue: 'FAQ' })}</div>
              <h2 style={h2}>{t('landing.faq.title', { defaultValue: 'Questions fréquentes' })}</h2>
            </div>
          </Reveal>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(t('landing.faq.items', { returnObjects: true }) as { q: string; a: string }[])
.map((faq, i) => (              <details key={i} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, background: C.bg }}>
                <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 12, listStyle: 'none', padding: '15px 18px' }}>
                  <span style={{ color: C.orange, fontSize: 18, flexShrink: 0 }}>+</span>{faq.q}
                </summary>
                <div style={{ fontSize: 13, lineHeight: 1.65, color: C.textSec, padding: '0 18px 16px 46px' }}>{faq.a}</div>
              </details>
            ))}
          </div>
        </Section>
      </div>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: `${isDesktop ? 64 : 44}px ${padX}px` }}>
        <Reveal>
          <img src="/logo.webp" alt="boom.contact" loading="lazy" style={{ width: 88, height: 88, objectFit: 'contain', marginBottom: 14 }} />
          <h2 style={{ ...h2, fontSize: isDesktop ? 32 : 24, marginBottom: 10 }}>{t('landing.finalCta.title', { defaultValue: 'Prêt à documenter votre accident ?' })}</h2>
          <p style={{ fontSize: 14, color: C.textSec, maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.6 }}>{t('landing.finalCta.subtitle', { defaultValue: 'Commencez en quelques secondes, sans inscription.' })}</p>
          <button onClick={trackedStart} style={ctaOrange}
            onMouseEnter={e => (e.currentTarget.style.background = C.orangeHover)}
            onMouseLeave={e => (e.currentTarget.style.background = C.orange)}>
            {t('landing.finalCta.button', { defaultValue: 'Commencer un constat' })} <span style={{ fontSize: 18 }}>→</span>
          </button>
          <p style={{ fontSize: 11, color: C.textSec, marginTop: 12, letterSpacing: 0.5 }}>{t('landing.cta.free', { defaultValue: 'Gratuit · sans inscription · RGPD' })}</p>
        </Reveal>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ padding: `${isDesktop ? 32 : 24}px ${padX}px`, borderTop: `1px solid ${C.border}`, background: C.elevated }}>
        <Section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start', flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/logo.webp" alt="boom.contact" loading="lazy" style={{ height: 34, objectFit: 'contain' }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>boom.contact</div>
                <div style={{ fontSize: 10, color: C.textSec }}>PEP's Swiss SA · CHE-476.484.632</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: isDesktop ? 20 : 14, flexWrap: 'wrap' }}>
              {[
                { label: 'Confidentialité', href: '/?privacy=true', onClick: undefined as undefined | ((e: React.MouseEvent) => void) },
                { label: 'CGU', href: '#cgu', onClick: (e: React.MouseEvent) => { e.preventDefault(); setShowCGU(true); } },
                { label: 'Support', href: 'mailto:contact@boom.contact', onClick: undefined },
                { label: 'privacy@boom.contact', href: 'mailto:privacy@boom.contact', onClick: undefined },
              ].map(({ label, href, onClick }) => (
                <a key={label} href={href} onClick={onClick} style={{ fontSize: 12, color: C.textSec, textDecoration: 'none' }}
                  onMouseOver={e => ((e.target as HTMLElement).style.color = C.navy)}
                  onMouseOut={e => ((e.target as HTMLElement).style.color = C.textSec)}>{label}</a>
              ))}
            </div>
            <div style={{ fontSize: 10, color: C.textSec, lineHeight: 1.7, textAlign: isDesktop ? 'right' : 'left' }}>
              {t('landing.footer.address', { defaultValue: 'PEP\u2019s Swiss SA · Groupe NEUKOMM\nBellevue 7, 2950 Courgenay, Jura, Suisse' }).split('\n').map((line, i) => <span key={i}>{line}{i === 0 ? <br /> : ''}</span>)}
            </div>
          </div>
          <div style={{ marginTop: 16, fontSize: 10, textAlign: 'center', color: C.textSec }}>{t('landing.footer.copyright', { defaultValue: '© 2026 boom.contact — PEP\u2019s Swiss SA' })}</div>
        </Section>
      </footer>

      {showShare && <ShareBoom onClose={() => setShowShare(false)} context="landing" />}
      {showCGU && <CGUModal onAccept={() => setShowCGU(false)} onClose={() => setShowCGU(false)} />}
    </div>
  );
}
