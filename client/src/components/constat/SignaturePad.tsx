import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Props {
  role: string;
  onSign: (signatureBase64: string) => void;
  otherSigned: boolean;
  isOtherPedestrian?: boolean;  // true pour tous les cas sans signature adverse
  disabled?: boolean;
}

export const SignaturePad = React.memo(function SignaturePad({ role, onSign, otherSigned, isOtherPedestrian = false, disabled = false }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const [signing, setSigning]   = useState(false);
  const [signed, setSigned]     = useState(false);
  const [isEmpty, setIsEmpty]   = useState(true);
  const drawing      = useRef(false);
  const lastPoint    = useRef<{ x: number; y: number } | null>(null);
  const roleColor    = role === 'A' ? '#FF3500' : '#00E5FF';

  // ── Canvas context init ────────────────────────────────────
  const initCtx = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#06060C';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = roleColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap   = 'round';
    ctx.lineJoin  = 'round';
  }, [roleColor]);

  // ── ResizeObserver — adapte le canvas sans déformer ────────
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas  = canvasRef.current;
    if (!wrapper || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;

        // Conserver le dessin existant avant resize
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width  = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d')!.drawImage(canvas, 0, 0);

        // Redimensionner canvas en tenant compte du DPR
        const cssHeight = Math.round(width * 0.45); // ratio 45% de la largeur
        canvas.width  = Math.round(width * dpr);
        canvas.height = Math.round(cssHeight * dpr);
        canvas.style.width  = `${width}px`;
        canvas.style.height = `${cssHeight}px`;

        // Reinit context (resetté après resize)
        initCtx(canvas);

        // Restaurer le dessin (scalé à la nouvelle taille)
        if (!isEmpty) {
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
        }
      }
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [initCtx, isEmpty]);

  // ── Coordonnées corrigées pour DPR ────────────────────────
  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const dpr    = window.devicePixelRatio || 1;
    // Multiplier par DPR pour que les coords correspondent aux pixels canvas
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - rect.left)  * dpr,
      y: (clientY - rect.top)   * dpr,
    };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    if (signed) return;
    e.preventDefault();
    drawing.current   = true;
    lastPoint.current = getPos(e);
    setIsEmpty(false);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing.current || signed) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    const point  = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current!.x, lastPoint.current!.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint.current = point;
  };

  const endDraw = () => { drawing.current = false; };

  const clear = () => {
    if (signed) return;
    const canvas = canvasRef.current!;
    initCtx(canvas);
    setIsEmpty(true);
  };

  const confirmSign = async () => {
    if (isEmpty || signed) return;
    setSigning(true);
    const canvas = canvasRef.current!;
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    await new Promise(r => setTimeout(r, 300));
    setSigned(true);
    setSigning(false);
    onSign(base64);
  };

  return (
    <div className="p-5">
      <div className="text-center mb-5">
        <h2 className="text-base font-bold mb-1">
          Signature — <span className="font-extrabold" style={{ color: roleColor }}>Conducteur {role}</span>
        </h2>
        <div className="flex gap-2.5 justify-center mt-2.5">
          {[
            { label: `Conducteur ${role}`, done: signed, isPrimary: true },
            {
              label: isOtherPedestrian ? 'Autre partie' : `Conducteur ${role === 'A' ? 'B' : 'A'}`,
              done: isOtherPedestrian ? true : otherSigned,
              noSig: isOtherPedestrian,
            },
          ].map((p, i) => (
            <div key={i} className="rounded-[20px] text-[11px] px-3 py-1" style={{ fontFamily: 'monospace', background: p.done ? 'rgba(34,197,94,0.15)' : i === 0 ? 'rgba(255,53,0,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${p.done ? 'rgba(34,197,94,0.3)' : i === 0 ? 'rgba(255,53,0,0.2)' : 'rgba(255,255,255,0.1)'}`, color: p.done ? '#22c55e' : i === 0 ? 'var(--boom)' : 'rgba(240,237,232,0.4)' }}>
              {p.done ? (p.noSig ? '✓' : '✅') : '⏳'} {p.label}{p.noSig ? ' — sans signature' : ''}
            </div>
          ))}
        </div>
      </div>

      {/* Wrapper observé par ResizeObserver */}
      <div
        ref={wrapperRef}
        className="relative rounded-xl overflow-hidden mb-3.5 w-full" style={{ border: `2px solid ${signed ? 'rgba(34,197,94,0.4)' : `${roleColor}33`}` }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Zone de signature — Conducteur ${role}`}
          tabIndex={0}
          className="block w-full touch-none" style={{ cursor: signed ? 'default' : 'crosshair', // CSS width — ResizeObserver gère le canvas interne }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {isEmpty && !signed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[13px] italic opacity-75">Signez ici avec votre doigt</span>
          </div>
        )}
        {signed && (
          <div className="absolute rounded text-[10px] text-green-500 top-2 right-2 px-2 py-[3px] tracking-[1px]" style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', fontFamily: 'monospace' }}>
            SIGNÉ ✓
          </div>
        )}
      </div>

      {!signed && (
        <div className="flex gap-2.5">
          <button onClick={clear} className="flex-1 rounded-[10px] bg-transparent cursor-pointer text-[13px] p-[13px]"  style={{ border: '1.5px solid rgba(240,237,232,0.12)', color: 'var(--text)' }}>
            🗑 Effacer
          </button>
          <button onClick={confirmSign} disabled={isEmpty || signing || disabled} className="rounded-[10px] border-0 text-white text-sm font-bold p-[13px] transition-all duration-200"  style={{ flex: 2, opacity: disabled ? 0.4 : 1, background: isEmpty ? 'rgba(255,53,0,0.3)' : 'var(--boom)', cursor: isEmpty ? 'not-allowed' : 'pointer' }}>
            {signing ? '⏳ Enregistrement…' : '✍️ Confirmer la signature'}
          </button>
        </div>
      )}

      {signed && !otherSigned && !isOtherPedestrian && (
        <div className="p-3.5 rounded-[10px] text-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="text-[22px] mb-1.5">⏳</div>
          <div className="text-[13px] font-semibold text-[#f59e0b]">En attente de la signature de l'autre conducteur…</div>
          <div className="text-[11px] mt-1 opacity-70" >Le PDF sera généré dès que les deux parties auront signé.</div>
        </div>
      )}

      {signed && (otherSigned || isOtherPedestrian) && (
        <div className="p-3.5 rounded-[10px] text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}>
          <div className="text-4xl mb-1.5">🎉</div>
          <div className="text-[15px] font-bold text-green-500">Constat signé !</div>
          <div className="text-xs mt-1 opacity-75">Génération du PDF en cours…</div>
        </div>
      )}
    </div>
  );
});
