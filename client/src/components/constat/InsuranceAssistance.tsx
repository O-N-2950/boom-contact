import React, { useState, useEffect } from 'react';
import { trpc } from '../../trpc';

interface InsuranceAssistanceProps {
  insurerA?: string;  // From OCR participant A
  insurerB?: string;  // From OCR participant B
  countryCode?: string;
}

interface AssistanceResult {
  insurer: string;
  assistanceNumber?: string;
  claimsNumber?: string;
  website?: string;
  note?: string;
  source: 'db' | 'ai' | 'not_found';
  confidence: 'high' | 'medium' | 'low';
}

export const InsuranceAssistance = React.memo(function InsuranceAssistance({ insurerA, insurerB, countryCode }: InsuranceAssistanceProps) {
  const [resultA, setResultA] = useState<AssistanceResult | null>(null);
  const [resultB, setResultB] = useState<AssistanceResult | null>(null);
  const [loading, setLoading]  = useState(false);
  const [done, setDone]        = useState(false);

  const lookupMut = trpc.emergency.insuranceLookup.useMutation();

  useEffect(() => {
    if (!insurerA && !insurerB) return;
    if (done) return;
    
    setLoading(true);
    lookupMut.mutate(
      { insurerA, insurerB, countryCode },
      {
        onSuccess: (data) => {
          if (data.participantA) setResultA(data.participantA as AssistanceResult);
          if (data.participantB) setResultB(data.participantB as AssistanceResult);
          setDone(true);
          setLoading(false);
        },
        onError: () => setLoading(false),
      }
    );
  }, [insurerA, insurerB]);

  if (!insurerA && !insurerB) return null;

  return (
    <div className="mt-5">
      <div className="text-[#d0d0d0] text-[11px] font-bold mb-2.5 tracking-[1.5px]">
        📞 NUMÉROS D'ASSISTANCE ASSURANCES
      </div>

      {loading && (
        <div className="bg-[#111] rounded-xl p-4 flex items-center gap-3" style={{ border: '1px solid #1a1a1a' }}>
          <div className="rounded-full w-5 h-5"  style={{ border: '2px solid #333', borderTopColor: '#FF3500', animation: 'spin 0.8s linear infinite' }} />
          <div className="text-[#d0d0d0] text-[13px]">Recherche des numéros d'assistance...</div>
        </div>
      )}

      {!loading && (
        <div className="flex flex-col gap-2.5">
          {resultA && <AssistanceCard result={resultA} role="A" />}
          {resultB && <AssistanceCard result={resultB} role="B" />}
        </div>
      )}
    </div>
  );
});

// ── Manual search widget ──────────────────────────────────────

