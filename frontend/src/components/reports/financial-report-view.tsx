import React from 'react';
import { FileText, DollarSign } from 'lucide-react';
import { formatCurrency } from './constants';

interface IFinancialReportViewProps {
  financialData: {
    invoicesCount: number;
    totalBilled: number;
    totalPaid: number;
    totalOutstanding: number;
    statuses: Array<{ status: string; count: number }>;
    paymentMethods: Array<{ method: string; count: number; value: number }>;
  };
}

export const FinancialReportView: React.FC<IFinancialReportViewProps> = ({ financialData }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Financial KPIs */}
      <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: financialData.invoicesCount, icon: <FileText className="h-6 w-6 text-primary/40" /> },
          { label: 'Revenue Billed', value: formatCurrency(financialData.totalBilled), icon: <DollarSign className="h-6 w-6 text-indigo-500/40" /> },
          { label: 'Collected Revenue', value: formatCurrency(financialData.totalPaid), icon: <DollarSign className="h-6 w-6 text-emerald-500/40" /> },
          { label: 'Outstanding Balance', value: formatCurrency(financialData.totalOutstanding), icon: <DollarSign className="h-6 w-6 text-rose-500/40" /> },
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

      {/* Invoices Status breakdown */}
      <div className="glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
        <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none font-black">Invoices status metrics</h3>
        <div className="flex flex-col gap-3 mt-2">
          {financialData.statuses.map((st) => (
            <div key={st.status} className="flex justify-between items-center text-xs font-semibold">
              <span className="text-muted-foreground">{st.status}</span>
              <span className="bg-muted/30 border border-border/20 px-2.5 py-0.5 rounded-lg text-[10px] text-foreground font-black font-mono">{st.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment methods list */}
      <div className="lg:col-span-2 glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
        <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none font-black">Collected Payments by Method</h3>
        <div className="flex flex-col gap-4 mt-2">
          {financialData.paymentMethods.length === 0 ? (
            <span className="text-xs text-muted-foreground py-4">No payments recorded in this range</span>
          ) : (
            financialData.paymentMethods.map((pm) => {
              const totalCollected = financialData.totalPaid || 1;
              const pct = (pm.value / totalCollected) * 100;
              return (
                <div key={pm.method} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-foreground">{pm.method} ({pm.count} logs)</span>
                    <span className="text-muted-foreground">{formatCurrency(pm.value)}</span>
                  </div>
                  <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
