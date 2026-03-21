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
    <div style={{ minHeight:'100vh', background:'#06060C', display:'flex', alignItems:'center', justifyContent:'center', padding: 24 }}>
      <div style={{ width:'100%', maxWidth: 380 }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚔</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color:'#fff', marginBottom: 6 }}>Module Police</h1>
          <p style={{ fontSize: 14, color:'rgba(240,237,232,0.45)' }}>boom.contact · Accès institutionnel</p>
        </div>

        {/* Form */}
        <div style={{ background:'rgba(255,255,255,0.04)', borderRadius: 16, border:'1px solid rgba(255,255,255,0.09)', padding: 24 }}>

          {error && (
            <div style={{ marginBottom: 16, padding:'10px 14px', borderRadius: 8, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', fontSize: 13, color:'#ef4444' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color:'rgba(240,237,232,0.45)', letterSpacing: 1, textTransform:'uppercase', display:'block', marginBottom: 6 }}>
              Email institutionnel
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="agent@police-jura.ch"
              style={{ width:'100%', padding:'12px 14px', borderRadius: 10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', color:'#fff', fontSize: 15, boxSizing:'border-box', outline:'none' }}
            />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: 11, color:'rgba(240,237,232,0.45)', letterSpacing: 1, textTransform:'uppercase', display:'block', marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••"
              style={{ width:'100%', padding:'12px 14px', borderRadius: 10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', color:'#fff', fontSize: 15, boxSizing:'border-box', outline:'none' }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loginMutation.isPending}
            style={{ width:'100%', padding:'14px', borderRadius: 10, border:'none', background: loginMutation.isPending ? 'rgba(255,53,0,0.4)' : '#FF3500', color:'#fff', fontSize: 15, fontWeight: 700, cursor: loginMutation.isPending ? 'wait' : 'pointer' }}
          >
            {loginMutation.isPending ? '⏳ Connexion...' : '🔐 Se connecter'}
          </button>
        </div>

        <p style={{ textAlign:'center', fontSize: 12, color:'rgba(240,237,232,0.25)', marginTop: 20, lineHeight: 1.6 }}>
          Accès réservé aux forces de l'ordre.<br/>
          Pour un accès pilote : <a href="mailto:contact@boom.contact" style={{ color:'rgba(255,53,0,0.7)' }}>contact@boom.contact</a>
        </p>
      </div>
    </div>
  );
}
