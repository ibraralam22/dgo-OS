import React from 'react';
import { Briefcase, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';
import { formatCurrency } from './constants';

interface ISalesReportViewProps {
  salesData: {
    totalDeals: number;
    winRate: number;
    pipelineValue: number;
    averageDealSize: number;
    stages: Array<{ stage: string; count: number; value: number }>;
  };
}

export const SalesReportView: React.FC<ISalesReportViewProps> = ({ salesData }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sales KPIs */}
      <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Deals', value: salesData.totalDeals, icon: <Briefcase className="h-6 w-6 text-primary/40" /> },
          { label: 'Win/Loss Rate', value: `${salesData.winRate}%`, icon: <TrendingUp className="h-6 w-6 text-emerald-500/40" /> },
          { label: 'Pipeline Value', value: formatCurrency(salesData.pipelineValue), icon: <DollarSign className="h-6 w-6 text-indigo-500/40" /> },
          { label: 'Average Deal Size', value: formatCurrency(salesData.averageDealSize), icon: <DollarSign className="h-6 w-6 text-indigo-500/40" /> },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card border border-border/25 rounded-2xl p-4 bg-card/30 flex items-center justify-between shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{kpi.label}</span>
              <span className="text-lg font-black mt-1 text-foreground">{kpi.value}</span>
            </div>
            {kpi.icon}
          </div>
        ))}
      </div>

      {/* Stages breakdown */}
      <div className="lg:col-span-2 glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
        <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Pipeline Distribution by Stage</h3>
        <div className="flex flex-col gap-4 mt-2">
          {salesData.stages.length === 0 ? (
            <span className="text-xs text-muted-foreground py-4">No opportunities data in this range</span>
          ) : (
            salesData.stages.map((st) => {
              const pct = salesData.pipelineValue > 0 ? (st.value / salesData.pipelineValue) * 100 : 0;
              return (
                <div key={st.stage} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-foreground">{st.stage} ({st.count} deals)</span>
                    <span className="text-muted-foreground">{formatCurrency(st.value)}</span>
                  </div>
                  <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* General Advice */}
      <div className="glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-3 shadow-sm justify-between">
        <div className="flex flex-col gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500 opacity-60" />
          <h4 className="text-xs font-bold text-foreground">SaaS Sales Analysis</h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">Ensure active pipeline deals are updated with correct closing date targets. Heavy skewing in early discovery phases represents marketing pipeline velocity gaps.</p>
        </div>
      </div>
    </div>
  );
};
