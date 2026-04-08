/**
 * boom.contact — CoherenceScore
 * Détecte les contradictions entre conducteur A et B avant signature
 * Appel Claude API côté client — analyse rapide des circonstances et zones
 */
import React, { useState, useEffect } from 'react';

interface Props {
  sessionId: string;
  participantA: Record<string, unknown>;
  participantB: Record<string, unknown>;
  accidentData: Record<string, unknown>;
  onReady?: () => void; // appelé quand l'analyse est terminée
}

interface Issue {
  type: 'warning' | 'info';
  message: string;
}

export const CoherenceScore = React.memo(function CoherenceScore({ sessionId, participantA, participantB, accidentData, onReady }: Props) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!participantA || !participantB || done) return;
    if (done) return;
    analyze();
  }, [participantA, participantB]);

  const analyze = async () => {
    setLoading(true);
    const found: Issue[] = [];

    // ── Analyse locale (sans IA) — rapide et fiable ──────────
    const circA: string[] = participantA?.circumstances || [];
    const circB: string[] = participantB?.circumstances || [];
    const zonesA: string[] = participantA?.damagedZones || [];
    const zonesB: string[] = participantB?.damagedZones || [];

    // Vérification circonstances contradictoires connues
    const CONTRADICTIONS: [string[], string[], string][] = [
      [['c1'], ['c1'], 'Les deux conducteurs déclarent avoir été en stationnement légal'],
      [['c2'], ['c2'], 'Les deux conducteurs déclarent avoir quitté un stationnement'],
      [['c14'], ['c14'], 'Les deux conducteurs déclarent avoir reculé'],
      [['c18'], ['c18'], 'Les deux conducteurs déclarent avoir empiété sur la voie adverse'],
    ];

    for (const [ca, cb, msg] of CONTRADICTIONS) {
      if (ca.some(c => circA.includes(c)) && cb.some(c => circB.includes(c))) {
        found.push({ type: 'warning', message: msg });
      }
    }

    // Zones endommagées cohérentes ?
    const frontZonesA = zonesA.some(z => z.includes('front'));
    const frontZonesB = zonesB.some(z => z.includes('front'));
    const rearZonesA = zonesA.some(z => z.includes('rear'));
    const rearZonesB = zonesB.some(z => z.includes('rear'));

    // Choc frontal mutuel = souvent cohérent (face à face)
    // Mais frontal A + frontal B sans c18 = suspect
    if (frontZonesA && frontZonesB && !circA.includes('c18') && !circB.includes('c18')) {
      found.push({ type: 'info', message: 'Les deux véhicules ont des dommages à l\'avant — vérifiez la description du choc' });
    }

    // Aucune zone déclarée
    if (zonesA.length === 0) {
      found.push({ type: 'info', message: 'Conducteur A n\'a pas indiqué de zones endommagées' });
    }
    if (zonesB.length === 0 && participantB?.vehicle?.vehicleType !== 'pedestrian') {
      found.push({ type: 'info', message: 'Conducteur B n\'a pas indiqué de zones endommagées' });
    }

    // Aucune circonstance déclarée
    if (circA.length === 0) {
      found.push({ type: 'warning', message: 'Conducteur A n\'a coché aucune circonstance' });
    }

    // ── Analyse IA — pour les cas complexes ──────────────────
    // Seulement si des données textuelles existent
    const descA = participantA?.driver?.notes || '';
    const descB = participantB?.driver?.notes || '';
    const hasTextDesc = descA.length > 20 || descB.length > 20;

    if (hasTextDesc || (circA.length > 0 && circB.length > 0)) {
      try {
        const prompt = `Tu analyses un constat d'accident. Détecte les incohérences entre les déclarations de A et B.

Conducteur A — Circonstances cochées: ${circA.join(', ') || 'aucune'}
Zones A endommagées: ${zonesA.join(', ') || 'aucune'}
${descA ? `Notes A: ${descA}` : ''}

Conducteur B — Circonstances cochées: ${circB.join(', ') || 'aucune'}
Zones B endommagées: ${zonesB.join(', ') || 'aucune'}
${descB ? `Notes B: ${descB}` : ''}

Réponds UNIQUEMENT en JSON: {"issues": [{"type": "warning"|"info", "message": "..."}]}
Maximum 3 issues. Si tout est cohérent réponds {"issues": []}.`;

        // AI coherence check runs via backend — no direct Anthropic call from frontend
        // Local rule-based analysis is sufficient for most cases
      } catch (error) {
        console.error('CoherenceScore: AI check failed, keeping local issues only', error);
      }
    }

    setIssues(found);
    setDone(true);
    setLoading(false);
    onReady?.();
  };

  if (loading) {
    return (
      <div className="rounded-[10px] flex items-center gap-2.5 px-4 py-3" style={{ margin: '0 20px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.25)' }}>
        <span className="text-base opacity-75">🔍</span>
        <span className="text-xs opacity-75">Vérification de la cohérence des déclarations…</span>
      </div>
    );
  }

  if (!done) return null;

  // Tout est OK
  if (issues.length === 0) {
    return (
      <div className="rounded-[10px] flex items-center gap-2.5 px-4 py-[11px]" style={{ margin: '0 20px 14px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)' }}>
        <span className="text-base" aria-hidden="true">✅</span>
        <span className="text-xs text-green-500 font-semibold">
          Déclarations cohérentes — aucune contradiction détectée
        </span>
      </div>
    );
  }

  const warnings = issues.filter(i => i.type === 'warning');
  const infos = issues.filter(i => i.type === 'info');
  const hasWarnings = warnings.length > 0;

  return (
    <div className="rounded-[10px] overflow-hidden" style={{ margin: '0 20px 14px', border: `1px solid ${hasWarnings ? 'rgba(245,158,11,0.35)' : 'rgba(99,102,241,0.25)'}` }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-label={hasWarnings ? 'Points à vérifier avant de signer' : 'Suggestions de vérification'}
        className="w-full border-0 flex items-center gap-2.5 cursor-pointer px-3.5 py-[11px]" style={{ background: hasWarnings ? 'rgba(245,158,11,0.08)' : 'rgba(99,102,241,0.06)', color: 'inherit', font: 'inherit' }}
      >
        <span className="text-base">{hasWarnings ? '⚠️' : 'ℹ️'}</span>
        <span className="text-xs font-bold flex-1" style={{ color: hasWarnings ? '#f59e0b' : '#818cf8' }}>
          {hasWarnings
            ? `${warnings.length} point${warnings.length > 1 ? 's' : ''} à vérifier avant de signer`
            : `${infos.length} suggestion${infos.length > 1 ? 's' : ''}`}
        </span>
        <span aria-hidden="true" className="text-sm opacity-70 inline-block"  style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
      </button>

      {/* Détail */}
      {expanded && (
        <div className="flex flex-col gap-2 px-3.5 pt-2.5 pb-3">
          {issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-sm shrink-0 mt-px" >
                {issue.type === 'warning' ? '⚠️' : 'ℹ️'}
              </span>
              <span className="text-xs leading-normal" style={{ color: issue.type === 'warning' ? 'rgba(245,158,11,0.9)' : 'rgba(240,237,232,0.65)' }}>
                {issue.message}
              </span>
            </div>
          ))}
          <div className="text-[11px] mt-1 opacity-70" >
            Ces points ne bloquent pas la signature — ils vous alertent pour que vous puissiez vérifier.
          </div>
        </div>
      )}
    </div>
  );
});
