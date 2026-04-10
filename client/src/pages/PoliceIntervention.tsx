// client/src/pages/PoliceIntervention.tsx
// Flow complet d'intervention police apres scan QR
// Mobile-first, fond sombre, accent bleu police (#2563EB)

import { useState, useEffect, useCallback, useRef } from 'react';
import { trpc } from '../trpc';
import { io, Socket } from 'socket.io-client';
import { InfractionForm, type Infraction } from '../components/police/InfractionForm';
import { DriverStateForm, type DriverState } from '../components/police/DriverStateForm';
import { ConditionsForm, type Conditions } from '../components/police/ConditionsForm';
import { WitnessForm, type Witness } from '../components/police/WitnessForm';
import { PoliceObservations } from '../components/police/PoliceObservations';
import { PolicePhotoCapture, type PolicePhoto } from '../components/police/PolicePhotoCapture';
import { ConstatDataView } from '../components/police/ConstatDataView';

type InterventionTab = 'constat' | 'infractions' | 'drivers' | 'conditions' | 'witnesses' | 'observations' | 'photos';

interface Props {
  sessionId: string;
  token: string;
  agent: {
    id: string;
    firstName: string;
    lastName: string;
    badgeNumber?: string;
    role: string;
    station: { id: string; name: string; canton?: string; country?: string } | null;
  };
  onBack: () => void;
  onLogout: () => void;
}

const TABS: { id: InterventionTab; label: string }[] = [
  { id: 'constat', label: 'Constat' },
  { id: 'infractions', label: 'Infractions' },
  { id: 'drivers', label: 'Conducteurs' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'witnesses', label: 'Temoins' },
  { id: 'observations', label: 'Observations' },
  { id: 'photos', label: 'Photos' },
];

