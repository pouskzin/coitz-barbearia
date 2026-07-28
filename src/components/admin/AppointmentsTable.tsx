import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, X, User } from 'lucide-react';
import { formatPrice } from '../../lib/utils';

interface AppointmentsTableProps {
  appointments: any[];
  barbers: any[];
  services: any[];
  updateStatus: (id: number, status: string) => void;
}

export function AppointmentsTable({ appointments, barbers, services, updateStatus }: AppointmentsTableProps) {
  return (
    <div className="grid gap-4 mb-8">
      {appointments.map(apt => {
        const date = new Date(apt.startTime);
        const barberName = (barbers.find(b => b.id === apt.barberId)?.name || 'Desconhecido').split(' ')[0];
        const serviceName = services.find(s => s.id === apt.serviceId)?.name || 'Serviço Desconhecido';

        return (
          <div key={apt.id} className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-[var(--color-brand-amber)] transition-colors">
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center justify-center bg-[var(--color-brand-base)] w-20 h-20 border border-[var(--color-brand-border)] shrink-0">
                <span className="font-mono text-xs text-[var(--color-brand-muted)] uppercase">{format(date, 'MMM', { locale: ptBR })}</span>
                <span className="font-display text-3xl">{format(date, 'dd')}</span>
              </div>

              <div>
                <div className="font-mono text-xl text-[var(--color-brand-amber)] mb-1">{format(date, 'HH:mm')}</div>
                <div className="font-display text-2xl uppercase text-[var(--color-brand-text)]">{apt.clientName}</div>
                <div className="flex flex-wrap items-center gap-4 mt-1 font-sans text-sm text-[var(--color-brand-muted)]">
                  <span className="flex items-center gap-1"><User size={14} /> {barberName}</span>
                  <span>{serviceName} - <strong className="text-[var(--color-brand-amber)] font-normal">{formatPrice(apt.totalPrice)}</strong></span>
                  <span>{apt.clientPhone}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:self-stretch">
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
                <span className="font-mono text-xs border border-[var(--color-brand-lime)] text-[var(--color-brand-lime)] px-3 py-1 bg-[var(--color-brand-lime)]/5 w-full text-center md:w-auto">
                  ATENDIMENTO CONCLUÍDO
                </span>
              )}
              {apt.status === 'no_show' && (
                <span className="font-mono text-xs border border-red-500 text-red-500 px-3 py-1 bg-red-500/5 w-full text-center md:w-auto">
                  FALTOU
                </span>
              )}
              {apt.status === 'cancelled' && (
                <span className="font-mono text-xs border border-[var(--color-brand-muted)] text-[var(--color-brand-muted)] px-3 py-1 bg-[var(--color-brand-muted)]/5 w-full text-center md:w-auto">
                  CANCELADO
                </span>
              )}
            </div>
          </div>
        );
      })}

      {appointments.length === 0 && (
        <div className="text-center py-12 border border-[var(--color-brand-border)] font-mono text-[var(--color-brand-muted)] bg-[var(--color-brand-surface)] shadow-sm">
          NENHUM AGENDAMENTO ENCONTRADO
        </div>
      )}
    </div>
  );
}
