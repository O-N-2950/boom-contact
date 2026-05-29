/**
 * boom.contact — ShareBoom
 * Composant viral : partage de l'app par WhatsApp, SMS, email, TikTok, X, etc.
 * Objectif : devenir l'app constat n°1 par recommandation entre conducteurs
 */
import React, { useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface Props {
  onClose?: () => void;
  context?: 'post_constat' | 'landing' | 'account'; // contexte pour adapter le message
}

const APP_URL = 'https://www.boom.contact';

export const ShareBoom = React.memo(function ShareBoom({ onClose, context = 'landing' }: Props) {
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState('');
  const dialogRef = useFocusTrap<HTMLDivElement>(onClose);

  // Messages adaptés au contexte
  const messages = {
    post_constat: {
      title: '🚗 Passe le mot !',
      subtitle: 'Tu viens de faire ton constat en 5 min. Tes amis et collègues méritent de savoir que ça existe.',
      whatsapp: `💥 Je viens d'utiliser boom.contact pour faire un constat d'accident en 5 minutes depuis mon téléphone. OCR automatique, QR code, PDF horodaté. Télécharge-le avant d'en avoir besoin 👉 ${APP_URL}`,
      sms: `Utilise boom.contact pour tes constats d'accident. Simple et rapide. ${APP_URL}`,
      email_subject: "boom.contact — Le constat numérique que tout conducteur devrait avoir",
      email_body: `Salut,\n\nJe viens d'utiliser boom.contact pour faire un constat amiable numérique et c'est vraiment top.\n\n✅ Constat en 5 minutes\n✅ Scan automatique des documents\n✅ PDF horodaté envoyé par email\n✅ Multilingue\n\nUtile d'avoir ça avant d'en avoir besoin !\n\n👉 ${APP_URL}\n`,
    },
    account: {
      title: '🎁 Partagez boom.contact',
      subtitle: 'Chaque conducteur devrait avoir boom.contact avant un accident. Partagez maintenant.',
      whatsapp: `💥 Tu connais boom.contact ? L'app de constat amiable numérique. Constat numérique en 5 min, QR code, PDF horodaté. Gratuit pour essayer 👉 ${APP_URL}`,
      sms: `boom.contact — fais tes constats d'accident depuis ton téléphone en 5 min. ${APP_URL}`,
      email_subject: "boom.contact — L'app constat que tout conducteur devrait avoir",
      email_body: `Bonjour,\n\nJe te recommande boom.contact, une application pour faire des constats amiables numériques.\n\n✅ Constat en 5 minutes depuis ton téléphone\n✅ Reconnaissance automatique des documents\n✅ PDF horodaté envoyé par email\n✅ Multilingue\n\n👉 ${APP_URL}\n`,
    },
    landing: {
      title: '📲 Partager boom.contact',
      subtitle: 'Fais découvrir l\'app constat à tes proches. Tu pourrais leur sauver la mise un jour.',
      whatsapp: `💥 boom.contact — le constat numérique en 5 minutes. Scan des documents, QR code, PDF horodaté. À avoir sur son téléphone avant un accident 👉 ${APP_URL}`,
      sms: `boom.contact — constat numérique en 5 min. ${APP_URL}`,
      email_subject: "boom.contact — Le constat numérique à avoir sur son téléphone",
      email_body: `Bonjour,\n\nboom.contact est une app pour faire des constats d'accident depuis son téléphone.\n\n✅ 5 minutes chrono\n✅ Scan automatique permis et carte verte\n✅ PDF horodaté envoyé par email\n✅ Multilingue\n\n👉 ${APP_URL}\n`,
    },
  };

  const m = messages[context];

  const share = async (platform: string) => {
    const wa = encodeURIComponent(m.whatsapp);
    const sms = encodeURIComponent(m.sms);
    const subject = encodeURIComponent(m.email_subject);
    const body = encodeURIComponent(m.email_body);

    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${wa}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(APP_URL)}&text=${encodeURIComponent(m.whatsapp)}`,
      sms: `sms:?body=${sms}`,
      email: `mailto:?subject=${subject}&body=${body}`,
      x: `https://x.com/intent/tweet?text=${encodeURIComponent(m.whatsapp)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_URL)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(APP_URL)}`,
      tiktok: `https://www.tiktok.com/`, // TikTok pas de partage URL direct — ouvre l'app
    };

    if (platform === 'native' && navigator.share) {
      try {
        await navigator.share({
          title: 'boom.contact',
          text: m.whatsapp,
          url: APP_URL,
        });
        setSent('native');
      } catch { /* annulé */ }
      return;
    }

    if (platform === 'copy') {
      await navigator.clipboard.writeText(`${m.whatsapp}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return;
    }

    if (urls[platform]) {
      window.open(urls[platform], '_blank');
      setSent(platform);
    }
  };

  const channels = [
    { id: 'whatsapp', label: 'WhatsApp', color: '#25D366', icon: '💬' },
    { id: 'sms', label: 'SMS', color: '#0A84FF', icon: '✉️' },
    { id: 'telegram', label: 'Telegram', color: '#229ED9', icon: '✈️' },
    { id: 'email', label: 'Email', color: '#123A5A', icon: '📧' },
    { id: 'x', label: 'X / Twitter', color: '#000', icon: '𝕏' },
    { id: 'facebook', label: 'Facebook', color: '#1877F2', icon: 'f' },
    { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', icon: 'in' },
  ];

  // Palette Hybrid Trust Premium
  const C = { card:'#FFFFFF', bg:'#F5F8FC', elevated:'#EEF4FA', text:'#102033', sec:'#5D6B7C', orange:'#FF6B1A', orangeHover:'#F05A0A', navy:'#123A5A', border:'#DDE7F0', success:'#16A34A' };

  return (
    <div role="dialog" aria-label="Partager boom.contact" aria-modal="true"
      onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:900, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', background:'rgba(16,32,51,0.55)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', boxSizing:'border-box' }}>
      <div ref={dialogRef} onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:460, maxHeight:'92vh', overflowY:'auto', background:C.card, border:`1px solid ${C.border}`, borderRadius:20, boxShadow:'0 24px 60px rgba(16,32,51,0.22)', padding:'22px 20px calc(20px + env(safe-area-inset-bottom))', fontFamily:'Manrope, ui-sans-serif, system-ui, sans-serif' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:C.text }}>{m.title}</div>
            <div style={{ fontSize:13, marginTop:4, lineHeight:1.5, color:C.sec, maxWidth:300 }}>{m.subtitle}</div>
          </div>
          {onClose && (
            <button onClick={onClose} aria-label="Fermer le partage" style={{ border:`1px solid ${C.border}`, background:C.bg, borderRadius:20, width:34, height:34, cursor:'pointer', fontSize:18, flexShrink:0, color:C.sec, lineHeight:1 }}>×</button>
          )}
        </div>

        {/* Message preview */}
        <div style={{ marginTop:16, background:C.elevated, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 14px', fontSize:12, fontStyle:'italic', lineHeight:1.6, color:C.sec }}>
          "{m.whatsapp.slice(0, 120)}..."
        </div>

        {/* Bouton natif */}
        {'share' in navigator && (
          <button onClick={() => share('native')}
            style={{ marginTop:16, width:'100%', padding:16, borderRadius:14, border:'none', color:'#fff', cursor:'pointer', fontSize:16, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', gap:10, background:C.orange, boxShadow:'0 8px 22px rgba(255,107,26,0.28)', transition:'background .15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = C.orangeHover)}
            onMouseLeave={e => (e.currentTarget.style.background = C.orange)}>
            <span style={{ fontSize:20 }}>📤</span> Partager maintenant
          </button>
        )}

        {/* Séparateur */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:16 }}>
          <div style={{ flex:1, height:1, background:C.border }} />
          <div style={{ fontSize:11, color:C.sec }}>ou choisir</div>
          <div style={{ flex:1, height:1, background:C.border }} />
        </div>

        {/* Grille canaux */}
        <div style={{ display:'grid', gap:10, marginTop:14, gridTemplateColumns:'repeat(4, 1fr)' }}>
          {channels.map(ch => (
            <button key={ch.id} onClick={() => share(ch.id)}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, borderRadius:14, cursor:'pointer', padding:'12px 8px', border: sent === ch.id ? `1.5px solid ${ch.color}` : `1px solid ${C.border}`, background: sent === ch.id ? `${ch.color}18` : C.bg, transition:'all .15s' }}>
              <div style={{ width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', background:ch.color, fontSize: ch.id === 'x' || ch.id === 'linkedin' ? 14 : 18, fontWeight:900 }}>{ch.icon}</div>
              <div style={{ fontSize:10, textAlign:'center', color:C.sec }}>{ch.label}</div>
            </button>
          ))}
          {/* Copier le lien */}
          <button onClick={() => share('copy')}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, borderRadius:14, cursor:'pointer', padding:'12px 8px', transition:'all .2s', border: copied ? `1.5px solid ${C.success}` : `1px solid ${C.border}`, background: copied ? 'rgba(22,163,74,0.12)' : C.bg }}>
            <div style={{ width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, background: copied ? C.success : C.elevated, transition:'background .2s' }}>{copied ? '✅' : '📋'}</div>
            <div style={{ fontSize:10, textAlign:'center', color: copied ? C.success : C.sec }}>{copied ? 'Copié !' : 'Copier lien'}</div>
          </button>
        </div>

        {/* Stats */}
        <div style={{ marginTop:16, background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, display:'flex', gap:20, justifyContent:'center', padding:'12px 16px' }}>
          {[['5 min','pour un constat'], ['QR','pour inviter'], ['PDF','horodaté']].map(([val, label]) => (
            <div key={label} style={{ textAlign:'center' }}>
              <div style={{ fontWeight:800, fontSize:16, color:C.navy }}>{val}</div>
              <div style={{ fontSize:10, color:C.sec }}>{label}</div>
            </div>
          ))}
        </div>

        {/* TikTok tip */}
        <div style={{ marginTop:12, background:C.elevated, border:`1px solid ${C.border}`, borderRadius:10, display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
          <span style={{ fontSize:18 }}>🎵</span>
          <div style={{ fontSize:11, color:C.sec, lineHeight:1.5 }}>
            <strong style={{ color:C.text }}>TikTok / Instagram / YouTube</strong> — filme ton prochain constat et mentionne boom.contact dans la vidéo !
          </div>
        </div>

      </div>
    </div>
  );
});
