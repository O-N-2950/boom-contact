/**
 * boom.contact — CoherenceScore
 * Détecte les contradictions entre conducteur A et B avant signature
 * Appel Claude API côté client — analyse rapide des circonstances et zones
 */
import { useState, useEffect } from 'react';

interface Props {
  sessionId: string;
  participantA: any;
  participantB: any;
  accidentData: any;
  onReady?: () => void; // appelé quand l'analyse est terminée
}

interface Issue {
  type: 'warning' | 'info';
  message: string;
}

export function CoherenceScore({ sessionId, participantA, participantB, accidentData, onReady }: Props) {
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

        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const raw = data.content?.[0]?.text || '{"issues":[]}';
          const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
          const aiIssues: Issue[] = (parsed.issues || []).slice(0, 3);
          // Dédupliquer avec les issues locales
          for (const ai of aiIssues) {
            if (!found.some(f => f.message === ai.message)) {
              found.push(ai);
            }
          }
        }
      } catch {
        // IA indispo — on garde les issues locales
      }
    }

    setIssues(found);
    setDone(true);
    setLoading(false);
    onReady?.();
  };

  if (loading) {
    return (
      <div style={{
        margin: '0 20px 14px', padding: '12px 16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 16, opacity: 0.5 }}>🔍</span>
        <span style={{ fontSize: 12, opacity: 0.5 }}>Vérification de la cohérence des déclarations…</span>
      </div>
    );
  }

  if (!done) return null;

  // Tout est OK
  if (issues.length === 0) {
    return (
      <div style={{
        margin: '0 20px 14px', padding: '11px 16px',
        background: 'rgba(34,197,94,0.07)',
        border: '1px solid rgba(34,197,94,0.25)',
        borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 16 }}>✅</span>
        <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
          Déclarations cohérentes — aucune contradiction détectée
        </span>
      </div>
    );
  }

  const warnings = issues.filter(i => i.type === 'warning');
  const infos = issues.filter(i => i.type === 'info');
  const hasWarnings = warnings.length > 0;

  return (
    <div style={{
      margin: '0 20px 14px',
      border: `1px solid ${hasWarnings ? 'rgba(245,158,11,0.35)' : 'rgba(99,102,241,0.25)'}`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          padding: '11px 14px',
          background: hasWarnings ? 'rgba(245,158,11,0.08)' : 'rgba(99,102,241,0.06)',
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 16 }}>{hasWarnings ? '⚠️' : 'ℹ️'}</span>
        <span style={{ fontSize: 12, fontWeight: 700, flex: 1, color: hasWarnings ? '#f59e0b' : '#818cf8' }}>
          {hasWarnings
            ? `${warnings.length} point${warnings.length > 1 ? 's' : ''} à vérifier avant de signer`
            : `${infos.length} suggestion${infos.length > 1 ? 's' : ''}`}
        </span>
        <span style={{ fontSize: 14, opacity: 0.4, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>›</span>
      </div>

      {/* Détail */}
      {expanded && (
        <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {issues.map((issue, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                {issue.type === 'warning' ? '⚠️' : 'ℹ️'}
              </span>
              <span style={{
                fontSize: 12, lineHeight: 1.5,
                color: issue.type === 'warning' ? 'rgba(245,158,11,0.9)' : 'rgba(240,237,232,0.65)',
              }}>
                {issue.message}
              </span>
            </div>
          ))}
          <div style={{ fontSize: 11, opacity: 0.35, marginTop: 4 }}>
            Ces points ne bloquent pas la signature — ils vous alertent pour que vous puissiez vérifier.
          </div>
        </div>
      )}
    </div>
  );
}
