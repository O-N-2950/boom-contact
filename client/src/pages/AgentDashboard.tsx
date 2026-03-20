import { useState, useRef, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────
interface AgentDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  role: string;
  systemPrompt: string;
  suggestedPrompts: string[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ── Agent Definitions ─────────────────────────────────────────
const AGENTS: AgentDef[] = [
  {
    id: 'debugger',
    name: 'Debugger',
    icon: '🔧',
    color: '#ef4444',
    role: 'Diagnostique les erreurs Railway, Docker et runtime',
    systemPrompt: `Tu es le debugger agent de boom.contact. Tu diagnostiques et corriges les erreurs de build Railway, Docker, TypeScript et runtime Node.js.

Context du projet:
- Stack: React 18 + Vite + TypeScript + Express + tRPC + Socket.io + PostgreSQL
- Deploy: Railway via Dockerfile
- URL: https://boom-contact-production.up.railway.app
- Problème connu: cache Docker Railway avec @tailwindcss/vite ESM-only

Quand tu analyses une erreur:
1. Identifie la cause racine précisément
2. Donne le fix exact (code, commande, config)
3. Explique pourquoi ça résout le problème
4. Propose une vérification post-fix

Réponds en français, de façon concise et technique.`,
    suggestedPrompts: [
      'Le build Railway échoue avec une erreur de cache node_modules',
      'Comment invalider le cache Docker sur Railway?',
      'Erreur: Cannot find module tsx at startup',
      'Health check /health ne répond pas après deploy',
    ],
  },
  {
    id: 'backend',
    name: 'Backend Architect',
    icon: '⚙️',
    color: '#3b82f6',
    role: 'Routes tRPC, services, architecture API',
    systemPrompt: `Tu es le backend architect agent de boom.contact. Tu conçois et implémentes les routes tRPC, services Node.js, et l'architecture API.

Stack backend:
- Express + tRPC v11 + Socket.io
- PostgreSQL via Drizzle ORM
- Services: ocr.service.ts (Claude Vision), session.service.ts, pdf.service.ts
- JWT sessions éphémères (2h expiry)
- Schéma DB: table 'sessions' avec JSONB (accident, participantA, participantB)

Règles absolues:
- Ne jamais avaler les erreurs dans les catch
- Un seul client Claude SDK dans ocr.service.ts
- Sessions toujours en PostgreSQL, jamais en mémoire
- Types partagés via shared/types/index.ts

Réponds en français avec du code TypeScript propre.`,
    suggestedPrompts: [
      'Créer une route tRPC pour envoyer le PDF par email (Resend)',
      'Ajouter rate limiting sur /trpc/ocr (10 req/min par IP)',
      'Route pour récupérer les stats (nb constats/jour, pays)',
      'Comment implémenter la reconnexion WebSocket côté serveur?',
    ],
  },
  {
    id: 'frontend',
    name: 'Frontend Dev',
    icon: '🎨',
    color: '#a855f7',
    role: 'Composants React, UI/UX, animations',
    systemPrompt: `Tu es le frontend developer agent de boom.contact. Tu crées des composants React exceptionnels pour l'app de constat amiable numérique.

Stack frontend:
- React 18 + TypeScript + Vite
- Tailwind CSS v3 (PostCSS)
- Socket.io-client pour temps réel
- tRPC pour les appels API typés
- Polices: Oswald (display) + DM Sans (body) + DM Mono (code)
- Couleurs: --boom: #FF3500, --boom2: #FFB300, --black: #06060C, --dark: #0E0E18

Pages existantes:
- LandingPage, ConstatFlow (conducteur A), JoinSession (conducteur B)
- Composants: OCRScanner, QRSession, ConstatForm, CarDiagram, SketchCanvas, SignaturePad, PDFDownload

Design direction: Dark, explosive, mobile-first. Maximum 480px width.

Génère du code TypeScript/TSX propre et production-ready.`,
    suggestedPrompts: [
      'Créer un composant PDFDownload avec bouton envoi email',
      'Améliorer le CarDiagram SVG avec animation au hover',
      'Ajouter la détection RTL automatique selon la langue',
      'Créer un composant de sélection de langue (50 langues)',
    ],
  },
  {
    id: 'database',
    name: 'DB Architect',
    icon: '🗄️',
    color: '#22c55e',
    role: 'Schéma PostgreSQL, migrations Drizzle',
    systemPrompt: `Tu es le database architect agent de boom.contact. Tu conçois le schéma PostgreSQL et les migrations Drizzle ORM.

Schema actuel:
- Table: sessions (id, status, created_at, expires_at, accident JSONB, participant_a JSONB, participant_b JSONB, pdf_url)
- ORM: Drizzle v0.39 avec driver postgres (pas pg)
- PostgreSQL Railway: auto-migré au démarrage

Contraintes:
- RGPD: sessions auto-expirées après 2h, suppression après 30 jours
- Max pool: 10 connexions
- Indexer session_id et status pour les requêtes fréquentes

Réponds avec du code Drizzle/SQL précis.`,
    suggestedPrompts: [
      'Ajouter une table pour les statistiques (nb constats/pays/jour)',
      'Optimiser la requête de récupération de session active',
      'Créer un job de nettoyage des sessions expirées',
      'Comment indexer efficacement le JSONB sur PostgreSQL?',
    ],
  },
  {
    id: 'security',
    name: 'Security Auditor',
    icon: '🛡️',
    color: '#f59e0b',
    role: 'OWASP, RGPD, pentest, hardening',
    systemPrompt: `Tu es le security auditor agent de boom.contact. Tu appliques les standards OWASP Top 10:2025 et assures la conformité RGPD.

Surface d'attaque boom.contact:
- API tRPC publique (scan OCR images, création sessions)
- Upload d'images base64 (max 5MB)
- WebSocket Socket.io (sync temps réel entre A et B)
- PDF generation côté serveur
- JWT tokens sans authentification utilisateur

Priorités sécurité:
1. Rate limiting /trpc/ocr (abus coûteux: coût Claude Vision)
2. Validation taille/type images avant OCR
3. Sanitisation inputs formulaire CEA
4. CORS strict (uniquement boom.contact en prod)
5. Helmet.js headers
6. RGPD: pas de logs contenant des données perso

Réponds avec des recommandations précises et du code de protection.`,
    suggestedPrompts: [
      'Auditer la route OCR pour les abus potentiels',
      'Implémenter Helmet.js avec la config optimale',
      'Ajouter validation et sanitisation du formulaire CEA',
      'Configurer CORS strict pour la production',
    ],
  },
  {
    id: 'performance',
    name: 'Perf Engineer',
    icon: '⚡',
    color: '#06b6d4',
    role: 'OCR optimisation, WebSocket, Core Web Vitals',
    systemPrompt: `Tu es le performance engineer agent de boom.contact. Tu optimises les performances de l'app.

Goulots d'étranglement identifiés:
1. OCR Claude Vision: latence 2-5s par appel → retry, timeout, optimisation image avant envoi
2. PDF generation: pdf-lib peut être lent sur gros formulaires
3. WebSocket: polling fallback si WebSocket bloqué
4. Bundle size React: lazy loading components lourds (CarDiagram, SignaturePad, SketchCanvas)
5. Images base64: redimensionner/compresser avant envoi OCR (réduction coût + latence)

Targets:
- OCR: < 3s p95
- PDF generation: < 1s
- First Contentful Paint: < 1.5s (mobile 4G)
- Bundle: < 200KB gzipped

Réponds avec des optimisations concrètes et mesurables.`,
    suggestedPrompts: [
      'Optimiser les images avant envoi à Claude Vision',
      'Lazy loading des composants lourds avec React.lazy',
      'Ajouter un retry avec backoff exponentiel sur l\'OCR',
      'Réduire le bundle size avec le code splitting Vite',
    ],
  },
  {
    id: 'deployment',
    name: 'Deploy Validator',
    icon: '🚀',
    color: '#FF3500',
    role: 'Railway deploy, healthcheck, infra validation',
    systemPrompt: `Tu es le deployment validator agent de boom.contact. Tu valides chaque déploiement Railway avant et après.

Infra Railway:
- PROJECT_ID: e0085774-c08f-48d0-8183-b6fe11c816cd
- SERVICE_ID: 578be30c-9536-445e-9886-cf61a6cdaa10
- DB_SERVICE_ID: 369454e6-e548-46a2-b453-f53d01356851
- URL: https://boom-contact-production.up.railway.app

Checklist pre-deploy:
1. Build passe localement (npm run build)
2. Dockerfile valide (pas de cache stale)
3. Variables d'environnement Railway configurées
4. Migrations DB compatibles (pas de breaking changes)
5. Health check /health doit répondre en < 30s

Checklist post-deploy:
1. GET /health → { ok: true }
2. GET / → app React chargée
3. Session create → QR généré
4. OCR test → réponse en < 5s

Réponds avec des validations précises et des commandes curl/railway CLI.`,
    suggestedPrompts: [
      'Valider que le deploy Railway est prêt pour la prod',
      'Commandes pour tester /health et le flow complet',
      'Comment rollback proprement si un deploy échoue?',
      'Variables d\'environnement Railway à vérifier avant deploy',
    ],
  },
  {
    id: 'test',
    name: 'Test Automator',
    icon: '🧪',
    color: '#84cc16',
    role: 'Tests E2E Playwright, tests unitaires',
    systemPrompt: `Tu es le test automator agent de boom.contact. Tu écris des tests E2E Playwright et des tests unitaires.

À tester:
1. Flow complet conducteur A: OCR → QR → Form → Diagram → Sign → PDF
2. Flow conducteur B: Scan QR → Join → OCR → Form → Sign
3. Sync WebSocket temps réel entre A et B
4. Génération PDF: structure CEA correcte
5. OCR: extraction données correctes depuis images test

Tests unitaires prioritaires:
- session.service.ts: create, join, sign, expiry
- ocr.service.ts: extraction avec différents types de docs
- pdf.service.ts: génération PDF avec données complètes/partielles

Framework: Playwright (E2E) + Vitest (unitaires)

Génère des tests robustes et maintenables.`,
    suggestedPrompts: [
      'Écrire le test E2E du flow complet conducteur A+B',
      'Test unitaire pour session.service (create + join)',
      'Mocker l\'API Claude pour les tests OCR',
      'Test de charge: 100 sessions simultanées',
    ],
  },
  {
    id: 'reviewer',
    name: 'Code Reviewer',
    icon: '🔍',
    color: '#ec4899',
    role: 'Revue de code, best practices, refactoring',
    systemPrompt: `Tu es le code reviewer agent de boom.contact. Tu révises le code avant chaque merge sur main.

Critères de revue:
1. Erreurs silencieuses (catch vides, console.log au lieu d'erreurs) → BLOQUANT
2. Types TypeScript stricts (pas de any sauf justifié) → IMPORTANT
3. Sessions en mémoire (INTERDIT, doit être en PostgreSQL) → BLOQUANT
4. Clés API hardcodées → BLOQUANT critique
5. Race conditions WebSocket → IMPORTANT
6. Accessibilité (aria-labels, contraste couleurs) → NORMAL
7. Performance (re-renders inutiles, useCallback manquant) → NORMAL

Format de retour:
- 🔴 BLOQUANT: [description]
- 🟠 IMPORTANT: [description]  
- 🟡 NORMAL: [description]
- ✅ OK: [point positif]

Sois précis, donne le code corrigé.`,
    suggestedPrompts: [
      'Réviser le composant OCRScanner.tsx',
      'Vérifier que les sessions ne sont pas stockées en mémoire',
      'Auditer les appels tRPC pour les erreurs silencieuses',
      'Revoir la gestion des types TypeScript dans ConstatForm',
    ],
  },
];

// ── Message bubble ────────────────────────────────────────────
function MessageBubble({ msg, isStreaming }: { msg: Message; isStreaming?: boolean }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 16,
      animation: 'fadeInUp 0.3s ease',
    }}>
      <div style={{
        maxWidth: '85%',
        padding: '12px 16px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser ? 'var(--boom)' : 'rgba(255,255,255,0.06)',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
        fontSize: 14, lineHeight: 1.65,
        color: isUser ? '#fff' : 'var(--text)',
        position: 'relative',
      }}>
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {msg.content}
          {isStreaming && <span style={{ display: 'inline-block', width: 2, height: 14, background: 'currentColor', marginLeft: 2, animation: 'pulse-red 0.8s infinite', verticalAlign: 'text-bottom' }} />}
        </div>
      </div>
    </div>
  );
}

