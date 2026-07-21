import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Calendar as CalIcon } from 'lucide-react';
import { format, addDays, startOfToday, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '../services/api';

export default function BookingFlow() {
  const navigate = useNavigate();

  const formatCurrency = (priceInCents: number) => {
    return (priceInCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const [step, setStep] = useState(1);
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);

  // Selections
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedBarber, setSelectedBarber] = useState<any>(null); // null means any
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  // Client Info
  const [clientInfo, setClientInfo] = useState({ name: '', phone: '', email: '' });

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    api.get('/api/services').then(setServices);
    api.get('/api/barbers').then(setBarbers);
  }, []);

  useEffect(() => {
    if (step === 3) {
      loadSlots(selectedDate, selectedBarber?.id);
    }
  }, [step, selectedDate, selectedBarber]);

  const loadSlots = async (date: Date, barberId?: number) => {
    setLoadingSlots(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    const url = barberId
      ? `/api/availability?date=${dateStr}&barberId=${barberId}`
      : `/api/availability?date=${dateStr}`;

    try {
      const data = await api.get(url);

      setSlots(data.availableSlots || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSlots(false);
    }
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => {
    if (step === 1) navigate('/');
    else setStep(s => s - 1);
  };

  const submitBooking = async () => {
    setLoading(true);
    try {
      const payload = {
        clientName: clientInfo.name,
        clientPhone: clientInfo.phone,
        clientEmail: clientInfo.email,
        barberId: selectedSlot.barberId,
        serviceId: selectedService.id,
        startTime: selectedSlot.time,
      };

      await api.post('/api/appointments', payload);
      setStep(6); // Success screen
    } catch (e) {
      alert("Erro de conexão ou ao agendar.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            {services.map(s => (
              <button
                key={s.id}
                onClick={() => { setSelectedService(s); nextStep(); }}
                className="w-full text-left bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-6 hover:border-[var(--color-brand-amber)] transition-colors flex justify-between items-center group"
              >
                <div>
                  <h3 className="font-display text-2xl uppercase group-hover:text-[var(--color-brand-amber)]">{s.name}</h3>
                  <p className="font-sans text-[var(--color-brand-muted)]">{s.description}</p>
                </div>
                <div className="font-display text-3xl">{formatCurrency(s.price)}</div>
              </button>
            ))}
          </div>
        );
      case 2:
        return (
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => { setSelectedBarber(null); nextStep(); }}
              className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-6 hover:border-[var(--color-brand-amber)] transition-colors text-left flex flex-col gap-2 group"
            >
              <h3 className="font-display text-3xl uppercase group-hover:text-[var(--color-brand-amber)]">QUALQUER UM</h3>
              <p className="font-mono text-sm text-[var(--color-brand-muted)]">O MAIS RÁPIDO DISPONÍVEL</p>
            </button>
            {barbers.map(b => (
              <button
                key={b.id}
                onClick={() => { setSelectedBarber(b); nextStep(); }}
                className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-6 hover:border-[var(--color-brand-amber)] transition-colors text-left flex flex-col gap-2 group"
              >
                <h3 className="font-display text-3xl uppercase group-hover:text-[var(--color-brand-amber)]">{b.name}</h3>
                <p className="font-mono text-sm text-[var(--color-brand-muted)]">{b.bio}</p>
              </button>
            ))}
          </div>
        );
      case 3:
        // Build next 7 days for quick selection
        const days = Array.from({ length: 14 }).map((_, i) => addDays(startOfToday(), i)).filter(d => d.getDay() !== 0); // No sundays
        return (
          <div className="space-y-8">
            {/* Horizontal Date Picker */}
            <div className="flex gap-2 overflow-x-auto pb-4 snap-x">
              {days.map(d => {
                const isSelected = isSameDay(d, selectedDate);
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => setSelectedDate(d)}
                    className={`snap-start min-w-[80px] p-4 border flex flex-col items-center justify-center gap-1 transition-colors ${isSelected
                      ? 'bg-[var(--color-brand-amber)] border-[var(--color-brand-amber)] text-[var(--color-brand-base)]'
                      : 'bg-[var(--color-brand-surface)] border-[var(--color-brand-border)] text-[var(--color-brand-text)] hover:border-[var(--color-brand-amber)]'
                      }`}
                  >
                    <span className="font-mono text-xs uppercase">{format(d, 'EEE', { locale: ptBR })}</span>
                    <span className="font-display text-2xl">{format(d, 'dd')}</span>
                  </button>
                );
              })}
            </div>

            {loadingSlots ? (
              <div className="text-center font-mono text-[var(--color-brand-muted)] py-8 animate-pulse">CARREGANDO HORÁRIOS...</div>
            ) : slots.length === 0 ? (
              <div className="text-center font-sans text-red-400 py-8">NENHUM HORÁRIO DISPONÍVEL PARA ESTE DIA.</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {slots.map((slot, idx) => {
                  // group identical times from different barbers if 'any' was selected?
                  // for simplicity, just show times. If multiple barbers have the same time, we'll pick the first one selected.
                  const timeLabel = format(parseISO(slot.time), 'HH:mm');
                  const barberLabel = barbers.find(b => b.id === slot.barberId)?.name.split(' ')[0];

                  return (
                    <button
                      key={`${slot.time}-${slot.barberId}`}
                      onClick={() => { setSelectedSlot(slot); nextStep(); }}
                      className="border border-[var(--color-brand-border)] bg-[var(--color-brand-surface)] hover:border-[var(--color-brand-amber)] hover:text-[var(--color-brand-amber)] p-3 flex flex-col items-center justify-center transition-all group"
                    >
                      <span className="font-display text-2xl">{timeLabel}</span>
                      {!selectedBarber && (
                        <span className="font-mono text-[10px] text-[var(--color-brand-muted)] group-hover:text-[var(--color-brand-amber)] uppercase truncate w-full text-center">
                          {barberLabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block font-mono text-xs text-[var(--color-brand-muted)] mb-2 uppercase">Nome Completo</label>
              <input
                type="text"
                value={clientInfo.name}
                onChange={e => setClientInfo(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-[var(--color-brand-base)] border border-[var(--color-brand-border)] p-4 font-sans text-lg focus:outline-none focus:border-[var(--color-brand-amber)] transition-colors"
                placeholder="Ex: João Silva"
              />
            </div>
            <div>
              <label className="block font-mono text-xs text-[var(--color-brand-muted)] mb-2 uppercase">WhatsApp</label>
              <input
                type="tel"
                value={clientInfo.phone}
                onChange={e => setClientInfo(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full bg-[var(--color-brand-base)] border border-[var(--color-brand-border)] p-4 font-sans text-lg focus:outline-none focus:border-[var(--color-brand-amber)] transition-colors"
                placeholder="(43) 90000-0000"
              />
            </div>
            <div>
              <label className="block font-mono text-xs text-[var(--color-brand-muted)] mb-2 uppercase">E-mail (Opcional)</label>
              <input
                type="email"
                value={clientInfo.email}
                onChange={e => setClientInfo(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-[var(--color-brand-base)] border border-[var(--color-brand-border)] p-4 font-sans text-lg focus:outline-none focus:border-[var(--color-brand-amber)] transition-colors"
                placeholder="joao@email.com"
              />
            </div>
            <button
              disabled={clientInfo.name.length < 2 || clientInfo.phone.length < 10}
              onClick={nextStep}
              className="w-full bg-[var(--color-brand-amber)] hover:bg-[var(--color-brand-amber-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--color-brand-base)] font-display text-2xl px-8 py-4 uppercase tracking-wide transition-transform hover:scale-[1.02] active:scale-95"
            >
              CONTINUAR
            </button>
          </div>
        );
      case 5:
        const bLabel = barbers.find(b => b.id === selectedSlot?.barberId)?.name || '';
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-6 space-y-4">
              <h3 className="font-mono text-xs text-[var(--color-brand-lime)] uppercase tracking-widest mb-4">Resumo do Agendamento</h3>

              <div className="flex justify-between items-end border-b border-[var(--color-brand-border)] pb-2">
                <span className="font-sans text-[var(--color-brand-muted)]">Serviço</span>
                <span className="font-display text-xl">{selectedService?.name}</span>
              </div>

              <div className="flex justify-between items-end border-b border-[var(--color-brand-border)] pb-2">
                <span className="font-sans text-[var(--color-brand-muted)]">Profissional</span>
                <span className="font-display text-xl">{bLabel}</span>
              </div>

              <div className="flex justify-between items-end border-b border-[var(--color-brand-border)] pb-2">
                <span className="font-sans text-[var(--color-brand-muted)]">Data e Hora</span>
                <span className="font-display text-xl text-[var(--color-brand-amber)]">
                  {selectedSlot && format(parseISO(selectedSlot.time), "dd/MM 'às' HH:mm")}
                </span>
              </div>

              <div className="flex justify-between items-end pt-2">
                <span className="font-sans text-[var(--color-brand-muted)]">Total a pagar no local</span>
                <span className="font-display text-3xl">{formatCurrency(selectedService?.price || 0)}</span>
              </div>
            </div>

            <div className="bg-[var(--color-brand-base)] border border-[var(--color-brand-border)] p-4 flex flex-col gap-1 text-sm font-sans text-[var(--color-brand-muted)]">
              <strong className="text-[var(--color-brand-text)] font-mono">COITZ BARBEARIA</strong>
              <span>Av. Dr. João de Aguiar, 500 - Jacarezinho/PR</span>
              <span>Cancelamento com no mínimo 2h de antecedência.</span>
            </div>

            <button
              onClick={submitBooking}
              disabled={loading}
              className="w-full bg-[var(--color-brand-amber)] hover:bg-[var(--color-brand-amber-hover)] text-[var(--color-brand-base)] font-display text-2xl px-8 py-4 uppercase tracking-wide transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {loading ? 'CONFIRMANDO...' : 'CONFIRMAR AGENDAMENTO'}
            </button>
          </div>
        );
      case 6:
        return (
          <div className="text-center py-12 flex flex-col items-center gap-6">
            <div className="w-24 h-24 bg-[var(--color-brand-lime)] rounded-full flex items-center justify-center text-[var(--color-brand-base)]">
              <Check size={48} strokeWidth={3} />
            </div>
            <h2 className="font-display text-5xl uppercase text-[var(--color-brand-text)]">AGENDADO COM SUCESSO</h2>
            <p className="font-sans text-[var(--color-brand-muted)] max-w-sm">
              Seu horário está garantido em nosso sistema! Clique no botão abaixo para nos enviar uma mensagem e confirmar seu agendamento no WhatsApp.
            </p>

            <div className="flex flex-col gap-4 mt-8 w-full max-w-md">
              <button
                onClick={() => {
                  const dataStr = format(selectedSlot?.dateTime || new Date(), "dd/MM 'às' HH:mm");
                  const msg = `Olá! Acabei de fazer um agendamento pelo site.\n\n👤 Nome: ${clientInfo.name}\n✂️ Serviço: ${selectedService?.name}\n💈 Profissional: ${selectedBarber?.name?.split(' ')[0]}\n📅 Data/Hora: ${dataStr}`;
                  const encodedMsg = encodeURIComponent(msg);
                  // Substitua pelo número real da barbearia
                  const phone = "554391970920";
                  window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
                }}
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-display text-xl px-8 py-4 uppercase tracking-wide transition-colors flex items-center justify-center gap-2"
              >
                CONFIRMAR NO WHATSAPP
              </button>

              <button
                onClick={() => navigate('/')}
                className="w-full bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] hover:border-[var(--color-brand-amber)] text-[var(--color-brand-text)] font-display text-lg px-8 py-4 uppercase tracking-wide transition-colors"
              >
                VOLTAR PARA O INÍCIO
              </button>
            </div>
          </div>
        );
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return "ESCOLHA O SERVIÇO";
      case 2: return "ESCOLHA O PROFISSIONAL";
      case 3: return "DATA E HORÁRIO";
      case 4: return "SEUS DADOS";
      case 5: return "CONFIRMAÇÃO";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-brand-base)] text-[var(--color-brand-text)] font-sans flex flex-col">
      {/* Header */}
      <header className="h-20 border-b border-[var(--color-brand-border)] flex items-center px-6">
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between">
          <button onClick={prevStep} className="p-2 -ml-2 text-[var(--color-brand-muted)] hover:text-[var(--color-brand-amber)] transition-colors">
            <ArrowLeft size={24} />
          </button>
          <img src="/logo.jpg?v=3" alt="Coitz Logo" className="h-12 w-auto object-contain mix-blend-screen" />
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-6 py-12">
        {step < 6 && (
          <div className="mb-10">
            <div className="font-mono text-[var(--color-brand-amber)] text-xs mb-2">ETAPA {step} DE 5</div>
            <h1 className="font-display text-4xl sm:text-5xl uppercase tracking-tight">{getStepTitle()}</h1>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
