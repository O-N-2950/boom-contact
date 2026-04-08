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
      whatsapp: `💥 Je viens d'utiliser boom.contact pour faire un constat d'accident en 5 minutes depuis mon téléphone. OCR automatique, QR code, PDF certifié. Valable dans 150 pays. Télécharge-le avant d'en avoir besoin 👉 ${APP_URL}`,
      sms: `Utilise boom.contact pour tes constats d'accident. Simple, rapide, mondial. ${APP_URL}`,
      email_subject: "boom.contact — Le constat numérique que tout conducteur devrait avoir",
      email_body: `Salut,\n\nJe viens d'utiliser boom.contact pour faire un constat amiable numérique et c'est vraiment top.\n\n✅ Constat en 5 minutes\n✅ Scan automatique des documents\n✅ PDF certifié envoyé par email\n✅ Valable dans 150+ pays\n\nUtile d'avoir ça avant d'en avoir besoin !\n\n👉 ${APP_URL}\n`,
    },
    account: {
      title: '🎁 Partagez boom.contact',
      subtitle: 'Chaque conducteur devrait avoir boom.contact avant un accident. Partagez maintenant.',
      whatsapp: `💥 Tu connais boom.contact ? L'app qui remplace le constat papier. Constat numérique en 5 min, QR code, PDF certifié, valable dans 150 pays. Gratuit pour essayer 👉 ${APP_URL}`,
      sms: `boom.contact — fais tes constats d'accident depuis ton téléphone en 5 min. ${APP_URL}`,
      email_subject: "boom.contact — L'app constat que tout conducteur devrait avoir",
      email_body: `Bonjour,\n\nJe te recommande boom.contact, une application pour faire des constats amiables numériques.\n\n✅ Constat en 5 minutes depuis ton téléphone\n✅ Reconnaissance automatique des documents\n✅ PDF certifié envoyé par email\n✅ Valable dans 150+ pays\n\n👉 ${APP_URL}\n`,
    },
    landing: {
      title: '📲 Partager boom.contact',
      subtitle: 'Fais découvrir l\'app constat à tes proches. Tu pourrais leur sauver la mise un jour.',
      whatsapp: `💥 boom.contact — le constat numérique en 5 minutes. Scan des documents, QR code, PDF certifié. Valable dans 150 pays. À avoir sur son téléphone avant un accident 👉 ${APP_URL}`,
      sms: `boom.contact — constat numérique en 5 min. ${APP_URL}`,
      email_subject: "boom.contact — Le constat numérique à avoir sur son téléphone",
      email_body: `Bonjour,\n\nboom.contact est une app pour faire des constats d'accident depuis son téléphone.\n\n✅ 5 minutes chrono\n✅ Scan automatique permis et carte verte\n✅ PDF certifié envoyé par email\n✅ Valable dans 150+ pays\n\n👉 ${APP_URL}\n`,
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
    { id: 'email', label: 'Email', color: '#FF3500', icon: '📧' },
    { id: 'x', label: 'X / Twitter', color: '#000', icon: '𝕏' },
    { id: 'facebook', label: 'Facebook', color: '#1877F2', icon: 'f' },
    { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', icon: 'in' },
  ];

  return (
    <div ref={dialogRef} role="dialog" aria-label="Partager boom.contact" aria-modal="true" className="fixed inset-0 flex flex-col" style={{ zIndex: 900, background: 'rgba(6,6,12,0.95)', padding: '0 0 env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <div className="flex justify-between items-start" style={{ padding: '20px 20px 0' }}>
        <div>
          <div className="text-[22px] font-black text-white">{m.title}</div>
          <div className="text-[13px] mt-1 leading-normal max-w-[280px]"  style={{ color: 'rgba(240,237,232,0.5)' }}>
            {m.subtitle}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Fermer le partage" className="border-0 rounded-[20px] w-9 h-9 cursor-pointer text-lg shrink-0 text-[#d0d0d0]" style={{ background: 'rgba(255,255,255,0.08)' }}>×</button>
        )}
      </div>

      {/* Message preview */}
      <div className="rounded-xl text-xs italic px-4 py-3.5 leading-[1.6]" style={{ margin: '16px 20px 0', background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.2)', color: 'rgba(240,237,232,0.6)' }}>
        "{m.whatsapp.slice(0, 120)}..."
      </div>

      {/* Bouton natif iOS/Android en premier */}
      {'share' in navigator && (
        <div style={{ padding: '16px 20px 0' }}>
          <button
            onClick={() => share('native')}
            className="w-full p-4 rounded-[14px] border-0 text-white cursor-pointer text-base font-bold flex items-center justify-center gap-2.5" style={{ background: 'var(--boom)', boxShadow: '0 6px 24px rgba(255,53,0,0.4)' }}
          >
            <span className="text-xl">📤</span>
            Partager maintenant
          </button>
        </div>
      )}

      {/* Séparateur */}
      <div className="flex items-center gap-3" style={{ padding: '16px 20px 0' }}>
        <div className="flex-1 h-px"  style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="text-[#d0d0d0] text-[11px]">ou choisir</div>
        <div className="flex-1 h-px"  style={{ background: 'rgba(255,255,255,0.08)' }} />
      </div>

      {/* Grille canaux */}
      <div className="grid gap-2.5" style={{ padding: '14px 20px 0', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {channels.map(ch => (
          <button
            key={ch.id}
            onClick={() => share(ch.id)}
            className="flex flex-col items-center gap-1.5 rounded-[14px] cursor-pointer px-2 py-3" style={{ border: sent === ch.id ? `1.5px solid ${ch.color}` : '1px solid rgba(255,255,255,0.25)', background: sent === ch.id ? `${ch.color}22` : 'rgba(255,255,255,0.04)', transition: 'all 0.15s' }}
          >
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white" style={{ background: ch.color, fontSize: ch.id === 'x' ? 14 : ch.id === 'linkedin' ? 14 : 18, fontWeight: 900 }}>
              {ch.icon}
            </div>
            <div className="text-[10px] text-center" style={{ color: 'rgba(240,237,232,0.6)' }}>
              {ch.label}
            </div>
          </button>
        ))}

        {/* Copier le lien */}
        <button
          onClick={() => share('copy')}
          className="flex flex-col items-center gap-1.5 rounded-[14px] cursor-pointer transition-all duration-200 px-2 py-3" style={{ border: copied ? '1.5px solid #22c55e' : '1px solid rgba(255,255,255,0.25)', background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)' }}
        >
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg" style={{ background: copied ? '#22c55e' : '#333', transition: 'background 0.2s' }}>
            {copied ? '✅' : '📋'}
          </div>
          <div className="text-[10px] text-center" style={{ color: copied ? '#22c55e' : 'rgba(240,237,232,0.6)' }}>
            {copied ? 'Copié !' : 'Copier lien'}
          </div>
        </button>
      </div>

      {/* Stats sociales — preuve sociale */}
      <div className="rounded-xl flex gap-5 justify-center px-4 py-3" style={{ margin: '16px 20px 0', background: 'rgba(255,255,255,0.03)' }}>
        {[
          ['150+', 'pays reconnus'],
          ['5 min', 'pour un constat'],
          ['0€', 'pour essayer'],
        ].map(([val, label]) => (
          <div key={label} className="text-center">
            <div className="font-black text-base text-[#FF5533]">{val}</div>
            <div className="text-[#d0d0d0] text-[10px]">{label}</div>
          </div>
        ))}
      </div>

      {/* TikTok — astuce */}
      <div className="rounded-[10px] flex items-center gap-2.5 px-3.5 py-2.5" style={{ margin: '12px 20px 0', background: 'rgba(0,0,0,0.4)' }}>
        <span className="text-xl">🎵</span>
        <div className="text-[11px] text-[#d0d0d0] leading-normal">
          <strong className="text-white">TikTok / Instagram / YouTube</strong> — filme ton prochain constat et mentionne boom.contact dans la vidéo !
        </div>
      </div>

    </div>
  );
});