export function PoliceIntervention({ sessionId, token, agent, onBack, onLogout }: Props) {
  const [tab, setTab] = useState<InterventionTab>('constat');
  const [sessionData, setSessionData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  // Form state
  const [infractions, setInfractions] = useState<Infraction[]>([]);
  const [driverStates, setDriverStates] = useState<DriverState[]>([]);
  const [conditions, setConditions] = useState<Conditions>({
    weather: 'clear',
    visibility: 'good',
    roadState: 'dry',
    signage: 'compliant',
  });
  const [witnesses, setWitnesses] = useState<Witness[]>([]);
  const [observations, setObservations] = useState('');
  const [responsibilityEstimate, setResponsibilityEstimate] = useState('');
  const [policePhotos, setPolicePhotos] = useState<PolicePhoto[]>([]);

  const socketRef = useRef<Socket | null>(null);

  // Load session data via tRPC
  const sessionQuery = trpc.police.getFullSession.useQuery(
    { token, sessionId },
    { enabled: !!sessionId && !!token, retry: 1 }
  );

  // Load existing intervention data
  const interventionQuery = trpc.police.getIntervention.useQuery(
    { token, sessionId },
    { enabled: !!sessionId && !!token, retry: 1 }
  );

  // Mutations
  const joinMut = trpc.police.joinIntervention.useMutation();
  const saveMut = trpc.police.saveIntervention.useMutation();
  const reportMut = trpc.police.generateReport.useMutation();

  // Initialize: join intervention + load data
  useEffect(() => {
    if (sessionQuery.data) {
      setSessionData(sessionQuery.data.session);
      setLoading(false);
    }
    if (sessionQuery.error) {
      setError('Impossible de charger la session');
      setLoading(false);
    }
  }, [sessionQuery.data, sessionQuery.error]);

  // Populate form from existing intervention
  useEffect(() => {
    const intv = interventionQuery.data;
    if (intv) {
      if (intv.infractions) setInfractions(intv.infractions as unknown as Infraction[]);
      if (intv.driverStates) setDriverStates(intv.driverStates as unknown as DriverState[]);
      if (intv.conditions) setConditions(intv.conditions as unknown as Conditions);
      if (intv.witnesses) setWitnesses(intv.witnesses as unknown as Witness[]);
      if (intv.observations) setObservations(intv.observations as string);
      if (intv.responsibilityEstimate) setResponsibilityEstimate(intv.responsibilityEstimate as string);
      if (intv.policePhotos) setPolicePhotos(intv.policePhotos as unknown as PolicePhoto[]);
    }
  }, [interventionQuery.data]);

  // Join intervention on mount
  useEffect(() => {
    if (sessionId && token) {
      joinMut.mutate({ token, sessionId });
    }
  }, [sessionId, token]);

  // Socket.io connection for real-time updates
  useEffect(() => {
    if (!sessionId || !token) return;

    const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('police-join-session', { sessionId, policeToken: token });
    });

    // Listen for driver data updates
    socket.on('data-updated', ({ role, data }: { role: string; data: Record<string, unknown> }) => {
      setSessionData((prev: Record<string, unknown> | null) => {
        if (!prev) return prev;
        const key = `participant${role}`;
        return { ...prev, [key]: { ...(prev[key] || {}), ...data } };
      });
    });

    socket.on('participant-joined', () => {
      // Refresh session data
      sessionQuery.refetch();
    });

    return () => {
      if (socket.connected) {
        socket.emit('police-leave-session', { sessionId });
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, token]);

  // Save intervention
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await saveMut.mutateAsync({
        token,
        sessionId,
        data: {
          infractions: infractions.map(i => ({
            code: i.code,
            description: i.description + (i.details ? ` (${i.details})` : ''),
            party: i.party,
          })),
          driverStates,
          conditions,
          witnesses,
          observations,
          responsibilityEstimate: (responsibilityEstimate || undefined) as 'A_responsible' | 'B_responsible' | 'shared' | 'undetermined' | undefined,
          policePhotos,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }, [token, sessionId, infractions, driverStates, conditions, witnesses, observations, responsibilityEstimate, policePhotos, saveMut]);

  // Generate PDF report
  const handleGenerateReport = useCallback(async () => {
    setGenerating(true);
    setError('');
    try {
      // Save first
      await handleSave();
      const result = await reportMut.mutateAsync({ token, sessionId });
      // Download PDF
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${result.pdfBase64}`;
      link.download = result.filename;
      link.click();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la generation du rapport');
    } finally {
      setGenerating(false);
    }
  }, [token, sessionId, handleSave, reportMut]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06060C] flex items-center justify-center" role="status" aria-label="Chargement">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06060C] text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0a14]/95 backdrop-blur border-b border-white/25">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-white/60 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Retour au dashboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-sm font-semibold text-blue-400">Intervention Police</h1>
              <p className="text-[10px] text-white/55">Session {sessionId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/55 hidden sm:block">
              {agent.firstName} {agent.lastName}
            </span>
            <button
              onClick={onLogout}
              className="text-xs text-white/55 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Deconnexion"
            >
              Quitter
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="max-w-4xl mx-auto px-4 overflow-x-auto">
          <nav className="flex gap-1 pb-2" role="tablist" aria-label="Sections du rapport">
            {TABS.map(t => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`tabpanel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors min-h-[44px] ${
                  tab === t.id
                    ? 'bg-blue-600 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {t.label}
                {t.id === 'infractions' && infractions.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-400/20 text-blue-300 text-[10px]">
                    {infractions.length}
                  </span>
                )}
                {t.id === 'witnesses' && witnesses.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-400/20 text-blue-300 text-[10px]">
                    {witnesses.length}
                  </span>
                )}
                {t.id === 'photos' && policePhotos.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-400/20 text-blue-300 text-[10px]">
                    {policePhotos.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-32">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300" role="alert">
            {error}
          </div>
        )}

        {tab === 'constat' && sessionData && (
          <div id="tabpanel-constat" role="tabpanel" aria-labelledby="tab-constat">
            <ConstatDataView
              accident={sessionData.accident as any}
              participantA={sessionData.participantA as any}
              participantB={sessionData.participantB as any}
              vehicleCount={sessionData.vehicleCount as any}
            />
          </div>
        )}

        {tab === 'infractions' && (
          <div id="tabpanel-infractions" role="tabpanel" aria-labelledby="tab-infractions">
            <InfractionForm infractions={infractions} onChange={setInfractions} />
          </div>
        )}

        {tab === 'drivers' && (
          <div id="tabpanel-drivers" role="tabpanel" aria-labelledby="tab-drivers">
            <DriverStateForm driverStates={driverStates} onChange={setDriverStates} />
          </div>
        )}

        {tab === 'conditions' && (
          <div id="tabpanel-conditions" role="tabpanel" aria-labelledby="tab-conditions">
            <ConditionsForm conditions={conditions} onChange={setConditions} />
          </div>
        )}

        {tab === 'witnesses' && (
          <div id="tabpanel-witnesses" role="tabpanel" aria-labelledby="tab-witnesses">
            <WitnessForm witnesses={witnesses} onChange={setWitnesses} />
          </div>
        )}

        {tab === 'observations' && (
          <div id="tabpanel-observations" role="tabpanel" aria-labelledby="tab-observations">
            <PoliceObservations
              observations={observations}
              responsibilityEstimate={responsibilityEstimate}
              onObservationsChange={setObservations}
              onResponsibilityChange={setResponsibilityEstimate}
            />
          </div>
        )}

        {tab === 'photos' && (
          <div id="tabpanel-photos" role="tabpanel" aria-labelledby="tab-photos">
            <PolicePhotoCapture photos={policePhotos} onChange={setPolicePhotos} />
          </div>
        )}
      </main>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#0a0a14]/95 backdrop-blur border-t border-white/25">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors min-h-[44px]"
          >
            {saving ? 'Sauvegarde...' : saved ? 'Sauvegarde !' : 'Sauvegarder'}
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="px-4 py-3 bg-white/10 hover:bg-white/15 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors min-h-[44px]"
          >
            {generating ? 'Generation...' : 'Rapport PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
