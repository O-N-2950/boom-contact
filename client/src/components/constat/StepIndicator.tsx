interface Step { id: string; icon: string; label: string; }
interface Props {
  steps: Step[];
  currentIndex: number;
  onStepClick?: (stepId: string, index: number) => void;
}

export function StepIndicator({ steps, currentIndex, onStepClick }: Props) {
  return (
    <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(240,237,232,0.06)',
      display: 'flex', gap: 3, flexShrink: 0 }}>
      {steps.map((step, i) => {
        const done     = i < currentIndex;
        const active   = i === currentIndex;
        const pending  = i > currentIndex;
        const clickable = done && !!onStepClick;

        return (
          <div
            key={step.id}
            onClick={clickable ? () => onStepClick!(step.id, i) : undefined}
            title={clickable ? `↩ ${step.label}` : undefined}
            style={{
              flex: 1, textAlign: 'center',
              cursor: clickable ? 'pointer' : 'default',
              borderRadius: 6, padding: '3px 1px',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative',
            } as React.CSSProperties}
          >
            {/* Barre colorée */}
            <div style={{
              height: 3, borderRadius: 2, marginBottom: 5,
              transition: 'background 0.3s',
              background: done ? '#22c55e' : active ? 'var(--boom)' : 'rgba(240,237,232,0.1)',
            }}/>

            {/* Icône */}
            <div style={{
              fontSize: active ? 15 : 13,
              marginBottom: 2,
              opacity: pending ? 0.25 : 1,
            }}>
              {step.icon}
            </div>

            {/* Label */}
            <div style={{
              fontSize: 8, letterSpacing: 0.8,
              textTransform: 'uppercase', fontFamily: 'monospace',
              opacity: active ? 1 : pending ? 0.2 : 0.55,
              color: active ? 'var(--boom)' : done ? '#22c55e' : 'var(--text)',
              fontWeight: active ? 700 : done ? 600 : 400,
            }}>
              {step.label}
            </div>

            {/* Dot indicateur de navigation retour */}
            {clickable && (
              <div style={{
                width: 4, height: 4, borderRadius: '50%',
                background: '#22c55e',
                margin: '2px auto 0',
                opacity: 0.7,
              }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}
