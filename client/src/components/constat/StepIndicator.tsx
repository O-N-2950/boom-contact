import React from 'react';

interface Step { id: string; icon: string; label: string; }
interface Props {
  steps: Step[];
  currentIndex: number;
  onStepClick?: (stepId: string, index: number) => void;
}

export const StepIndicator = React.memo(function StepIndicator({ steps, currentIndex, onStepClick }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Étapes du constat"
      className="flex gap-[3px] shrink-0 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(240,237,232,0.06)' }}>
      {steps.map((step, i) => {
        const done     = i < currentIndex;
        const active   = i === currentIndex;
        const pending  = i > currentIndex;
        const clickable = done && !!onStepClick;

        return (
          <button
            key={step.id}
            id={`tab-${step.id}`}
            role="tab"
            aria-selected={active}
            aria-controls={`tabpanel-${step.id}`}
            onClick={clickable ? () => onStepClick!(step.id, i) : undefined}
            title={clickable ? `↩ ${step.label}` : undefined}
            disabled={!clickable}
            className="flex-1 text-center rounded-md min-h-[44px] min-w-[44px] relative bg-none border-0 px-px py-[3px]" style={{ cursor: clickable ? 'pointer' : 'default', WebkitTapHighlightColor: 'transparent', font: 'inherit', } as React.CSSPropertie }}}
          >
            {/* Barre colorée */}
            <div className="h-[3px] rounded-sm mb-[5px]" style={{ transition: 'background 0.3s', background: done ? '#22c55e' : active ? 'var(--boom)' : 'rgba(240,237,232,0.1)' }}/>

            {/* Icône */}
            <div className="mb-0.5" style={{ fontSize: active ? 15 : 13, opacity: pending ? 0.75 : 1 }}>
              {step.icon}
            </div>

            {/* Label */}
            <div className="uppercase tracking-[0.8px] text-[8px]" style={{ fontFamily: 'monospace', opacity: active ? 1 : pending ? 0.75 : 0.85, color: active ? 'var(--boom)' : done ? '#22c55e' : 'var(--text)', fontWeight: active ? 700 : done ? 600 : 400 }}>
              {step.label}
            </div>

            {/* Dot indicateur de navigation retour */}
            {clickable && (
              <div className="w-1 h-1 rounded-full opacity-70 bg-[#22c55e]" style={{ margin: '2px auto 0' }}/>
            )}
          </button>
        );
      })}
    </div>
  );
});
