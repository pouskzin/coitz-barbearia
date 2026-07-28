import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MonthlyChartProps {
  data: {
    mes: string;
    faturamento: number;
  }[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  return (
    <div className="bg-[var(--color-brand-surface)] p-6 border border-[var(--color-brand-border)] mb-8 shadow-sm">
      <h2 className="font-display text-2xl mb-6 text-[var(--color-brand-text)]">Faturamento Mensal (Últimos 6 Meses)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis 
            dataKey="mes" 
            stroke="var(--color-brand-muted)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="var(--color-brand-muted)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(value) => `R$ ${value}`}
          />
          <Tooltip 
            formatter={(value: number) => [`R$ ${value.toFixed(2).replace('.', ',')}`, 'Faturamento']}
            cursor={{ fill: 'var(--color-brand-muted)', opacity: 0.1 }}
            contentStyle={{ 
              backgroundColor: 'var(--color-brand-surface)', 
              borderColor: 'var(--color-brand-border)',
              color: 'var(--color-brand-text)'
            }}
          />
          <Bar 
            dataKey="faturamento" 
            fill="var(--color-brand-amber)" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
