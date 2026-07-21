'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { opportunitiesApi, OpportunityStage } from '@services/opportunities-api';
import { toast } from '@utils/toast';
import { useAuthStore } from '@store/auth-store';
import Link from 'next/link';
import {
  ArrowLeft,
  Coins,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  User,
  Loader2,
  FileText,
  Clock,
  History,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
} from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import OpportunityModal from '@components/opportunities/opportunity-modal';
import QuotationModal from '@components/opportunities/quotation-modal';
import { quotationsApi, QuotationStatus } from '@services/quotations-api';
import { cn } from '@utils/cn';
import { QuotationsList } from '@components/opportunities/quotations-list';
import { AuditTimeline } from '@components/opportunities/audit-timeline';

const STAGE_STEPS: { stage: OpportunityStage; label: string; prob: number }[] = [
  { stage: 'DISCOVERY', label: 'Discovery', prob: 10 },
  { stage: 'PROPOSAL', label: 'Proposal', prob: 40 },
  { stage: 'NEGOTIATION', label: 'Negotiation', prob: 70 },
  { stage: 'CLOSED_WON', label: 'Closed Won', prob: 100 },
  { stage: 'CLOSED_LOST', label: 'Closed Lost', prob: 0 },
];

export default function OpportunityDetailWorkspace() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const id = params.id as string;

  // Selected stage in the stepper to preview or transition
  const [selectedStepperStage, setSelectedStepperStage] = useState<OpportunityStage | null>(null);

  // Quotation states
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(undefined);

  // Transition form fields
  const [contractUrl, setContractUrl] = useState('');
  const [lossReason, setLossReason] = useState('');
  const [competitorLostTo, setCompetitorLostTo] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Queries
  const { data: opportunity, isLoading, isError } = useQuery({
    queryKey: ['opportunity-detail', id],
    queryFn: () => opportunitiesApi.get(id),
  });

  const { data: auditLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['opportunity-audit-logs', id],
    queryFn: () => opportunitiesApi.getLogs(id),
  });

  const { data: quotationsResponse, isLoading: loadingQuotes } = useQuery({
    queryKey: ['quotations-list', id],
    queryFn: () => quotationsApi.list({ opportunityId: id }),
  });
  const quotations = quotationsResponse?.data || [];

  // Mutations
  const transitionMutation = useMutation({
    mutationFn: (payload: { stage: OpportunityStage; contractUrl?: string; lossReason?: string; competitorLostTo?: string }) =>
      opportunitiesApi.transitionStage(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-audit-logs', id] });
      queryClient.invalidateQueries({ queryKey: ['opportunities-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast.success(`Deal transitioned to ${data.opportunity.stage}`);
      setSelectedStepperStage(null);
      setContractUrl('');
      setLossReason('');
      setCompetitorLostTo('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Transition failed';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => opportunitiesApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-audit-logs', id] });
      toast.success('High-value deal approved successfully by Sales leadership');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to approve deal';
      toast.error(msg);
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: (quoteId: string) => quotationsApi.delete(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations-list', id] });
      toast.success('Quotation draft deleted successfully');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to delete quotation';
      toast.error(msg);
    },
  });

  const approveQuoteMutation = useMutation({
    mutationFn: (quoteId: string) => quotationsApi.approve(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations-list', id] });
      toast.success('Discount approved successfully');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to approve quotation';
      toast.error(msg);
    },
  });

  const transitionQuoteMutation = useMutation({
    mutationFn: (params: { quoteId: string; status: QuotationStatus }) =>
      quotationsApi.transitionStatus(params.quoteId, params.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations-list', id] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-detail', id] });
      toast.success('Quotation status updated');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update quotation';
      toast.error(msg);
    },
  });

  // Access rights check
  const hasWriteAccess = user?.permissions.includes('opportunities:write') ?? false;
  const hasApproveAccess = user?.permissions.includes('opportunities:approve') ?? false;
  const hasQuoteWriteAccess = user?.permissions.includes('quotations:write') ?? false;
  const hasQuoteApproveAccess = user?.permissions.includes('quotations:approve') ?? false;

  const handleStepperClick = (stage: OpportunityStage) => {
    if (!hasWriteAccess) return;
    if (stage === opportunity?.stage) {
      setSelectedStepperStage(null);
    } else {
      setSelectedStepperStage(stage);
    }
  };

  const handleTransitionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStepperStage) return;

    if (selectedStepperStage === 'CLOSED_WON' && !contractUrl.trim()) {
      toast.error('Contract URL is required to close-won a deal');
      return;
    }
    if (selectedStepperStage === 'CLOSED_LOST' && !lossReason.trim()) {
      toast.error('Reason for loss is required');
      return;
    }

    transitionMutation.mutate({
      stage: selectedStepperStage,
      contractUrl: selectedStepperStage === 'CLOSED_WON' ? contractUrl.trim() : undefined,
      lossReason: selectedStepperStage === 'CLOSED_LOST' ? lossReason.trim() : undefined,
      competitorLostTo: selectedStepperStage === 'CLOSED_LOST' && competitorLostTo.trim() ? competitorLostTo.trim() : undefined,
    });
  };

  const formatCurrency = (val: number | string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(val));

  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Retrieving deal metrics...</span>
      </div>
    );
  }

  if (isError || !opportunity) {
    return (
      <div className="h-96 border border-dashed border-border/25 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <ShieldAlert className="h-10 w-10 text-rose-500 opacity-60 animate-bounce" />
        <span className="text-sm font-bold text-foreground">Failed to Load Profile</span>
        <span className="text-xs">This deal may have been archived or deleted.</span>
      </div>
    );
  }

  // Calculate current active step index
  const activeStepIdx = STAGE_STEPS.findIndex((s) => s.stage === opportunity.stage);

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-300">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/opportunities" className="p-2 border border-border/20 rounded-xl hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider bg-card/60 px-2 py-0.5 rounded border border-border/10">
              Deal Workspace
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">ID: {opportunity.id}</span>
          </div>
          <h1 className="text-xl font-black text-foreground tracking-tight">{opportunity.name}</h1>
        </div>
      </div>

      {/* Pipeline Stage Progress Stepper */}
      <div className="glass-card border border-border/20 rounded-2xl p-6 bg-card/10 flex flex-col gap-4 shadow-sm">
        <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Pipeline Transition Stage</h3>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-2 mt-4 relative">
          {STAGE_STEPS.map((step, idx) => {
            const isCompleted = idx < activeStepIdx;
            const isCurrent = idx === activeStepIdx;
            const isSelected = selectedStepperStage === step.stage;

            return (
              <div
                key={step.stage}
                onClick={() => handleStepperClick(step.stage)}
                className={cn(
                  'flex-1 flex flex-col items-center md:items-start p-3.5 rounded-xl border transition-all select-none relative',
                  hasWriteAccess ? 'cursor-pointer hover:border-primary/50' : 'cursor-default',
                  isCurrent ? 'bg-primary/10 border-primary text-primary font-black shadow shadow-primary/10' :
                  isCompleted ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-400 font-semibold' :
                  isSelected ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-black scale-[1.02]' :
                  'bg-card/30 border-border/20 text-muted-foreground'
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest">{step.label}</span>
                </div>
                <span className="text-[10px] mt-1 opacity-70">{step.prob}% Win Prob.</span>
              </div>
            );
          })}
        </div>

        {/* Stepper transition panels */}
        {selectedStepperStage && (
          <form onSubmit={handleTransitionSubmit} className="mt-4 p-5 rounded-2xl border border-border/40 bg-accent/5 flex flex-col gap-4 animate-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between border-b border-border/10 pb-2">
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest">
                Transition to Stage: {STAGE_STEPS.find((s) => s.stage === selectedStepperStage)?.label}
              </h4>
              <Button variant="ghost" size="sm" onClick={() => setSelectedStepperStage(null)} className="h-7 w-7 rounded-lg">
                ✕
              </Button>
            </div>

            {selectedStepperStage === 'CLOSED_WON' && (
              <div className="flex flex-col gap-1.5 max-w-md">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Signed Contract Drive URL *</label>
                <Input
                  required
                  placeholder="https://drive.google.com/..."
                  value={contractUrl}
                  onChange={(e) => setContractUrl(e.target.value)}
                />
              </div>
            )}

            {selectedStepperStage === 'CLOSED_LOST' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Reason for Loss *</label>
                  <Input
                    required
                    placeholder="e.g. Budget limitations, competitor features"
                    value={lossReason}
                    onChange={(e) => setLossReason(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Competitor Lost To</label>
                  <Input
                    placeholder="e.g. Salesforce, HubSpot (Optional)"
                    value={competitorLostTo}
                    onChange={(e) => setCompetitorLostTo(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 justify-end mt-2">
              <Button
                type="submit"
                disabled={transitionMutation.isPending}
                size="sm"
                className="gap-1.5 bg-primary text-primary-foreground"
              >
                {transitionMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Stage Transition
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Main Workspace Section: Deal details + quotation + logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: General Profile Card details */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          <div className="glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/10 pb-4">
              <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">General Deal Parameters</h3>
              {hasWriteAccess && (
                <Button onClick={() => setIsEditModalOpen(true)} variant="outline" size="sm" className="h-8 border-border/40 text-foreground">
                  Modify Parameters
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold leading-relaxed">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Coins className="h-3.5 w-3.5" /> Projected Value Budget</span>
                <span className="text-lg font-black text-foreground mt-0.5">{formatCurrency(opportunity.amount)}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Target Close Date</span>
                <span className="text-sm font-bold text-foreground mt-1">
                  {opportunity.closeDate ? new Date(opportunity.closeDate).toLocaleDateString() : 'Unspecified'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><User className="h-3.5 w-3.5" /> Assigned Account Manager</span>
                <span className="text-xs font-bold text-foreground mt-1">
                  {opportunity.owner ? `${opportunity.owner.firstName} ${opportunity.owner.lastName} (${opportunity.owner.email})` : 'Unassigned'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Linked Client Account</span>
                <Link
                  href={`/dashboard/clients/${opportunity.accountId}`}
                  className="text-xs font-black text-primary hover:underline hover:text-primary-foreground mt-1"
                >
                  {opportunity.account?.name} ({opportunity.account?.domain})
                </Link>
              </div>
            </div>

            {/* Special VP Level Approval Notification Badge */}
            {opportunity.requiresApproval && (
              <div className={cn(
                'mt-2 p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4',
                opportunity.approved ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-amber-500/5 border-amber-500/25'
              )}>
                <div className="flex items-start gap-3">
                  {opportunity.approved ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-foreground">
                      {opportunity.approved ? 'VP Authorization Cleared' : 'VP Level Authorization Required'}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-relaxed">
                      Deals exceeding $150,000 budget scope trigger system governance policies.
                    </span>
                  </div>
                </div>

                {!opportunity.approved && hasApproveAccess && (
                  <Button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold shrink-0 self-end md:self-auto"
                    size="sm"
                  >
                    {approveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                    Grant VP Approval
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Quotations snapshot builder container */}
          <div className="glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/10 pb-4">
              <div>
                <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Deal Quotation Versions</h3>
                <p className="text-[10px] text-muted-foreground mt-1">Version snapshots mapped directly to billing proposals.</p>
              </div>
              {hasQuoteWriteAccess && (
                <Button onClick={() => { setSelectedQuotation(undefined); setIsQuoteModalOpen(true); }} size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Generate Quote
                </Button>
              )}
            </div>

            <QuotationsList
              quotations={quotations}
              loadingQuotes={loadingQuotes}
              hasQuoteWriteAccess={hasQuoteWriteAccess}
              hasQuoteApproveAccess={hasQuoteApproveAccess}
              onEdit={(quote) => { setSelectedQuotation(quote); setIsQuoteModalOpen(true); }}
              onDelete={(id) => deleteQuoteMutation.mutate(id)}
              isDeleting={deleteQuoteMutation.isPending}
              onTransitionStatus={(quoteId, status) => transitionQuoteMutation.mutate({ quoteId, status })}
              isTransitioning={transitionQuoteMutation.isPending}
              onApprove={(id) => approveQuoteMutation.mutate(id)}
              isApproving={approveQuoteMutation.isPending}
            />
          </div>
        </div>

        {/* Right Grid: Audit Timeline Logs */}
        <AuditTimeline auditLogs={auditLogs} loadingLogs={loadingLogs} />
      </div>

      {/* Edit Modal */}
      <OpportunityModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        opportunity={opportunity}
      />

      {/* Quotation Builder Modal */}
      <QuotationModal
        isOpen={isQuoteModalOpen}
        onClose={() => {
          setIsQuoteModalOpen(false);
          setSelectedQuotation(undefined);
        }}
        opportunityId={id}
        quotation={selectedQuotation}
      />
    </div>
  );
}
