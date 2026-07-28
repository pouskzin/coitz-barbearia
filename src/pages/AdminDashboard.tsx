import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isToday, startOfMonth, endOfMonth, isAfter, isBefore, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LogOut, Calendar, Check, X, User, DollarSign, Users, Briefcase, LayoutDashboard } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout, loading: authLoading } = useAuth();
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<'crm' | 'calendar'>('crm');

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
    // 1. Guardar o estado anterior para rollback
    const previousAppointments = [...appointments];
    
    // 2. Atualização Otimista
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    
    try {
      // 3. Chamada da API com credentials e headers corretos
      const response = await fetch(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status })
      });

      // 4. Captura de erro real se a resposta não for OK
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.error || errorData.message || `${response.status}`);
      }
    } catch (e: any) {
      console.error(e);
      // 5. Rollback em caso de falha
      setAppointments(previousAppointments);
      alert(`Falha na atualização: ${e.message}`);
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

  const formatCurrency = (priceInCents: number) => {
    return (priceInCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  if (authLoading || loading) return <div className="min-h-screen bg-[var(--color-brand-base)] text-[var(--color-brand-text)] flex items-center justify-center font-mono text-sm">CARREGANDO...</div>;

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  
  // -- CRM METRICS --
  const monthRevenue = appointments
    .filter(a => a.status === 'completed' && isAfter(parseISO(a.startTime), monthStart) && isBefore(parseISO(a.startTime), monthEnd))
    .reduce((acc, curr) => acc + curr.totalPrice, 0);

  const todayRevenue = appointments
    .filter(a => isToday(parseISO(a.startTime)) && a.status === 'completed')
    .reduce((acc, curr) => acc + curr.totalPrice, 0);

  const pendingRevenue = appointments
    .filter(a => isToday(parseISO(a.startTime)) && a.status === 'confirmed')
    .reduce((acc, curr) => acc + curr.totalPrice, 0);

  const totalClients = new Set(appointments.map(a => a.clientPhone || a.clientName)).size;
  const completedAppointmentsThisMonth = appointments.filter(a => a.status === 'completed' && isAfter(parseISO(a.startTime), monthStart) && isBefore(parseISO(a.startTime), monthEnd)).length;

  // -- PROFIT SPLITS --
  const profitByBarber = barbers.map(barber => {
    const rev = appointments
      .filter(a => a.barberId === barber.id && a.status === 'completed' && isAfter(parseISO(a.startTime), monthStart) && isBefore(parseISO(a.startTime), monthEnd))
      .reduce((acc, curr) => acc + curr.totalPrice, 0);
    return { name: barber.name, rev };
  }).sort((a, b) => b.rev - a.rev);

  const profitByService = services.map(service => {
    const rev = appointments
      .filter(a => a.serviceId === service.id && a.status === 'completed' && isAfter(parseISO(a.startTime), monthStart) && isBefore(parseISO(a.startTime), monthEnd))
      .reduce((acc, curr) => acc + curr.totalPrice, 0);
    return { name: service.name, rev };
  }).sort((a, b) => b.rev - a.rev);


  // -- CALENDAR FILTERS --
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

  // Sort by time ascending
  filteredAppointments.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());


  return (
    <div className="min-h-screen bg-[var(--color-brand-base)] text-[var(--color-brand-text)] font-sans">
      {/* Header */}
      <header className="border-b border-[var(--color-brand-border)] bg-[var(--color-brand-surface)] relative z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[var(--color-brand-amber)] flex items-center justify-center">
              <span className="font-display text-2xl text-[var(--color-brand-base)]">C</span>
            </div>
            <span className="font-display text-xl tracking-wider">PAINEL ADMIN</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="font-mono text-xs uppercase hidden sm:inline-block">Olá, {user?.name}</span>
            <button onClick={() => setShowPasswordModal(true)} className="font-mono text-xs text-[var(--color-brand-muted)] hover:text-[var(--color-brand-text)] uppercase transition-colors">
              Mudar Senha
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 font-mono text-xs text-[var(--color-brand-amber)] hover:text-[var(--color-brand-text)] transition-colors">
              <LogOut size={16} /> SAIR
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-[var(--color-brand-surface)] border-b border-[var(--color-brand-border)] relative z-40">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-8">
          <button 
            onClick={() => setActiveTab('crm')}
            className={`flex items-center gap-2 py-4 font-mono text-sm uppercase transition-colors border-b-2 ${activeTab === 'crm' ? 'border-[var(--color-brand-amber)] text-[var(--color-brand-amber)]' : 'border-transparent text-[var(--color-brand-muted)] hover:text-[var(--color-brand-text)]'}`}
          >
            <LayoutDashboard size={18} />
            Dashboard Financeiro
          </button>
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 py-4 font-mono text-sm uppercase transition-colors border-b-2 ${activeTab === 'calendar' ? 'border-[var(--color-brand-amber)] text-[var(--color-brand-amber)]' : 'border-transparent text-[var(--color-brand-muted)] hover:text-[var(--color-brand-text)]'}`}
          >
            <Calendar size={18} />
            Calendário & Agenda
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {activeTab === 'crm' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[var(--color-brand-muted)] mb-4">
                  <span className="font-mono text-xs uppercase">Faturamento Mensal</span>
                  <DollarSign size={18} />
                </div>
                <div className="font-display text-4xl text-[var(--color-brand-text)]">{formatCurrency(monthRevenue)}</div>
                <div className="font-sans text-sm text-[var(--color-brand-muted)] mt-2">Neste mês</div>
              </div>
              <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[var(--color-brand-muted)] mb-4">
                  <span className="font-mono text-xs uppercase">Concluídos no Mês</span>
                  <Check size={18} />
                </div>
                <div className="font-display text-4xl text-[var(--color-brand-text)]">{completedAppointmentsThisMonth}</div>
                <div className="font-sans text-sm text-[var(--color-brand-muted)] mt-2">Agendamentos finalizados</div>
              </div>
              <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[var(--color-brand-muted)] mb-4">
                  <span className="font-mono text-xs uppercase">Hoje (Concluído)</span>
                  <DollarSign size={18} />
                </div>
                <div className="font-display text-4xl text-[var(--color-brand-text)]">{formatCurrency(todayRevenue)}</div>
                <div className="font-sans text-sm text-[var(--color-brand-muted)] mt-2">Faturado hoje</div>
              </div>
              <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[var(--color-brand-muted)] mb-4">
                  <span className="font-mono text-xs uppercase">Base de Clientes</span>
                  <Users size={18} />
                </div>
                <div className="font-display text-4xl text-[var(--color-brand-text)]">{totalClients}</div>
                <div className="font-sans text-sm text-[var(--color-brand-muted)] mt-2">Clientes únicos no sistema</div>
              </div>
            </div>

            {/* Splits */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-6">
                <div className="flex items-center gap-2 mb-6">
                  <User className="text-[var(--color-brand-amber)]" size={20} />
                  <h3 className="font-mono text-sm uppercase">Lucro por Profissional (Mês)</h3>
                </div>
                <div className="space-y-4">
                  {profitByBarber.map((b, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-[var(--color-brand-border)] pb-2 last:border-0">
                      <span className="font-sans text-lg">{b.name}</span>
                      <span className="font-display text-2xl">{formatCurrency(b.rev)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Briefcase className="text-[var(--color-brand-amber)]" size={20} />
                  <h3 className="font-mono text-sm uppercase">Lucro por Serviço (Mês)</h3>
                </div>
                <div className="space-y-4">
                  {profitByService.map((s, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-[var(--color-brand-border)] pb-2 last:border-0">
                      <span className="font-sans text-lg">{s.name}</span>
                      <span className="font-display text-2xl">{formatCurrency(s.rev)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sidebar */}
            <aside className="lg:col-span-3 space-y-8 relative z-30">
              <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-6">
                <h3 className="font-mono text-xs text-[var(--color-brand-muted)] uppercase mb-4">Resumo do Dia</h3>
                <div className="space-y-6">
                  <div>
                    <p className="font-sans text-sm text-[var(--color-brand-muted)]">Faturamento (Concluído)</p>
                    <p className="font-display text-3xl mt-1 text-[var(--color-brand-text)]">{formatCurrency(todayRevenue)}</p>
                  </div>
                  <div>
                    <p className="font-sans text-sm text-[var(--color-brand-muted)]">Faturamento Pendente</p>
                    <p className="font-display text-2xl text-[var(--color-brand-amber)] mt-1">{formatCurrency(pendingRevenue)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-6">
                <h3 className="font-mono text-xs text-[var(--color-brand-muted)] uppercase mb-4">Filtros da Agenda</h3>
                <div className="space-y-6">
                  <div>
                    <p className="font-mono text-xs text-[var(--color-brand-muted)] mb-3">DATA</p>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => setFilterDate('all')} className={`text-left px-4 py-3 font-mono text-sm border transition-colors ${filterDate === 'all' ? 'bg-[var(--color-brand-amber)] border-[var(--color-brand-amber)] text-[var(--color-brand-base)]' : 'border-[var(--color-brand-border)] hover:border-[var(--color-brand-amber)] text-[var(--color-brand-text)]'}`}>TODOS OS DIAS</button>
                      <button onClick={() => setFilterDate('today')} className={`text-left px-4 py-3 font-mono text-sm border transition-colors ${filterDate === 'today' ? 'bg-[var(--color-brand-amber)] border-[var(--color-brand-amber)] text-[var(--color-brand-base)]' : 'border-[var(--color-brand-border)] hover:border-[var(--color-brand-amber)] text-[var(--color-brand-text)]'}`}>HOJE</button>
                      <button onClick={() => setFilterDate('tomorrow')} className={`text-left px-4 py-3 font-mono text-sm border transition-colors ${filterDate === 'tomorrow' ? 'bg-[var(--color-brand-amber)] border-[var(--color-brand-amber)] text-[var(--color-brand-base)]' : 'border-[var(--color-brand-border)] hover:border-[var(--color-brand-amber)] text-[var(--color-brand-text)]'}`}>AMANHÃ</button>
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-[var(--color-brand-muted)] mb-3">STATUS</p>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => setFilterStatus('active')} className={`text-left px-4 py-3 font-mono text-sm border transition-colors ${filterStatus === 'active' ? 'bg-[var(--color-brand-amber)] border-[var(--color-brand-amber)] text-[var(--color-brand-base)]' : 'border-[var(--color-brand-border)] hover:border-[var(--color-brand-amber)] text-[var(--color-brand-text)]'}`}>A CONFIRMAR</button>
                      <button onClick={() => setFilterStatus('completed')} className={`text-left px-4 py-3 font-mono text-sm border transition-colors ${filterStatus === 'completed' ? 'bg-[var(--color-brand-amber)] border-[var(--color-brand-amber)] text-[var(--color-brand-base)]' : 'border-[var(--color-brand-border)] hover:border-[var(--color-brand-amber)] text-[var(--color-brand-text)]'}`}>CONCLUÍDOS</button>
                      <button onClick={() => setFilterStatus('cancelled')} className={`text-left px-4 py-3 font-mono text-sm border transition-colors ${filterStatus === 'cancelled' ? 'bg-[var(--color-brand-amber)] border-[var(--color-brand-amber)] text-[var(--color-brand-base)]' : 'border-[var(--color-brand-border)] hover:border-[var(--color-brand-amber)] text-[var(--color-brand-text)]'}`}>CANCELADOS / FALTAS</button>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content - Agenda */}
            <main className="lg:col-span-9 space-y-6 flex-1 min-w-0 w-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--color-brand-border)] pb-4">
                <h1 className="font-display text-4xl uppercase">
                  AGENDA {filterDate === 'today' ? 'DE HOJE' : filterDate === 'tomorrow' ? 'DE AMANHÃ' : 'GERAL'}
                </h1>
              </div>

              <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] w-full max-h-[70vh] overflow-auto [scrollbar-width:thin] [scrollbar-color:var(--color-brand-amber)_transparent] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[var(--color-brand-amber)]">
                <div className="min-w-max">
                  {/* Grid Header - Days */}
                  <div className="grid grid-cols-[80px_repeat(14,_minmax(180px,_1fr))] border-b border-[var(--color-brand-border)] sticky top-0 z-20 bg-[var(--color-brand-base)]">
                    <div className="p-4 border-r border-[var(--color-brand-border)] bg-[var(--color-brand-base)] sticky left-0 z-30"></div>
                    {Array.from({ length: 14 }).map((_, i) => {
                      const d = addDays(today, i);
                      return (
                        <div key={i} className="p-4 text-center border-r border-[var(--color-brand-border)] last:border-0 bg-[var(--color-brand-base)]/50">
                          <div className="font-mono text-xs text-[var(--color-brand-muted)] uppercase">{format(d, 'EEEE', { locale: ptBR })}</div>
                          <div className={`font-display text-2xl mt-1 ${isToday(d) ? 'text-[var(--color-brand-amber)]' : 'text-[var(--color-brand-text)]'}`}>{format(d, 'dd/MM')}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grid Body - Hours */}
                  <div className="flex flex-col">
                    {Array.from({ length: 13 }).map((_, i) => {
                      const hour = i + 8; // 08:00 to 20:00
                      return (
                        <div key={hour} className="grid grid-cols-[80px_repeat(14,_minmax(180px,_1fr))] border-b border-[var(--color-brand-border)] last:border-0 min-h-[140px] group">
                          {/* Hour Label */}
                          <div className="p-4 border-r border-[var(--color-brand-border)] flex items-start justify-center group-hover:bg-[var(--color-brand-base)]/30 transition-colors sticky left-0 z-10 bg-[var(--color-brand-base)]">
                            <span className="font-mono text-sm text-[var(--color-brand-muted)]">{hour.toString().padStart(2, '0')}:00</span>
                          </div>
                          
                          {/* Day Cells */}
                          {Array.from({ length: 14 }).map((_, j) => {
                            const d = addDays(today, j);
                            
                            const hourAppointments = filteredAppointments.filter(apt => {
                              const aptDate = parseISO(apt.startTime);
                              return isSameDay(aptDate, d) && aptDate.getHours() === hour;
                            });
                            
                            return (
                              <div key={j} className="p-2 border-r border-[var(--color-brand-border)] last:border-0 relative hover:bg-[var(--color-brand-base)]/50 transition-colors">
                                {hourAppointments.map(apt => {
                                  const barber = barbers.find(b => b.id === apt.barberId)?.name.split(' ')[0] || 'Desconhecido';
                                  const service = services.find(s => s.id === apt.serviceId)?.name || 'Serviço';
                                  
                                  let statusStyles = '';
                                  if (apt.status === 'confirmed') statusStyles = 'border-[var(--color-brand-amber)]/30 bg-[var(--color-brand-amber)]/10 text-[var(--color-brand-amber)]';
                                  else if (apt.status === 'completed') statusStyles = 'border-[var(--color-brand-lime)]/30 bg-[var(--color-brand-lime)]/10 text-[var(--color-brand-lime)]';
                                  else if (apt.status === 'cancelled') statusStyles = 'border-[var(--color-brand-muted)]/30 bg-[var(--color-brand-muted)]/10 text-[var(--color-brand-muted)]';
                                  else if (apt.status === 'no_show') statusStyles = 'border-red-500/30 bg-red-500/10 text-red-500';

                                  return (
                                    <div key={apt.id} className={`mb-2 p-2 border ${statusStyles} flex flex-col gap-1 rounded-sm`}>
                                      <div className="font-display uppercase text-xs truncate" title={apt.clientName}>{apt.clientName}</div>
                                      <div className="font-sans text-[10px] opacity-80 truncate" title={`${barber} - ${service}`}>{barber} - {service}</div>
                                      
                                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-current/20">
                                        <span className="font-mono text-[10px]">{format(parseISO(apt.startTime), 'HH:mm')}</span>
                                        <div className="flex gap-1">
                                          {apt.status === 'confirmed' && (
                                            <>
                                              <button onClick={(e) => { e.stopPropagation(); updateStatus(apt.id, 'completed'); }} className="hover:opacity-70 p-0.5 text-[var(--color-brand-lime)]" title="Concluir"><Check size={12} /></button>
                                              <button onClick={(e) => { e.stopPropagation(); updateStatus(apt.id, 'no_show'); }} className="hover:opacity-70 p-0.5 text-red-500" title="Faltou"><X size={12} /></button>
                                              <button onClick={(e) => { e.stopPropagation(); updateStatus(apt.id, 'cancelled'); }} className="hover:opacity-70 p-0.5 text-[var(--color-brand-muted)]" title="Cancelar"><X size={12} /></button>
                                            </>
                                          )}
                                          {apt.status === 'completed' && <Check size={12} className="opacity-80" />}
                                          {(apt.status === 'cancelled' || apt.status === 'no_show') && <X size={12} className="opacity-80" />}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </main>
          </div>
        )}
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-8 max-w-sm w-full shadow-2xl">
            <h3 className="font-display text-2xl uppercase mb-6 text-[var(--color-brand-amber)]">Mudar Senha</h3>
            <form onSubmit={changePassword} className="space-y-4">
              {passwordMsg && <p className="font-mono text-xs text-[var(--color-brand-amber)] bg-[var(--color-brand-amber)]/10 p-2 border border-[var(--color-brand-amber)]/30">{passwordMsg}</p>}
              <div>
                <label className="block font-mono text-xs text-[var(--color-brand-muted)] mb-1 uppercase">Senha Atual</label>
                <input 
                  type="password" 
                  value={oldPassword} onChange={e => setOldPassword(e.target.value)} 
                  className="w-full bg-[var(--color-brand-base)] border border-[var(--color-brand-border)] p-3 text-sm focus:outline-none focus:border-[var(--color-brand-amber)] transition-colors" 
                  required 
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-[var(--color-brand-muted)] mb-1 uppercase">Nova Senha</label>
                <input 
                  type="password" 
                  value={newPassword} onChange={e => setNewPassword(e.target.value)} 
                  className="w-full bg-[var(--color-brand-base)] border border-[var(--color-brand-border)] p-3 text-sm focus:outline-none focus:border-[var(--color-brand-amber)] transition-colors" 
                  required 
                />
              </div>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 border border-[var(--color-brand-border)] py-3 font-mono text-xs uppercase hover:bg-[var(--color-brand-base)] transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-[var(--color-brand-amber)] text-[var(--color-brand-base)] font-mono text-xs uppercase py-3 hover:bg-[var(--color-brand-amber-hover)] transition-colors">Salvar Nova Senha</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
