interface Step { id: string; icon: string; label: string; }
interface Props { steps: Step[]; currentIndex: number; }

export function StepIndicator({ steps, currentIndex }: Props) {
  return (
    <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(240,237,232,0.06)',
      display: 'flex', gap: 4, flexShrink: 0 }}>
      {steps.map((step, i) => {
        const done    = i < currentIndex;
        const active  = i === currentIndex;
        const pending = i > currentIndex;
        return (
          <div key={step.id} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: 3, borderRadius: 2, marginBottom: 6, transition: 'background 0.3s',
              background: done ? '#22c55e' : active ? 'var(--boom)' : 'rgba(240,237,232,0.1)' }}/>
            <div style={{ fontSize: 14, marginBottom: 2 }}>{step.icon}</div>
            <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'monospace',
              opacity: active ? 1 : pending ? 0.25 : 0.5,
              color: active ? 'var(--boom)' : done ? '#22c55e' : 'var(--text)' }}>
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
