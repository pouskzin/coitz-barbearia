import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isToday, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LogOut, Calendar, Check, X, User } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>('all'); // 'all', 'today', 'tomorrow'
  const [filterStatus, setFilterStatus] = useState<string>('active'); // 'active', 'completed', 'cancelled'

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    try {
      const res = await fetch('/api/admin/me');
      if (!res.ok) {
        navigate('/admin/login');
        return;
      }
      
      const [aptRes, barRes, srvRes] = await Promise.all([
        fetch('/api/admin/appointments'),
        fetch('/api/barbers'),
        fetch('/api/services')
      ]);

      setAppointments(await aptRes.json());
      setBarbers(await barRes.json());
      setServices(await srvRes.json());
    } catch (e) {
      console.error(e);
      navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    navigate('/admin/login');
  };

  const updateStatus = async (id: number, status: string) => {
    const res = await fetch(`/api/admin/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar');
      setPasswordMsg(data.message);
      setOldPassword('');
      setNewPassword('');
    } catch (e: any) {
      setPasswordMsg(e.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[var(--color-brand-base)] flex items-center justify-center font-mono text-[var(--color-brand-amber)]">CARREGANDO SISTEMA...</div>;
  }

  // Derived stats
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  const filteredAppointments = appointments.filter(a => {
    // Status filter
    if (filterStatus === 'active' && a.status !== 'confirmed') return false;
    if (filterStatus === 'completed' && a.status !== 'completed') return false;
    if (filterStatus === 'cancelled' && !['cancelled', 'no_show'].includes(a.status)) return false;

    // Date filter
    const aptDateStr = a.startTime.split('T')[0];
    if (filterDate === 'today' && aptDateStr !== todayStr) return false;
    
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const tmrStr = format(tmr, 'yyyy-MM-dd');
    if (filterDate === 'tomorrow' && aptDateStr !== tmrStr) return false;

    return true;
  });

  const totalRevenue = appointments
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + a.totalPrice, 0);

  const pendingRevenue = appointments
    .filter(a => a.status === 'confirmed')
    .reduce((sum, a) => sum + a.totalPrice, 0);

  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(a => a.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[var(--color-brand-base)] text-[var(--color-brand-text)] font-sans">
      
      {/* Topbar */}
      <header className="h-16 border-b border-[var(--color-brand-border)] bg-[var(--color-brand-surface)] flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <img src="/logo.jpg?v=3" alt="Coitz Logo" className="h-10 w-auto object-contain mix-blend-screen" />
          <span className="font-display text-2xl uppercase tracking-widest text-[var(--color-brand-text)] opacity-50 hidden sm:inline">ADMIN</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 font-mono text-xs text-[var(--color-brand-muted)] hover:text-[var(--color-brand-amber)] transition-colors">
            MUDAR SENHA
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 font-mono text-xs text-[var(--color-brand-muted)] hover:text-red-400 transition-colors">
            <LogOut size={16} /> SAIR
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-12 gap-8">
        
         {/* Sidebar / Stats */}
        <aside className="lg:col-span-3 space-y-6">

          {showPasswordModal && (
            <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-mono text-xs text-[var(--color-brand-amber)] uppercase">Mudar Senha</h3>
                <button onClick={() => setShowPasswordModal(false)} className="text-[var(--color-brand-muted)] hover:text-[var(--color-brand-text)]">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <input
                    type="password"
                    placeholder="Senha Atual"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    className="w-full bg-[var(--color-brand-base)] border border-[var(--color-brand-border)] px-3 py-2 font-mono text-sm text-[var(--color-brand-text)] focus:outline-none focus:border-[var(--color-brand-amber)] placeholder:text-[var(--color-brand-muted)]"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Nova Senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full bg-[var(--color-brand-base)] border border-[var(--color-brand-border)] px-3 py-2 font-mono text-sm text-[var(--color-brand-text)] focus:outline-none focus:border-[var(--color-brand-amber)] placeholder:text-[var(--color-brand-muted)]"
                  />
                </div>
                {passwordMsg && <p className="font-mono text-xs text-[var(--color-brand-amber)]">{passwordMsg}</p>}
                <button type="submit" className="w-full bg-[var(--color-brand-amber)] hover:bg-[var(--color-brand-amber)]/90 text-[var(--color-brand-base)] px-4 py-2 font-mono text-sm uppercase transition-colors">
                  Salvar
                </button>
              </form>
            </div>
          )}

          <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-6">
             <h3 className="font-mono text-xs text-[var(--color-brand-muted)] uppercase mb-4">Visão Geral</h3>
             <div className="space-y-4">
               <div>
                 <p className="font-sans text-sm text-[var(--color-brand-muted)]">Atendimentos Concluídos</p>
                 <p className="font-display text-4xl">{completedAppointments} <span className="text-xl text-[var(--color-brand-muted)]">/ {totalAppointments}</span></p>
               </div>
               <div>
                 <p className="font-sans text-sm text-[var(--color-brand-muted)]">Faturamento Realizado</p>
                 <p className="font-display text-4xl text-[var(--color-brand-lime)]">R$ {totalRevenue}</p>
               </div>
               <div>
                 <p className="font-sans text-sm text-[var(--color-brand-muted)]">Faturamento Pendente</p>
                 <p className="font-display text-2xl text-[var(--color-brand-amber)]">R$ {pendingRevenue}</p>
               </div>
             </div>
          </div>
          
          <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-6">
             <h3 className="font-mono text-xs text-[var(--color-brand-muted)] uppercase mb-4">Filtros</h3>
             <div className="space-y-4">
               <div>
                 <p className="font-mono text-xs text-[var(--color-brand-muted)] mb-2">DATA</p>
                 <div className="flex flex-col gap-2">
                   <button onClick={() => setFilterDate('all')} className={`text-left px-3 py-2 font-mono text-sm border ${filterDate === 'all' ? 'bg-[var(--color-brand-amber)] border-[var(--color-brand-amber)] text-[var(--color-brand-base)]' : 'border-[var(--color-brand-border)] hover:border-[var(--color-brand-amber)] text-[var(--color-brand-text)]'}`}>TODOS OS DIAS</button>
                   <button onClick={() => setFilterDate('today')} className={`text-left px-3 py-2 font-mono text-sm border ${filterDate === 'today' ? 'bg-[var(--color-brand-amber)] border-[var(--color-brand-amber)] text-[var(--color-brand-base)]' : 'border-[var(--color-brand-border)] hover:border-[var(--color-brand-amber)] text-[var(--color-brand-text)]'}`}>HOJE</button>
                   <button onClick={() => setFilterDate('tomorrow')} className={`text-left px-3 py-2 font-mono text-sm border ${filterDate === 'tomorrow' ? 'bg-[var(--color-brand-amber)] border-[var(--color-brand-amber)] text-[var(--color-brand-base)]' : 'border-[var(--color-brand-border)] hover:border-[var(--color-brand-amber)] text-[var(--color-brand-text)]'}`}>AMANHÃ</button>
                 </div>
               </div>
               <div>
                 <p className="font-mono text-xs text-[var(--color-brand-muted)] mb-2 mt-4">STATUS</p>
                 <div className="flex flex-col gap-2">
                   <button onClick={() => setFilterStatus('active')} className={`text-left px-3 py-2 font-mono text-sm border ${filterStatus === 'active' ? 'bg-[var(--color-brand-amber)] border-[var(--color-brand-amber)] text-[var(--color-brand-base)]' : 'border-[var(--color-brand-border)] hover:border-[var(--color-brand-amber)] text-[var(--color-brand-text)]'}`}>A CONFIRMAR / ATIVOS</button>
                   <button onClick={() => setFilterStatus('completed')} className={`text-left px-3 py-2 font-mono text-sm border ${filterStatus === 'completed' ? 'bg-[var(--color-brand-amber)] border-[var(--color-brand-amber)] text-[var(--color-brand-base)]' : 'border-[var(--color-brand-border)] hover:border-[var(--color-brand-amber)] text-[var(--color-brand-text)]'}`}>CONCLUÍDOS</button>
                   <button onClick={() => setFilterStatus('cancelled')} className={`text-left px-3 py-2 font-mono text-sm border ${filterStatus === 'cancelled' ? 'bg-[var(--color-brand-amber)] border-[var(--color-brand-amber)] text-[var(--color-brand-base)]' : 'border-[var(--color-brand-border)] hover:border-[var(--color-brand-amber)] text-[var(--color-brand-text)]'}`}>CANCELADOS / FALTAS</button>
                 </div>
               </div>
             </div>
          </div>
        </aside>

        {/* Main Content - Agenda */}
        <main className="lg:col-span-9 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--color-brand-border)] pb-4">
            <h1 className="font-display text-4xl uppercase">
              AGENDA {filterDate === 'today' ? 'DE HOJE' : filterDate === 'tomorrow' ? 'DE AMANHÃ' : 'GERAL'}
            </h1>
          </div>

          <div className="grid gap-4">
            {filteredAppointments.map(apt => {
              const date = new Date(apt.startTime);
              const barber = barbers.find(b => b.id === apt.barberId)?.name.split(' ')[0] || 'Desconhecido';
              const service = services.find(s => s.id === apt.serviceId)?.name || 'Serviço';
              
              return (
                <div key={apt.id} className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center justify-center bg-[var(--color-brand-base)] w-20 h-20 border border-[var(--color-brand-border)]">
                      <span className="font-mono text-xs text-[var(--color-brand-muted)] uppercase">{format(date, 'MMM', { locale: ptBR })}</span>
                      <span className="font-display text-3xl">{format(date, 'dd')}</span>
                    </div>
                    
                    <div>
                      <div className="font-mono text-xl text-[var(--color-brand-amber)] mb-1">{format(date, 'HH:mm')}</div>
                      <div className="font-display text-2xl uppercase">{apt.clientName}</div>
                      <div className="flex items-center gap-4 mt-1 font-sans text-sm text-[var(--color-brand-muted)]">
                        <span className="flex items-center gap-1"><User size={14}/> {barber}</span>
                        <span>{service} (R$ {apt.totalPrice})</span>
                        <span>{apt.clientPhone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:self-stretch">
                    {apt.status === 'confirmed' && (
                      <>
                        <button onClick={() => updateStatus(apt.id, 'completed')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[var(--color-brand-lime)]/10 hover:bg-[var(--color-brand-lime)]/20 text-[var(--color-brand-lime)] border border-[var(--color-brand-lime)]/30 px-4 py-2 font-mono text-xs uppercase transition-colors">
                          <Check size={16} /> Concluir
                        </button>
                        <button onClick={() => updateStatus(apt.id, 'no_show')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-4 py-2 font-mono text-xs uppercase transition-colors">
                          <X size={16} /> Faltou
                        </button>
                        <button onClick={() => updateStatus(apt.id, 'cancelled')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[var(--color-brand-muted)]/10 hover:bg-[var(--color-brand-muted)]/20 text-[var(--color-brand-muted)] border border-[var(--color-brand-muted)]/30 px-4 py-2 font-mono text-xs uppercase transition-colors">
                          <X size={16} /> Cancelar
                        </button>
                      </>
                    )}
                    {apt.status === 'completed' && (
                      <span className="font-mono text-xs border border-[var(--color-brand-lime)] text-[var(--color-brand-lime)] px-3 py-1 bg-[var(--color-brand-lime)]/5">
                        ATENDIMENTO CONCLUÍDO
                      </span>
                    )}
                    {apt.status === 'no_show' && (
                      <span className="font-mono text-xs border border-red-500 text-red-500 px-3 py-1 bg-red-500/5">
                        FALTOU
                      </span>
                    )}
                    {apt.status === 'cancelled' && (
                      <span className="font-mono text-xs border border-[var(--color-brand-muted)] text-[var(--color-brand-muted)] px-3 py-1">
                        CANCELADO
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            
            {filteredAppointments.length === 0 && (
              <div className="text-center py-12 border border-[var(--color-brand-border)] font-mono text-[var(--color-brand-muted)]">
                NENHUM AGENDAMENTO ENCONTRADO
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
