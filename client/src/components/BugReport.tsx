import { useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { trpc } from '../trpc';

export function BugReport() {
  const [open, setOpen]       = useState(false);
  const [text, setText]       = useState('');
  const [sent, setSent]       = useState(false);
  const [email, setEmail]     = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const dialogRef = useFocusTrap<HTMLDivElement>(() => setOpen(false));

  const sendMut = trpc.email.bugReport.useMutation({
    onSuccess: () => { setSent(true); setErrorMsg(''); setOpen(false); },
    onError:   (err) => { setErrorMsg(err.message || 'Erreur lors de l\'envoi du rapport'); console.error('bugReport failed:', err.message); },
  });

  // Masqué sur les routes internes preview/QA pour des screenshots stores propres
  if (typeof window !== 'undefined' && /\/(visual-qa|design-preview)/.test(window.location.pathname)) return null;

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
        <div className="bottom-[76px] right-4 rounded-xl gap-2 px-3.5 py-2.5 font-semibold fixed bg-[#FFFFFF] text-[13px] text-[#16A34A] flex items-center" style={{ zIndex:600, border:'1px solid #22c55e', boxShadow:'0 6px 20px rgba(16,32,51,0.12)' }}>
          ✅ Merci !
          <button onClick={() => setSent(false)} aria-label="Fermer le message" className="bg-transparent border-0 text-green-500 cursor-pointer text-sm">✕</button>
        </div>
      )}

      {/* Bouton flottant discret */}
      {!sent && (
        <button onClick={() => setOpen(o => !o)} aria-label="Signaler un problème"
          className="bottom-[76px] right-4 rounded-[20px] px-[11px] py-1.5 cursor-pointer touch-manipulation fixed text-[11px]" style={{ zIndex:600, background:'rgba(255,255,255,0.92)', border:'1px solid #DDE7F0', color:'#5D6B7C', boxShadow:'0 4px 14px rgba(16,32,51,0.10)', backdropFilter:'blur(6px)', WebkitTapHighlightColor:'transparent', minWidth:44, minHeight:44, display:'flex', alignItems:'center', justifyContent:'center' }}>
          🐛
        </button>
      )}

      {open && (
        <div ref={dialogRef} role="dialog" aria-label="Signaler un problème" aria-modal="true" className="bottom-[112px] right-4 rounded-[14px] p-4 w-[272px] fixed bg-[#FFFFFF]" style={{ zIndex:700, border:'1px solid #DDE7F0', boxShadow:'0 12px 32px rgba(16,32,51,0.16)', color:'#102033', fontFamily:"Manrope, ui-sans-serif, system-ui, sans-serif" }}>
          <div className="flex justify-between items-center mb-2.5">
            <div className="font-bold text-[13px]">🐛 Signaler un problème</div>
            <button onClick={() => setOpen(false)} aria-label="Fermer le formulaire" className="bg-transparent border-0 cursor-pointer text-base" style={{ color: '#9AA8B6' }}>✕</button>
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Décrivez ce qui ne fonctionne pas…"
            aria-label="Description du problème"
            rows={4}
            className="p-2.5 rounded-lg mb-2 leading-normal box-border w-full text-[13px]" style={{ border:'1px solid #DDE7F0', background:'#F5F8FC', color:'#102033', resize:'none', fontFamily:'inherit' }}
            onFocus={(e) => e.currentTarget.style.outline = '2px solid #FF6B1A'}
            onBlur={(e) => e.currentTarget.style.outline = 'none'}
          />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Votre email (optionnel)"
            aria-label="Adresse email"
            className="rounded-lg mb-2.5 px-2.5 py-[9px] box-border w-full text-[13px]" style={{ border:'1px solid #DDE7F0', background:'#F5F8FC', color:'#102033', fontFamily:'inherit' }}
            onFocus={(e) => e.currentTarget.style.outline = '2px solid #FF6B1A'}
            onBlur={(e) => e.currentTarget.style.outline = 'none'}
          />
          {errorMsg && (
            <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', color: '#ef4444', fontSize: 12, marginBottom: 8 }}>
              {errorMsg}
            </div>
          )}
          <button onClick={submit} disabled={!text.trim() || sendMut.isPending}
            className="p-2.5 rounded-lg font-bold w-full text-[13px]" style={{ border:'none', background: text.trim() ? '#FF6B1A' : '#EEF4FA', color: text.trim() ? '#fff' : '#5D6B7C', cursor: text.trim() ? 'pointer' : 'not-allowed' }}>
            {sendMut.isPending ? '⏳ Envoi…' : 'Envoyer →'}
          </button>
        </div>
      )}
    </>
  );
}
