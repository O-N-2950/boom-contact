/**
 * boom.contact — ShareBoom
 * Composant viral : partage de l'app par WhatsApp, SMS, email, TikTok, X, etc.
 * Objectif : devenir l'app constat n°1 par recommandation entre conducteurs
 */
import { useState } from 'react';

interface Props {
  onClose?: () => void;
  context?: 'post_constat' | 'landing' | 'account'; // contexte pour adapter le message
  conductorName?: string; // pour personnaliser "X t'a partagé boom.contact"
}

const APP_URL = 'https://www.boom.contact';

export function ShareBoom({ onClose, context = 'landing', conductorName }: Props) {
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState('');

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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'rgba(6,6,12,0.95)',
      display: 'flex', flexDirection: 'column',
      padding: '0 0 env(safe-area-inset-bottom)',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 20px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{m.title}</div>
          <div style={{ fontSize: 13, color: 'rgba(240,237,232,0.5)', marginTop: 4, lineHeight: 1.5, maxWidth: 280 }}>
            {m.subtitle}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.08)', border: 'none',
            borderRadius: 20, width: 36, height: 36,
            color: '#888', cursor: 'pointer', fontSize: 18, flexShrink: 0,
          }}>×</button>
        )}
      </div>

      {/* Message preview */}
      <div style={{
        margin: '16px 20px 0',
        padding: '14px 16px',
        background: 'rgba(255,53,0,0.06)',
        border: '1px solid rgba(255,53,0,0.2)',
        borderRadius: 12,
        fontSize: 12, color: 'rgba(240,237,232,0.6)', lineHeight: 1.6,
        fontStyle: 'italic',
      }}>
        "{m.whatsapp.slice(0, 120)}..."
      </div>

      {/* Bouton natif iOS/Android en premier */}
      {'share' in navigator && (
        <div style={{ padding: '16px 20px 0' }}>
          <button
            onClick={() => share('native')}
            style={{
              width: '100%', padding: '16px',
              borderRadius: 14, border: 'none',
              background: 'var(--boom)',
              color: '#fff', cursor: 'pointer',
              fontSize: 16, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 6px 24px rgba(255,53,0,0.4)',
            }}
          >
            <span style={{ fontSize: 20 }}>📤</span>
            Partager maintenant
          </button>
        </div>
      )}

      {/* Séparateur */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px 0',
      }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ color: '#555', fontSize: 11 }}>ou choisir</div>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      </div>

      {/* Grille canaux */}
      <div style={{
        padding: '14px 20px 0',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10,
      }}>
        {channels.map(ch => (
          <button
            key={ch.id}
            onClick={() => share(ch.id)}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 6,
              padding: '12px 8px',
              borderRadius: 14,
              border: sent === ch.id ? `1.5px solid ${ch.color}` : '1px solid rgba(255,255,255,0.08)',
              background: sent === ch.id ? `${ch.color}22` : 'rgba(255,255,255,0.04)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: ch.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: ch.id === 'x' ? 14 : ch.id === 'linkedin' ? 14 : 18,
              color: '#fff', fontWeight: 900,
            }}>
              {ch.icon}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(240,237,232,0.6)', textAlign: 'center' }}>
              {ch.label}
            </div>
          </button>
        ))}

        {/* Copier le lien */}
        <button
          onClick={() => share('copy')}
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 6,
            padding: '12px 8px',
            borderRadius: 14,
            border: copied ? '1.5px solid #22c55e' : '1px solid rgba(255,255,255,0.08)',
            background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: copied ? '#22c55e' : '#333',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, transition: 'background 0.2s',
          }}>
            {copied ? '✅' : '📋'}
          </div>
          <div style={{ fontSize: 10, color: copied ? '#22c55e' : 'rgba(240,237,232,0.6)', textAlign: 'center' }}>
            {copied ? 'Copié !' : 'Copier lien'}
          </div>
        </button>
      </div>

      {/* Stats sociales — preuve sociale */}
      <div style={{
        margin: '16px 20px 0',
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        display: 'flex', gap: 20, justifyContent: 'center',
      }}>
        {[
          ['150+', 'pays reconnus'],
          ['5 min', 'pour un constat'],
          ['0€', 'pour essayer'],
        ].map(([val, label]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ color: '#FF3500', fontWeight: 900, fontSize: 16 }}>{val}</div>
            <div style={{ color: '#555', fontSize: 10 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* TikTok — astuce */}
      <div style={{
        margin: '12px 20px 0',
        padding: '10px 14px',
        background: 'rgba(0,0,0,0.4)',
        borderRadius: 10,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>🎵</span>
        <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>
          <strong style={{ color: '#fff' }}>TikTok / Instagram / YouTube</strong> — filme ton prochain constat et mentionne boom.contact dans la vidéo !
        </div>
      </div>

    </div>
  );
}
