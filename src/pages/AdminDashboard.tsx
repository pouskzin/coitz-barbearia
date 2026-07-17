import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isToday, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LogOut, Calendar, Check, X, User } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout, loading: authLoading } = useAuth();
  
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
    if (!authLoading && !user) {
      navigate('/admin/login');
    } else if (user) {
      loadData();
    }
  }, [user, authLoading, navigate]);

  const loadData = async () => {
    try {
      const [aptRes, barRes, srvRes] = await Promise.all([
        api.get('/api/admin/appointments'),
        api.get('/api/barbers'),
        api.get('/api/services')
      ]);
      setAppointments(aptRes);
      setBarbers(barRes);
      setServices(srvRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/api/admin/appointments/${id}`, { status });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar status');
    }
  };

  const changePassword = async (e: any) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/admin/change-password', { oldPassword, newPassword });
      setPasswordMsg(res.message);
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg(err.error || 'Erro ao alterar senha');
    }
  };

  if (authLoading || loading) return <div className="min-h-screen bg-[var(--color-brand-base)] text-[var(--color-brand-text)] flex items-center justify-center font-mono text-sm">CARREGANDO...</div>;

  const today = new Date();
  
  let filteredAppointments = appointments;

  if (filterDate === 'today') {
    filteredAppointments = filteredAppointments.filter(a => isToday(parseISO(a.startTime)));
  } else if (filterDate === 'tomorrow') {
    filteredAppointments = filteredAppointments.filter(a => {
      const aptDate = parseISO(a.startTime);
      return aptDate.getDate() === today.getDate() + 1 && aptDate.getMonth() === today.getMonth();
    });
  }

  if (filterStatus === 'active') {
    filteredAppointments = filteredAppointments.filter(a => ['confirmed'].includes(a.status));
  } else if (filterStatus === 'completed') {
    filteredAppointments = filteredAppointments.filter(a => a.status === 'completed');
  } else if (filterStatus === 'cancelled') {
    filteredAppointments = filteredAppointments.filter(a => ['cancelled', 'no_show'].includes(a.status));
  }

  const todayRevenue = appointments
    .filter(a => isToday(parseISO(a.startTime)) && a.status === 'completed')
    .reduce((acc, curr) => acc + curr.totalPrice, 0);

  const pendingRevenue = appointments
    .filter(a => isToday(parseISO(a.startTime)) && a.status === 'confirmed')
    .reduce((acc, curr) => acc + curr.totalPrice, 0);

  return (
    <div className="min-h-screen bg-[var(--color-brand-base)] text-[var(--color-brand-text)] font-sans">
      {/* Header */}
      <header className="border-b border-[var(--color-brand-border)] bg-[var(--color-brand-surface)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[var(--color-brand-amber)] flex items-center justify-center">
              <span className="font-display text-2xl text-[var(--color-brand-base)]">C</span>
            </div>
            <span className="font-display text-xl tracking-wider">PAINEL</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="font-mono text-xs uppercase hidden sm:inline-block">Admin: {user?.name}</span>
            <button onClick={() => setShowPasswordModal(true)} className="font-mono text-xs text-[var(--color-brand-muted)] hover:text-[var(--color-brand-text)] uppercase transition-colors">
              Mudar Senha
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 font-mono text-xs text-[var(--color-brand-amber)] hover:text-[var(--color-brand-text)] transition-colors">
              <LogOut size={16} /> SAIR
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Sidebar */}
        <aside className="lg:col-span-3 space-y-8">
          <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-6">
             <h3 className="font-mono text-xs text-[var(--color-brand-muted)] uppercase mb-4">Resumo de Hoje</h3>
             <div className="space-y-6">
               <div>
                 <p className="font-sans text-sm text-[var(--color-brand-muted)]">Faturamento (Concluído)</p>
                 <p className="font-display text-4xl mt-1">R$ {todayRevenue}</p>
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

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-8 max-w-sm w-full">
            <h3 className="font-display text-2xl uppercase mb-6">Mudar Senha</h3>
            <form onSubmit={changePassword} className="space-y-4">
              {passwordMsg && <p className="font-mono text-xs text-[var(--color-brand-amber)]">{passwordMsg}</p>}
              <div>
                <label className="block font-mono text-xs text-[var(--color-brand-muted)] mb-1">Senha Atual</label>
                <input 
                  type="password" 
                  value={oldPassword} onChange={e => setOldPassword(e.target.value)} 
                  className="w-full bg-transparent border border-[var(--color-brand-border)] p-2 text-sm focus:outline-none focus:border-[var(--color-brand-amber)]" 
                  required 
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-[var(--color-brand-muted)] mb-1">Nova Senha</label>
                <input 
                  type="password" 
                  value={newPassword} onChange={e => setNewPassword(e.target.value)} 
                  className="w-full bg-transparent border border-[var(--color-brand-border)] p-2 text-sm focus:outline-none focus:border-[var(--color-brand-amber)]" 
                  required 
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 border border-[var(--color-brand-border)] py-2 font-mono text-xs uppercase hover:text-[var(--color-brand-amber)] transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-[var(--color-brand-amber)] text-[var(--color-brand-base)] font-mono text-xs uppercase py-2 hover:bg-[var(--color-brand-amber-hover)] transition-colors">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
