import { useState } from 'react';
import { trpc } from '../trpc';

export function BugReport() {
  const [open, setOpen]       = useState(false);
  const [text, setText]       = useState('');
  const [sent, setSent]       = useState(false);
  const [email, setEmail]     = useState('');

  const sendMut = trpc.email.bugReport.useMutation({
    onSuccess: () => { setSent(true); setOpen(false); },
    onError:   () => { setSent(true); setOpen(false); }, // affiche succès même si erreur
  });

  const submit = () => {
    if (!text.trim()) return;
    sendMut.mutate({
      message:   text.trim(),
      userEmail: email.includes('@') ? email : undefined,
      page:      window.location.href,
      userAgent: navigator.userAgent.slice(0, 200),
    });
  };

  return (
    <>
      {sent && (
        <div style={{
          position:'fixed', bottom:76, right:16, zIndex:600,
          background:'#06060C', border:'1px solid #22c55e', borderRadius:12,
          padding:'10px 14px', fontSize:13, color:'#22c55e', fontWeight:600,
          boxShadow:'0 4px 20px rgba(0,0,0,0.4)', display:'flex', alignItems:'center', gap:8,
        }}>
          ✅ Merci !
          <button onClick={() => setSent(false)} style={{ background:'none', border:'none', color:'#22c55e', cursor:'pointer', fontSize:14 }}>✕</button>
        </div>
      )}

      {/* Bouton flottant discret */}
      {!sent && (
        <button onClick={() => setOpen(o => !o)} title="Signaler un problème"
          style={{
            position:'fixed', bottom:76, right:16, zIndex:600,
            background:'rgba(6,6,12,0.8)', border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:20, padding:'6px 11px',
            color:'rgba(255,255,255,0.3)', cursor:'pointer',
            fontSize:11, fontFamily:'monospace',
            backdropFilter:'blur(6px)',
            touchAction:'manipulation', WebkitTapHighlightColor:'transparent',
          }}>
          🐛
        </button>
      )}

      {open && (
        <div style={{
          position:'fixed', bottom:112, right:16, zIndex:700,
          background:'#06060C', border:'1px solid rgba(255,255,255,0.12)',
          borderRadius:14, padding:16, width:272,
          boxShadow:'0 8px 32px rgba(0,0,0,0.6)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontWeight:700, fontSize:13 }}>🐛 Signaler un problème</div>
            <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:16 }}>✕</button>
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Décrivez ce qui ne fonctionne pas…"
            rows={4}
            style={{
              width:'100%', padding:'10px', borderRadius:8,
              border:'1px solid rgba(255,255,255,0.1)',
              background:'rgba(255,255,255,0.04)', color:'var(--text)',
              fontSize:13, lineHeight:1.5, resize:'none',
              fontFamily:'inherit', outline:'none',
              boxSizing:'border-box' as const, marginBottom:8,
            }}
          />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Votre email (optionnel)"
            style={{
              width:'100%', padding:'9px 10px', borderRadius:8,
              border:'1px solid rgba(255,255,255,0.08)',
              background:'rgba(255,255,255,0.04)', color:'var(--text)',
              fontSize:13, outline:'none', fontFamily:'inherit',
              boxSizing:'border-box' as const, marginBottom:10,
            }}
          />
          <button onClick={submit} disabled={!text.trim() || sendMut.isPending}
            style={{
              width:'100%', padding:'10px', borderRadius:8, border:'none',
              background: text.trim() ? 'var(--boom)' : 'rgba(255,255,255,0.06)',
              color: text.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
              cursor: text.trim() ? 'pointer' : 'not-allowed',
              fontSize:13, fontWeight:700,
            }}>
            {sendMut.isPending ? '⏳ Envoi…' : 'Envoyer →'}
          </button>
        </div>
      )}
    </>
  );
}