export function InsuranceSearchWidget() {
  const [query, setQuery]   = useState('');
  const [country, setCountry] = useState('CH');
  const [result, setResult]   = useState<AssistanceResult | null>(null);
  const [loading, setLoading] = useState(false);

  const lookupMut = trpc.emergency.singleLookup.useMutation();

  const handleSearch = () => {
    if (!query.trim()) return;
    setLoading(true);
    lookupMut.mutate({ insurer: query.trim(), country }, {
      onSuccess: (data) => { setResult(data as AssistanceResult); setLoading(false); },
      onError: () => setLoading(false),
    });
  };

  return (
    <div className="bg-[#111] rounded-[14px] p-4" style={{ border: '1px solid #1a1a1a' }}>
      <div className="text-white font-bold mb-3 text-sm">
        🔍 Trouver un numéro d'assistance
      </div>
      <div className="flex gap-2 mb-2.5">
        <input
          placeholder="Nom de l'assurance..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          aria-label="Nom de l'assurance"
          className="flex-1 rounded-lg text-white text-sm px-3 py-[9px] bg-[#1a1a1a]" style={{ border: '1px solid #333' }}
        />
        <select value={country} onChange={e => setCountry(e.target.value)}
          aria-label="Sélectionner le pays"
          className="rounded-lg text-[13px] px-2.5 py-[9px] bg-[#1a1a1a] text-[#ccc]" style={{ border: '1px solid #333' }}>
          {['CH','FR','BE','LU','DE','IT','ES','GB','NL','AT','US','CA','AU','NZ','JP','CN','IN','KR','SG','RU','AE','ZA','BR'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={handleSearch} disabled={loading || !query.trim()} className="text-white border-0 rounded-lg font-bold cursor-pointer text-sm px-3.5 py-[9px] bg-[#D42D00]">
          {loading ? '...' : '🔍'}
        </button>
      </div>
      {result && <AssistanceCard result={result} />}
    </div>
  );
}

// ── Card sub-component ────────────────────────────────────────
function AssistanceCard({ result, role }: { result: AssistanceResult; role?: 'A' | 'B' }) {
  const sourceLabel = result.source === 'db' ? '✅ DB' : result.source === 'ai' ? '🤖 IA' : '❓';
  const confidenceColor = result.confidence === 'high' ? '#4ade80' : result.confidence === 'medium' ? '#fbbf24' : '#f87171';

  if (result.source === 'not_found') {
    return (
      <div className="rounded-xl p-3.5 bg-[#1a1010]" style={{ border: '1px solid #3a1a1a' }}>
        {role && <div className="text-[#d0d0d0] text-[11px] mb-1.5">CONDUCTEUR {role}</div>}
        <div className="text-[13px] text-[#f87171]">
          ⚠️ Numéro non trouvé pour <strong>{result.insurer}</strong>
        </div>
        <div className="text-[#d0d0d0] text-xs mt-1">
          Consultez votre police d'assurance ou le site de votre assureur.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-3.5 bg-[#0d1a0d]" style={{ border: '1px solid #1a3a1a' }}>
      {role && (
        <div className="flex justify-between mb-1.5">
          <div className="text-[#d0d0d0] text-[11px] font-bold">CONDUCTEUR {role}</div>
          <div className="flex gap-1.5">
            <span className="text-[#d0d0d0] text-[10px]">{sourceLabel}</span>
            <span className="text-[10px] font-bold" style={{ color: confidenceColor }}>{result.confidence.toUpperCase()}</span>
          </div>
        </div>
      )}

      <div className="text-green-400 font-bold text-[15px] mb-2">
        🛡️ {result.insurer}
      </div>

      {result.assistanceNumber && (
        <a href={`tel:${result.assistanceNumber.replace(/[\s().+]/g, '')}`} className="flex items-center gap-2.5 rounded-lg no-underline mb-1.5 px-3 py-2.5 bg-[#111]" style={{ border: '1px solid #1a3a1a' }}>
          <span className="text-xl">🔧</span>
          <div>
            <div className="text-[#d0d0d0] text-[10px] mb-px" >DÉPANNAGE / ASSISTANCE 24h</div>
            <div className="font-black text-xl tracking-[0.5px] text-[#fbbf24]" style={{ fontFamily: 'monospace' }}>
              {result.assistanceNumber}
            </div>
          </div>
          <span className="text-[#d0d0d0] ml-auto text-lg">📞</span>
        </a>
      )}

      {result.claimsNumber && result.claimsNumber !== result.assistanceNumber && (
        <a href={`tel:${result.claimsNumber.replace(/[\s().+]/g, '')}`} className="flex items-center gap-2.5 rounded-lg no-underline mb-1.5 px-3 py-2 bg-[#111]" style={{ border: '1px solid #1a1a1a' }}>
          <span className="text-lg">📋</span>
          <div>
            <div className="text-[#d0d0d0] text-[10px] mb-px" >DÉCLARATION SINISTRE</div>
            <div className="font-bold text-[#60c8f0] text-[17px]" style={{ fontFamily: 'monospace' }}>
              {result.claimsNumber}
            </div>
          </div>
          <span className="text-[#d0d0d0] ml-auto text-lg">📞</span>
        </a>
      )}

      {result.website && (
        <div className="text-[#d0d0d0] text-xs mt-1">
          🌐 {result.website}
        </div>
      )}
      {result.note && (
        <div className="text-[#d0d0d0] text-[11px] mt-1 italic" >
          {result.note}
        </div>
      )}
    </div>
  );
}
