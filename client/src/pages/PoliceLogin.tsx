// client/src/pages/PoliceLogin.tsx
import { useState } from 'react';
import { trpc } from '../trpc';

interface Props {
  onLogin: (token: string, user: unknown) => void;
}

export function PoliceLogin({ onLogin }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);

  const loginMutation = trpc.police.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('boom_police_token', data.token);
      localStorage.setItem('boom_police_user', JSON.stringify(data.user));
      onLogin(data.token, data.user);
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = () => {
    setError(null);
    if (!email || !password) return setError('Email et mot de passe requis');
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-[#06060C] flex items-center justify-center p-6">
      <div className="w-full max-w-[380px]">

        {/* Header */}
        <div className="text-center mb-9" >
          <div className="text-5xl mb-3">🚔</div>
          <h1 className="text-2xl font-extrabold text-white mb-1.5">Module Police</h1>
          <p className="text-sm" style={{ color: 'rgba(240,237,232,0.75)' }}>boom.contact · Accès institutionnel</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>

          {error && (
            <div id="police-error" role="alert" className="mb-4 rounded-lg text-[13px] text-red-500 px-3.5 py-2.5" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              ⚠️ {error}
            </div>
          )}

          <div className="mb-3.5">
            <label htmlFor="email-police" className="text-[11px] uppercase block mb-1.5 tracking-[1px]" style={{ color: 'rgba(240,237,232,0.75)' }}>
              Email institutionnel
            </label>
            <input
              id="email-police"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="agent@police-jura.ch"
              aria-describedby={error ? "police-error" : undefined}
              className="w-full rounded-[10px] text-white text-[15px] box-border px-3.5 py-3" style={{ border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)' }}
            />
          </div>

          <div className="mb-[22px]">
            <label htmlFor="password-police" className="text-[11px] uppercase block mb-1.5 tracking-[1px]" style={{ color: 'rgba(240,237,232,0.75)' }}>
              Mot de passe
            </label>
            <input
              id="password-police"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••"
              aria-describedby={error ? "police-error" : "password-hint"}
              className="w-full rounded-[10px] text-white text-[15px] box-border px-3.5 py-3" style={{ border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)' }}
            />
            <span id="password-hint" className="sr-only">Minimum 6 caractères</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loginMutation.isPending}
            className="w-full rounded-[10px] border-0 text-white text-[15px] font-bold p-3.5"  style={{ background: loginMutation.isPending ? 'rgba(212,45,0,0.4)' : '#D42D00', cursor: loginMutation.isPending ? 'wait' : 'pointer' }}
          >
            {loginMutation.isPending ? '⏳ Connexion...' : '🔐 Se connecter'}
          </button>
        </div>

        <p className="text-center text-xs mt-5 leading-relaxed" style={{ color: 'rgba(240,237,232,0.55)' }}>
          Accès réservé aux forces de l'ordre.<br/>
          Pour un accès pilote : <a href="mailto:contact@boom.contact" style={{ color:'rgba(255,53,0,0.7)' }}>contact@boom.contact</a>
        </p>
      </div>
    </div>
  );
}
