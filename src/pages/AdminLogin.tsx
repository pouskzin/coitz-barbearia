import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/admin/login', { email, password });
      await checkAuth();
      navigate('/admin');
    } catch (err: any) {
      setError(err.error || 'Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-brand-base)] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-8">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/logo.jpg?v=3" alt="Coitz Logo" className="h-24 w-auto object-contain mb-4 mix-blend-screen" />
          <h1 className="font-display text-4xl uppercase text-[var(--color-brand-text)]">ADMIN</h1>
          <p className="font-mono text-[var(--color-brand-muted)] text-sm mt-2">SISTEMA RESTRITO</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 font-mono text-sm text-center">
              {error}
            </div>
          )}
          <div>
            <label className="block font-mono text-xs text-[var(--color-brand-muted)] mb-2 uppercase">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[var(--color-brand-base)] border border-[var(--color-brand-border)] p-4 text-[var(--color-brand-text)] focus:outline-none focus:border-[var(--color-brand-amber)] transition-colors"
              required
            />
          </div>
          <div>
            <label className="block font-mono text-xs text-[var(--color-brand-muted)] mb-2 uppercase">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[var(--color-brand-base)] border border-[var(--color-brand-border)] p-4 text-[var(--color-brand-text)] focus:outline-none focus:border-[var(--color-brand-amber)] transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-brand-amber)] hover:bg-[var(--color-brand-amber-hover)] text-[var(--color-brand-base)] font-display text-xl px-8 py-4 uppercase tracking-wide transition-colors disabled:opacity-50"
          >
            {loading ? 'AUTENTICANDO...' : 'ENTRAR'}
          </button>
        </form>
      </div>
    </div>
  );
}
