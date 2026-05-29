import { useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { trpc } from '../trpc';
import { MIN_MESSAGE, validateBugReport, isValidEmail, friendlyError } from './bugReportUtils';

const C = { card:'#FFFFFF', bg:'#F5F8FC', elevated:'#EEF4FA', text:'#102033', sec:'#5D6B7C', orange:'#FF6B1A', navy:'#123A5A', border:'#DDE7F0', success:'#16A34A', danger:'#DC2626' };
const FONT = 'Manrope, ui-sans-serif, system-ui, sans-serif';


export function BugReport() {
  const [open, setOpen]       = useState(false);
  const [text, setText]       = useState('');
  const [sent, setSent]       = useState(false);
  const [email, setEmail]     = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const dialogRef = useFocusTrap<HTMLDivElement>(() => setOpen(false), open);

  const sendMut = trpc.email.bugReport.useMutation({
    onSuccess: () => { setSent(true); setErrorMsg(''); setText(''); setEmail(''); setOpen(false); },
    onError:   (err) => { setErrorMsg(friendlyError(err)); },
  });

  // Masqué sur les routes internes preview/QA pour des screenshots stores propres
  if (typeof window !== 'undefined' && /\/(visual-qa|design-preview)/.test(window.location.pathname)) return null;

  const v = validateBugReport(text, email);
  const { trimmed, emailFilled, emailOk, messageTooShort } = v;
  const canSend = v.canSend && !sendMut.isPending;

  const submit = () => {
    if (!canSend) return;
    setErrorMsg('');
    sendMut.mutate({
      message:   trimmed,
      userEmail: emailFilled && isValidEmail(email) ? email.trim() : undefined,
      page:      window.location.href,
      userAgent: navigator.userAgent.slice(0, 200),
    });
  };

  const inputStyle: React.CSSProperties = { border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontFamily:'inherit', boxSizing:'border-box' };
  const hintStyle: React.CSSProperties = { fontSize:11, color:C.sec, margin:'-4px 0 8px' };

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
        <div ref={dialogRef} role="dialog" aria-label="Signaler un problème" aria-modal="true" className="bottom-[112px] right-4 rounded-[14px] p-4 w-[272px] fixed bg-[#FFFFFF]" style={{ zIndex:700, border:'1px solid #DDE7F0', boxShadow:'0 12px 32px rgba(16,32,51,0.16)', color:'#102033', fontFamily:FONT }}>
          <div className="flex justify-between items-center mb-2.5">
            <div className="font-bold text-[13px]">🐛 Signaler un problème</div>
            <button onClick={() => setOpen(false)} aria-label="Fermer le formulaire" className="bg-transparent border-0 cursor-pointer text-base" style={{ color: '#9AA8B6' }}>✕</button>
          </div>

          <textarea value={text} onChange={e => { setText(e.target.value); if (errorMsg) setErrorMsg(''); }}
            placeholder="Décrivez ce qui ne fonctionne pas…"
            aria-label="Description du problème"
            rows={4}
            className="p-2.5 rounded-lg mb-2 leading-normal box-border w-full text-[13px]" style={{ ...inputStyle, resize:'none' }}
            onFocus={(e) => e.currentTarget.style.outline = '2px solid #FF6B1A'}
            onBlur={(e) => e.currentTarget.style.outline = 'none'}
          />
          {messageTooShort && (
            <div style={hintStyle}>Encore un peu — {MIN_MESSAGE} caractères minimum ({trimmed.length}/{MIN_MESSAGE}).</div>
          )}

          <input type="email" value={email} onChange={e => { setEmail(e.target.value); if (errorMsg) setErrorMsg(''); }}
            placeholder="Votre email (optionnel)"
            aria-label="Adresse email"
            className="rounded-lg mb-1 px-2.5 py-[9px] box-border w-full text-[13px]" style={inputStyle}
            onFocus={(e) => e.currentTarget.style.outline = '2px solid #FF6B1A'}
            onBlur={(e) => e.currentTarget.style.outline = 'none'}
          />
          {emailFilled && !emailOk && (
            <div style={hintStyle}>Adresse email invalide (ou laissez le champ vide).</div>
          )}
          {!emailFilled && <div style={{ height: 6 }} />}

          {errorMsg && (
            <div role="alert" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, padding: '8px 12px', color: C.danger, fontSize: 12, marginBottom: 8 }}>
              {errorMsg}
            </div>
          )}

          <button onClick={submit} disabled={!canSend}
            className="p-2.5 rounded-lg font-bold w-full text-[13px]" style={{ border:'none', background: canSend ? C.orange : C.elevated, color: canSend ? '#fff' : C.sec, cursor: canSend ? 'pointer' : 'not-allowed' }}>
            {sendMut.isPending ? '⏳ Envoi…' : 'Envoyer →'}
          </button>
        </div>
      )}
    </>
  );
}
