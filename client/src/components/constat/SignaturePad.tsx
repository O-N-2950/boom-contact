import { useRef, useEffect, useState } from 'react';

interface Props {
  role: 'A' | 'B';
  onSign: (signatureBase64: string) => void;
  otherSigned: boolean;
}

export function SignaturePad({ role, onSign, otherSigned }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#06060C';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = role === 'A' ? '#FF3500' : '#00E5FF';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    if (signed) return;
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current!;
    lastPoint.current = getPos(e, canvas);
    setIsEmpty(false);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing.current || signed) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const point = getPos(e, canvas);

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
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#06060C';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const confirmSign = async () => {
    if (isEmpty || signed) return;
    setSigning(true);
    const canvas = canvasRef.current!;
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    await new Promise(r => setTimeout(r, 400));
    setSigned(true);
    setSigning(false);
    onSign(base64);
  };

  const roleColor = role === 'A' ? '#FF3500' : '#00E5FF';

  return (
    <div style={{ padding: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Signature — Conducteur {role}
        </h3>

        {/* Status both parties */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
          <div style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontFamily: 'monospace',
            background: signed ? 'rgba(34,197,94,0.15)' : 'rgba(255,53,0,0.1)',
            border: `1px solid ${signed ? 'rgba(34,197,94,0.3)' : 'rgba(255,53,0,0.2)'}`,
            color: signed ? '#22c55e' : 'var(--boom)' }}>
            {signed ? '✅' : '⏳'} Conducteur {role}
          </div>
          <div style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontFamily: 'monospace',
            background: otherSigned ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${otherSigned ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
            color: otherSigned ? '#22c55e' : 'rgba(240,237,232,0.4)' }}>
            {otherSigned ? '✅' : '⏳'} Conducteur {role === 'A' ? 'B' : 'A'}
          </div>
        </div>
      </div>

      {/* Signature canvas */}
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden',
        border: `2px solid ${signed ? 'rgba(34,197,94,0.4)' : `${roleColor}33`}`,
        marginBottom: 14 }}>
        <canvas
          ref={canvasRef}
          width={340} height={160}
          style={{ display: 'block', width: '100%', height: 'auto', touchAction: 'none',
            cursor: signed ? 'default' : 'crosshair' }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        />
        {isEmpty && !signed && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ fontSize: 13, opacity: 0.2, fontStyle: 'italic' }}>
              Signez ici avec votre doigt
            </span>
          </div>
        )}
        {signed && (
          <div style={{ position: 'absolute', top: 8, right: 8,
            padding: '3px 8px', borderRadius: 4, background: 'rgba(34,197,94,0.2)',
            border: '1px solid rgba(34,197,94,0.4)', fontSize: 10,
            color: '#22c55e', fontFamily: 'monospace', letterSpacing: 1 }}>
            SIGNÉ ✓
          </div>
        )}
      </div>

      {/* Actions */}
      {!signed && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={clear} style={{
            flex: 1, padding: '13px', borderRadius: 10,
            border: '1.5px solid rgba(240,237,232,0.12)',
            background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13,
          }}>
            🗑 Effacer
          </button>
          <button onClick={confirmSign} disabled={isEmpty || signing} style={{
            flex: 2, padding: '13px', borderRadius: 10, border: 'none',
            background: isEmpty ? 'rgba(255,53,0,0.3)' : 'var(--boom)',
            color: '#fff', cursor: isEmpty ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 700, transition: 'all 0.2s',
          }}>
            {signing ? '⏳ Enregistrement…' : '✍️ Confirmer la signature'}
          </button>
        </div>
      )}

      {signed && !otherSigned && (
        <div style={{ padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}>⏳</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>
            En attente de la signature de l'autre conducteur…
          </div>
          <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>
            Le PDF sera généré dès que les deux parties auront signé.
          </div>
        </div>
      )}

      {signed && otherSigned && (
        <div style={{ padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.3)', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🎉</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#22c55e' }}>
            Constat signé par les deux parties !
          </div>
          <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
            Génération du PDF en cours…
          </div>
        </div>
      )}
    </div>
  );
}
