import React from 'react';
import { SavedReport } from '@services/reports-api';
import { Bookmark, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@components/ui/button';
import { CATEGORY_CONFIG } from './constants';
import { cn } from '@utils/cn';

interface ISavedReportsViewProps {
  savedReports?: SavedReport[];
  isSavedLoading: boolean;
  hasWrite: boolean;
  onLoadConfig: (report: SavedReport) => void;
  onDelete: (id: string) => void;
}

export const SavedReportsView: React.FC<ISavedReportsViewProps> = ({
  savedReports,
  isSavedLoading,
  hasWrite,
  onLoadConfig,
  onDelete,
}) => {
  if (isSavedLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Loading saved reports...</span>
      </div>
    );
  }

  if (savedReports?.length === 0) {
    return (
      <div className="h-48 border border-dashed border-border/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Bookmark className="h-8 w-8 opacity-30 animate-pulse" />
        <span className="text-xs">No saved report layouts registered</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/20 bg-card/20 shadow-sm text-xs">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border/20 bg-muted/20 text-muted-foreground font-black uppercase tracking-wider select-none">
            <th className="px-5 py-3">Report Name</th>
            <th className="px-5 py-3">Category</th>
            <th className="px-5 py-3">Configuration Parameters</th>
            <th className="px-5 py-3">Created By</th>
            <th className="px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/10 font-medium">
          {savedReports?.map((report) => {
            const catCfg = CATEGORY_CONFIG[report.category];
            const hasDateParams = report.config.fromDate || report.config.toDate;

            return (
              <tr key={report.id} className="hover:bg-accent/10 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-extrabold text-foreground">{report.name}</span>
                    <span className="text-[10px] text-muted-foreground">{report.description || 'No description'}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider', catCfg.bg, catCfg.text)}>
                    {catCfg.label}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground font-mono text-[10px]">
                  {hasDateParams
                    ? `Date range: ${report.config.fromDate || 'any'} to ${report.config.toDate || 'any'}`
                    : 'All-time cumulative'}
                </td>
                <td className="px-5 py-3.5 text-foreground font-bold">
                  {report.createdBy.firstName} {report.createdBy.lastName}
                </td>
                <td className="px-5 py-3.5 text-right flex justify-end gap-2">
                  <Button onClick={() => onLoadConfig(report)} variant="outline" size="sm" className="gap-1 px-2.5">
                    Load Layout <ChevronRight className="h-3 w-3" />
                  </Button>
                  {hasWrite && (
                    <Button
                      onClick={() => onDelete(report.id)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
