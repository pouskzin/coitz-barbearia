import { formatPrice } from "../../lib/utils";

interface MetricsCardsProps {
  metrics: {
    totalClients: number;
    totalServices: number;
    employees: number;
    appointmentsCount: number;
    monthRevenue: number;
  };
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      <MetricCard label="Total Clientes" value={metrics.totalClients} />
      <MetricCard label="Total Serviços" value={metrics.totalServices} />
      <MetricCard label="Funcionários" value={metrics.employees} />
      <MetricCard label="Agendamentos" value={metrics.appointmentsCount} />
      <MetricCard label="Saldo (mês)" value={formatPrice(metrics.monthRevenue)} />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-4 shadow-sm flex flex-col justify-center">
      <h3 className="font-mono text-xs text-[var(--color-brand-muted)] uppercase mb-2">{label}</h3>
      <p className="font-display text-3xl text-[var(--color-brand-text)]">{value}</p>
    </div>
  );
}