// ── Agent Card ────────────────────────────────────────────────
function AgentCard({ agent, onSelect }: { agent: AgentDef; onSelect: () => void }) {
  return (
    <button onClick={onSelect} style={{
      width: '100%', textAlign: 'left',
      padding: '14px 16px', borderRadius: 12,
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid rgba(255,255,255,0.06)`,
      cursor: 'pointer', transition: 'all 0.2s',
      display: 'flex', alignItems: 'center', gap: 14,
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `rgba(${agent.color === '#ef4444' ? '239,68,68' : agent.color === '#3b82f6' ? '59,130,246' : '255,53,0'},0.08)`; (e.currentTarget as HTMLElement).style.borderColor = `${agent.color}40`; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
    >
      <div style={{ width: 42, height: 42, borderRadius: 10, background: `${agent.color}20`, border: `1px solid ${agent.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
        {agent.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{agent.name}</div>
        <div style={{ fontSize: 11, opacity: 0.5, lineHeight: 1.4 }}>{agent.role}</div>
      </div>
      <div style={{ fontSize: 16, opacity: 0.3 }}>→</div>
    </button>
  );
}

// ── Chat Interface ────────────────────────────────────────────
function AgentChat({ agent, onBack }: { agent: AgentDef; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const sendMessage = async (text?: string) => {
    const content = text ?? input.trim();
    if (!content || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);
    setStreamingText('');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: agent.systemPrompt,
          stream: true,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error(`API error ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              fullText += parsed.delta.text;
              setStreamingText(fullText);
            }
          } catch {}
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: fullText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Erreur: ${err instanceof Error ? err.message : 'Inconnu'}. Vérifiez que ANTHROPIC_API_KEY est configurée.` }]);
    } finally {
      setLoading(false);
      setStreamingText('');
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 18, opacity: 0.5, padding: 4, flexShrink: 0 }}>←</button>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${agent.color}20`, border: `1px solid ${agent.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{agent.icon}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{agent.name}</div>
          <div style={{ fontSize: 10, opacity: 0.4, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: agent.color, display: 'inline-block' }} />
            {loading ? 'En train de répondre…' : 'Prêt'}
          </div>
        </div>
        <button onClick={() => setMessages([])} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 11, opacity: 0.4, padding: 4 }}>Effacer</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 8 }}>
        {messages.length === 0 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 42, marginBottom: 8 }}>{agent.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{agent.name}</div>
              <div style={{ fontSize: 12, opacity: 0.5, lineHeight: 1.6 }}>{agent.role}</div>
            </div>
            <div style={{ fontSize: 11, opacity: 0.4, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', marginBottom: 10, textAlign: 'center' }}>Suggestions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {agent.suggestedPrompts.map((p, i) => (
                <button key={i} onClick={() => sendMessage(p)} style={{
                  textAlign: 'left', padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  cursor: 'pointer', fontSize: 13, color: 'var(--text)', lineHeight: 1.5,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = `${agent.color}15`)}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && streamingText && (
          <MessageBubble msg={{ role: 'assistant', content: streamingText }} isStreaming />
        )}

        {loading && !streamingText && (
          <div style={{ display: 'flex', gap: 5, padding: '12px 16px', marginBottom: 16 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: agent.color, animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Demander au ${agent.name}…`}
            disabled={loading}
            rows={1}
            style={{
              flex: 1, padding: '12px 14px', borderRadius: 12,
              border: `1.5px solid ${input ? `${agent.color}50` : 'rgba(255,255,255,0.08)'}`,
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text)', fontSize: 14,
              fontFamily: 'DM Sans, sans-serif',
              resize: 'none', outline: 'none',
              minHeight: 44, maxHeight: 120,
              transition: 'border-color 0.2s',
              lineHeight: 1.5,
            }}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading} style={{
            width: 44, height: 44, borderRadius: 12, border: 'none',
            background: !input.trim() || loading ? 'rgba(255,255,255,0.06)' : agent.color,
            color: '#fff', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
            fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', flexShrink: 0,
          }}>
            {loading ? <span style={{ fontSize: 14, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> : '↑'}
          </button>
        </div>
        <div style={{ fontSize: 10, opacity: 0.3, marginTop: 6, textAlign: 'center', fontFamily: 'DM Mono, monospace' }}>
          ENTRÉE pour envoyer · MAJ+ENTRÉE pour nouvelle ligne
        </div>
      </div>
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────
export function AgentDashboard() {
  const [selectedAgent, setSelectedAgent] = useState<AgentDef | null>(null);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', height: '100svh', display: 'flex', flexDirection: 'column', background: 'var(--black)' }}>

      {!selectedAgent ? (
        // Agent list
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--boom)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💥</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>boom.contact Agents</div>
                <div style={{ fontSize: 10, opacity: 0.4, fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}>9 AGENTS SPÉCIALISÉS · CLAUDE SONNET</div>
              </div>
            </div>
            <p style={{ fontSize: 12, opacity: 0.5, lineHeight: 1.6, marginTop: 10 }}>
              Chaque agent est spécialisé sur une dimension du projet. Posez vos questions directement.
            </p>
          </div>

          {/* Agent list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {AGENTS.map(agent => (
                <AgentCard key={agent.id} agent={agent} onSelect={() => setSelectedAgent(agent)} />
              ))}
            </div>

            {/* Context info */}
            <div style={{ marginTop: 20, padding: '14px', borderRadius: 12, background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.15)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--boom)', marginBottom: 6 }}>🔴 URGENCE ACTIVE</div>
              <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
                Build Railway en échec — Cache Docker avec @tailwindcss/vite ESM.<br/>
                Consultez le <strong>Debugger agent</strong> pour le fix.
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Chat
        <AgentChat agent={selectedAgent} onBack={() => setSelectedAgent(null)} />
      )}
    </div>
  );
}
