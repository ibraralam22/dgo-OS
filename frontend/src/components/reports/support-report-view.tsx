import React from 'react';

interface ISupportReportViewProps {
  supportData: {
    statuses: Array<{ status: string; count: number }>;
    priorities: Array<{ priority: string; count: number }>;
    categories: Array<{ category: string; count: number }>;
  };
}

export const SupportReportView: React.FC<ISupportReportViewProps> = ({ supportData }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Status breakdown */}
      <div className="glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
        <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Tickets by Status</h3>
        <div className="flex flex-col gap-3 mt-2">
          {supportData.statuses.map((st) => (
            <div key={st.status} className="flex justify-between items-center text-xs font-semibold">
              <span className="text-muted-foreground">{st.status}</span>
              <span className="bg-muted/30 border border-border/20 px-2.5 py-0.5 rounded-lg text-[10px] text-foreground font-black font-mono">{st.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Priorities count */}
      <div className="glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
        <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Tickets by Priority</h3>
        <div className="flex flex-col gap-3 mt-2">
          {supportData.priorities.map((pr) => (
            <div key={pr.priority} className="flex justify-between items-center text-xs font-semibold">
              <span className="text-muted-foreground">{pr.priority}</span>
              <span className="bg-muted/30 border border-border/20 px-2.5 py-0.5 rounded-lg text-[10px] text-foreground font-black font-mono">{pr.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Categories count */}
      <div className="glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
        <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none font-black">Tickets by Category</h3>
        <div className="flex flex-col gap-3 mt-2">
          {supportData.categories.map((cat) => (
            <div key={cat.category} className="flex justify-between items-center text-xs font-semibold">
              <span className="text-muted-foreground">{cat.category}</span>
              <span className="bg-muted/30 border border-border/20 px-2.5 py-0.5 rounded-lg text-[10px] text-foreground font-black font-mono">{cat.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
