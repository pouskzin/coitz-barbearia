import { Dispatch, SetStateAction } from "react";

export interface FiltersState {
  date: string;
  status: string;
  barber: string;
  service: string;
}

interface FiltersBarProps {
  filters: FiltersState;
  setFilters: Dispatch<SetStateAction<FiltersState>>;
  barbers: any[];
  services: any[];
}

export function FiltersBar({ filters, setFilters, barbers, services }: FiltersBarProps) {
  const updateFilter = (key: keyof FiltersState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-4 mb-8 flex flex-col lg:flex-row gap-4 items-center shadow-sm">
      <div className="flex-1 w-full lg:w-auto flex flex-col gap-1">
        <label className="font-mono text-[10px] text-[var(--color-brand-muted)] uppercase">Data</label>
        <select 
          value={filters.date} 
          onChange={(e) => updateFilter('date', e.target.value)}
          className="w-full bg-transparent border border-[var(--color-brand-border)] text-sm p-2 text-[var(--color-brand-text)] focus:outline-none focus:border-[var(--color-brand-amber)] font-sans"
        >
          <option value="all" className="bg-[var(--color-brand-base)]">Todos os Dias</option>
          <option value="today" className="bg-[var(--color-brand-base)]">Hoje</option>
          <option value="tomorrow" className="bg-[var(--color-brand-base)]">Amanhã</option>
        </select>
      </div>

      <div className="flex-1 w-full lg:w-auto flex flex-col gap-1">
        <label className="font-mono text-[10px] text-[var(--color-brand-muted)] uppercase">Status</label>
        <select 
          value={filters.status} 
          onChange={(e) => updateFilter('status', e.target.value)}
          className="w-full bg-transparent border border-[var(--color-brand-border)] text-sm p-2 text-[var(--color-brand-text)] focus:outline-none focus:border-[var(--color-brand-amber)] font-sans"
        >
          <option value="all" className="bg-[var(--color-brand-base)]">Todos os Status</option>
          <option value="active" className="bg-[var(--color-brand-base)]">A Confirmar / Ativos</option>
          <option value="completed" className="bg-[var(--color-brand-base)]">Concluídos</option>
          <option value="cancelled" className="bg-[var(--color-brand-base)]">Cancelados / Faltas</option>
        </select>
      </div>

      <div className="flex-1 w-full lg:w-auto flex flex-col gap-1">
        <label className="font-mono text-[10px] text-[var(--color-brand-muted)] uppercase">Profissional</label>
        <select 
          value={filters.barber} 
          onChange={(e) => updateFilter('barber', e.target.value)}
          className="w-full bg-transparent border border-[var(--color-brand-border)] text-sm p-2 text-[var(--color-brand-text)] focus:outline-none focus:border-[var(--color-brand-amber)] font-sans"
        >
          <option value="all" className="bg-[var(--color-brand-base)]">Todos os Profissionais</option>
          {barbers.map(b => (
            <option key={b.id} value={b.id.toString()} className="bg-[var(--color-brand-base)]">{b.name}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 w-full lg:w-auto flex flex-col gap-1">
        <label className="font-mono text-[10px] text-[var(--color-brand-muted)] uppercase">Serviço</label>
        <select 
          value={filters.service} 
          onChange={(e) => updateFilter('service', e.target.value)}
          className="w-full bg-transparent border border-[var(--color-brand-border)] text-sm p-2 text-[var(--color-brand-text)] focus:outline-none focus:border-[var(--color-brand-amber)] font-sans"
        >
          <option value="all" className="bg-[var(--color-brand-base)]">Todos os Serviços</option>
          {services.map(s => (
            <option key={s.id} value={s.id.toString()} className="bg-[var(--color-brand-base)]">{s.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
