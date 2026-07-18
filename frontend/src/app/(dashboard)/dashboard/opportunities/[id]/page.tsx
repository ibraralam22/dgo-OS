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
} from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import OpportunityModal from '@components/opportunities/opportunity-modal';
import QuotationModal from '@components/opportunities/quotation-modal';
import { quotationsApi } from '@services/quotations-api';
import { cn } from '@utils/cn';
import { Plus, Trash2, Send, Check } from 'lucide-react';

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
      const msg = err?.response?.data?.message || 'Approval failed';
      toast.error(msg);
    },
  });

  // Fetch Quotations related to this Opportunity
  const { data: quotationsResponse, isLoading: loadingQuotes } = useQuery({
    queryKey: ['quotations-list', id],
    queryFn: () => quotationsApi.list({ opportunityId: id }),
  });
  const quotations = quotationsResponse?.data || [];

  // Quotations mutations
  const deleteQuoteMutation = useMutation({
    mutationFn: (quoteId: string) => quotationsApi.delete(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations-list', id] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-detail', id] });
      toast.success('Quotation deleted successfully');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to delete quotation';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  const approveQuoteMutation = useMutation({
    mutationFn: (quoteId: string) => quotationsApi.approve(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations-list', id] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-detail', id] });
      toast.success('Quotation discount approved successfully');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to approve quotation';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  const transitionQuoteMutation = useMutation({
    mutationFn: (params: { quoteId: string; status: any }) =>
      quotationsApi.transitionStatus(params.quoteId, params.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations-list', id] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast.success('Quotation status updated successfully');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update status';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-2 text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading workspace environment...</span>
      </div>
    );
  }

  if (isError || !opportunity) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4 text-foreground">
        <AlertTriangle className="h-10 w-10 text-rose-400" />
        <div className="flex flex-col items-center">
          <span className="text-md font-bold">Opportunity Workspace Unavailable</span>
          <span className="text-xs text-muted-foreground">The requested deal record does not exist or access was denied.</span>
        </div>
        <Link href="/dashboard/opportunities">
          <Button size="sm" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Pipeline
          </Button>
        </Link>
      </div>
    );
  }

  const hasWriteAccess = user?.permissions.includes('opportunities:write') ?? false;
  const hasApproveAccess = user?.permissions.includes('opportunities:approve') ?? false;
  const hasQuoteWriteAccess = user?.permissions.includes('quotations:write') ?? false;
  const hasQuoteApproveAccess = user?.permissions.includes('quotations:approve') ?? false;

  const currentStageIndex = STAGE_STEPS.findIndex((s) => s.stage === opportunity.stage);
  const weightedValue = Number(opportunity.amount) * (opportunity.probability / 100);

  const getStageBadgeClass = (st: OpportunityStage) => {
    switch (st) {
      case 'DISCOVERY': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'PROPOSAL': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'NEGOTIATION': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'CLOSED_WON': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'CLOSED_LOST': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
  };

  const handleStepperClick = (targetStage: OpportunityStage) => {
    if (targetStage === opportunity.stage) return;
    
    // Check locking mechanism
    const isCurrentlyClosed = opportunity.stage === 'CLOSED_WON' || opportunity.stage === 'CLOSED_LOST';
    const isAuthorizedToReopen = user?.role === 'SuperAdmin' || user?.role === 'TenantAdmin';

    if (isCurrentlyClosed && !isAuthorizedToReopen) {
      toast.error('Once a deal is Won/Lost, it is locked. Stage changes require TenantAdmin verification.');
      return;
    }

    if (!hasWriteAccess) {
      toast.error('You do not have write permissions to modify deals.');
      return;
    }

    setSelectedStepperStage(targetStage);
  };

  const handleConfirmTransition = () => {
    if (!selectedStepperStage) return;

    if (selectedStepperStage === 'CLOSED_WON' && !contractUrl.trim()) {
      toast.error('A Signed SOW/Contract draft link is required to close as Won.');
      return;
    }

    if (selectedStepperStage === 'CLOSED_LOST' && !lossReason.trim()) {
      toast.error('Please specify a loss reason to close as Lost.');
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

  return (
    <div className="flex flex-col gap-8 text-foreground">
      {/* Breadcrumb Back Navigation */}
      <div>
        <Link
          href="/dashboard/opportunities"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground group transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Deals Pipeline
        </Link>
      </div>

      {/* Header Panel */}
      <div className="glass-card border border-border/20 rounded-2xl p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card/45">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight">{opportunity.name}</h1>
            <span className={cn('px-2 py-0.5 rounded text-xs font-bold border', getStageBadgeClass(opportunity.stage))}>
              {opportunity.stage.replace('_', ' ')}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Linked B2B Account:{' '}
            <Link
              href={`/dashboard/clients?tab=accounts`}
              className="text-primary hover:underline font-semibold"
            >
              {opportunity.account?.name}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasWriteAccess && (
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
              Edit Deal Parameters
            </Button>
          )}
        </div>
      </div>

      {/* Stage Progression Stepper */}
      <div className="glass-card border border-border/20 rounded-2xl p-6 bg-card/30 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground pl-0.5">Stage Progression Stepper</h2>
          <p className="text-xs text-muted-foreground">Click a stage below to qualify, negotiate or close the deal.</p>
        </div>

        {/* Stepper Steps UI */}
        <div className="relative flex items-center justify-between w-full mt-2">
          {/* Stepper bar connector background */}
          <div className="absolute left-0 right-0 h-1 bg-border/20 z-0 top-[18px]" />
          
          {/* Active progress connector bar */}
          <div 
            className="absolute left-0 h-1 bg-primary/60 z-0 top-[18px] transition-all duration-500" 
            style={{ width: `${(currentStageIndex / (STAGE_STEPS.length - 1)) * 100}%` }}
          />

          {STAGE_STEPS.map((s, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            const isClosedLost = opportunity.stage === 'CLOSED_LOST' && s.stage === 'CLOSED_LOST';
            const isClosedWon = opportunity.stage === 'CLOSED_WON' && s.stage === 'CLOSED_WON';
            
            return (
              <button
                key={s.stage}
                onClick={() => handleStepperClick(s.stage)}
                className="relative z-10 flex flex-col items-center focus:outline-none cursor-pointer group"
              >
                {/* Stepper Circle */}
                <div
                  className={cn(
                    'h-9 w-9 rounded-full flex items-center justify-center border font-bold text-xs shadow transition-all duration-300',
                    isCompleted && 'bg-primary border-primary text-primary-foreground',
                    isCurrent && 'bg-card border-primary text-primary ring-4 ring-primary/20 scale-105',
                    !isCompleted && !isCurrent && 'bg-card border-border/40 text-muted-foreground hover:border-border',
                    isClosedLost && 'bg-rose-500 border-rose-500 text-white',
                    isClosedWon && 'bg-emerald-500 border-emerald-500 text-white'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : s.stage === 'CLOSED_LOST' && isClosedLost ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                {/* Label */}
                <span
                  className={cn(
                    'text-[10px] font-bold mt-2 tracking-tight transition-colors',
                    isCurrent && 'text-primary font-black',
                    !isCurrent && 'text-muted-foreground group-hover:text-foreground'
                  )}
                >
                  {s.label}
                </span>
                <span className="text-[8px] text-muted-foreground font-semibold">({s.prob}%)</span>
              </button>
            );
          })}
        </div>

        {/* Transition Drawer Actions */}
        {selectedStepperStage && (
          <div className="border-t border-border/20 pt-5 mt-2 animate-in fade-in duration-300 flex flex-col gap-4 bg-muted/5 p-4 rounded-xl">
            <div className="flex items-center justify-between border-b border-border/10 pb-2">
              <span className="text-sm font-bold text-foreground">
                Qualify Opportunity to stage:{' '}
                <span className="text-primary font-black">{selectedStepperStage.replace('_', ' ')}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStepperStage(null)}
              >
                Cancel
              </Button>
            </div>

            {/* If target stage is CLOSED_WON: mandate SOW link */}
            {selectedStepperStage === 'CLOSED_WON' && (
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                  Signed Statement of Work (SOW) Link *
                </label>
                <Input
                  value={contractUrl}
                  onChange={(e) => setContractUrl(e.target.value)}
                  placeholder="https://secure-storage.decentglobal.com/contracts/sow_acme_102.pdf"
                />
                <span className="text-[10px] text-muted-foreground pl-0.5">
                  Gate Check: Transitioning to CLOSED_WON automatically spawns the project delivery onboarding flow.
                </span>
              </div>
            )}

            {/* If target stage is CLOSED_LOST: mandate loss post-mortem logs */}
            {selectedStepperStage === 'CLOSED_LOST' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                    Post-Mortem Loss Reason *
                  </label>
                  <textarea
                    rows={2}
                    value={lossReason}
                    onChange={(e) => setLossReason(e.target.value)}
                    placeholder="e.g. Competitor undercut pricing by 15%, technical mismatch in squad architecture."
                    className="w-full rounded-lg border border-border bg-card text-sm text-foreground p-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                    Competitor Lost To
                  </label>
                  <Input
                    value={competitorLostTo}
                    onChange={(e) => setCompetitorLostTo(e.target.value)}
                    placeholder="e.g. Accenture, Infosys (Optional)"
                  />
                </div>
              </div>
            )}

            {/* Standard confirmations */}
            {selectedStepperStage !== 'CLOSED_WON' && selectedStepperStage !== 'CLOSED_LOST' && (
              <p className="text-xs text-muted-foreground pl-0.5">
                Confirming transition will update the deal probability to{' '}
                <span className="font-bold text-foreground">
                  {STAGE_STEPS.find((s) => s.stage === selectedStepperStage)?.prob}%
                </span>
                .
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <Button
                size="sm"
                onClick={handleConfirmTransition}
                disabled={transitionMutation.isPending}
                className="gap-2"
              >
                {transitionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Transition Stage
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Layout Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Grid: Financials & Deal Details */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Projections Card */}
          <div className="glass-card border border-border/20 rounded-2xl p-6 bg-card/30 flex flex-col gap-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/10 pb-2">
              Financial Projections
            </h3>

            {/* VP Approval Banner */}
            {opportunity.requiresApproval && (
              <div
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border',
                  opportunity.approved
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                )}
              >
                {opportunity.approved ? (
                  <ShieldCheck className="h-6 w-6 shrink-0" />
                ) : (
                  <ShieldAlert className="h-6 w-6 shrink-0" />
                )}
                <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {opportunity.approved ? 'Deal Approved' : 'Administrative Approval Pending'}
                    </span>
                    <span className="text-[11px] opacity-80">
                      {opportunity.approved
                        ? 'This deal has been vetted and cleared by sales leadership.'
                        : 'Deals exceeding $10,000,000 require Sales VP approval before transitioning to Won.'}
                    </span>
                  </div>
                  {!opportunity.approved && hasApproveAccess && (
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate()}
                      disabled={approveMutation.isPending}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-7 shrink-0 cursor-pointer"
                    >
                      {approveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                      Approve Deal
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Metrics grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex flex-col bg-muted/15 border border-border/10 rounded-xl p-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gross Amount</span>
                <span className="text-xl font-black text-foreground mt-1">{formatCurrency(opportunity.amount)}</span>
              </div>
              <div className="flex flex-col bg-muted/15 border border-border/10 rounded-xl p-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Win Probability</span>
                <span className="text-xl font-black text-foreground mt-1">{opportunity.probability}%</span>
              </div>
              <div className="flex flex-col bg-muted/15 border border-border/10 rounded-xl p-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Weighted Forecast</span>
                <span className="text-xl font-black text-primary mt-1">{formatCurrency(weightedValue)}</span>
              </div>
            </div>

            {/* Parameters list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-2 border-t border-border/10 pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Estimated Close Date:</span>
                <span className="font-bold text-foreground">{opportunity.closeDate ? opportunity.closeDate.split('T')[0] : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Assigned Sales Owner:</span>
                <span className="font-bold text-foreground">
                  {opportunity.owner ? `${opportunity.owner.firstName} ${opportunity.owner.lastName}` : 'Unassigned'}
                </span>
              </div>
            </div>

            {/* Description */}
            {opportunity.description && (
              <div className="flex flex-col gap-1.5 mt-2 bg-muted/5 border border-border/10 rounded-xl p-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Deal Summary</span>
                <p className="text-xs leading-relaxed text-muted-foreground">{opportunity.description}</p>
              </div>
            )}
          </div>

          {/* Won / Lost details panel */}
          {(opportunity.stage === 'CLOSED_WON' || opportunity.stage === 'CLOSED_LOST') && (
            <div className="glass-card border border-border/20 rounded-2xl p-6 bg-card/30 flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/10 pb-2 flex items-center gap-2">
                {opportunity.stage === 'CLOSED_WON' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}
                {opportunity.stage === 'CLOSED_WON' ? 'Closed Won Details' : 'Closed Lost Post-Mortem'}
              </h3>

              {opportunity.stage === 'CLOSED_WON' && opportunity.contractUrl && (
                <div className="flex items-center gap-3 bg-muted/15 border border-border/10 rounded-xl p-4">
                  <FileText className="h-6 w-6 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground">Statement of Work (SOW) Contract</span>
                    <a
                      href={opportunity.contractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline break-all mt-0.5"
                    >
                      {opportunity.contractUrl}
                    </a>
                  </div>
                </div>
              )}

              {opportunity.stage === 'CLOSED_LOST' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col bg-muted/15 border border-border/10 rounded-xl p-4 gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Loss Rationale</span>
                    <p className="text-xs leading-relaxed text-muted-foreground">{opportunity.lossReason || 'No loss reason entered'}</p>
                  </div>
                  {opportunity.competitorLostTo && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-0.5">
                      <span>Lost to competitor:</span>
                      <span className="font-bold text-foreground">{opportunity.competitorLostTo}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quotations & Proposals Section */}
        <div className="glass-card border border-border/20 rounded-2xl p-6 bg-card/30 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-border/10 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Coins className="h-4 w-4 text-muted-foreground" />
              Quotations & B2B Proposals
            </h3>
            {hasQuoteWriteAccess && (
              <Button
                onClick={() => {
                  setSelectedQuotation(undefined);
                  setIsQuoteModalOpen(true);
                }}
                size="sm"
                className="h-7 font-bold gap-1 cursor-pointer bg-primary text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                New Proposal
              </Button>
            )}
          </div>

          {loadingQuotes ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading quotation versions...
            </div>
          ) : quotations.length === 0 ? (
            <div className="text-xs text-muted-foreground/60 py-6 text-center border border-dashed border-border/30 rounded-xl">
              No quotation versions generated for this deal yet.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {quotations.map((quote) => {
                const subTotalVal = Number(quote.subtotal);
                const totalVal = Number(quote.total);
                const discountVal = Number(quote.discountPercentage);
                const taxVal = Number(quote.taxPercentage);
                const expiresDate = new Date(quote.expiresAt).toLocaleDateString();

                return (
                  <div
                    key={quote.id}
                    className={cn(
                      'border rounded-xl p-4 flex flex-col gap-3 transition-colors bg-card/15',
                      quote.status === 'APPROVED' ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-border/10'
                    )}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                          v{quote.version}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          Grand Total:{' '}
                          <span className="text-primary font-black">
                            ${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-[10px] font-black uppercase px-2 py-0.5 rounded border',
                            quote.status === 'APPROVED' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                            quote.status === 'DRAFT' && 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                            quote.status === 'SENT' && 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                            quote.status === 'EXPIRED' && 'bg-muted/15 text-muted-foreground border-border/20'
                          )}
                        >
                          {quote.status}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground flex flex-col gap-1 border-y border-border/5 py-2">
                      <div className="font-semibold text-foreground mb-1">Snapshot Details:</div>
                      {quote.lineItems.map((item) => (
                        <div key={item.id} className="flex justify-between pl-2">
                          <span>
                            {item.itemName} (x{item.quantity})
                          </span>
                          <span className="font-semibold">${Number(item.subtotal).toLocaleString('en-US')}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pl-2 border-t border-border/5 pt-1 mt-1 text-[11px]">
                        <span>Subtotal:</span>
                        <span>${subTotalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {discountVal > 0 && (
                        <div className="flex justify-between pl-2 text-red-400 text-[11px]">
                          <span>Discount ({discountVal}%):</span>
                          <span>
                            -${((subTotalVal * discountVal) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {taxVal > 0 && (
                        <div className="flex justify-between pl-2 text-[11px]">
                          <span>Tax ({taxVal}%):</span>
                          <span>
                            +${(((subTotalVal * (1 - discountVal / 100)) * taxVal) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground flex-wrap gap-2">
                      <span>
                        Expires At: <strong className="text-foreground">{expiresDate}</strong>
                      </span>

                      {quote.requiresApproval && !quote.approved && (
                        <span className="text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Approval Pending
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-border/5 pt-2 mt-1">
                      {quote.status === 'DRAFT' && hasQuoteWriteAccess && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedQuotation(quote);
                              setIsQuoteModalOpen(true);
                            }}
                            className="h-7 text-xs cursor-pointer text-foreground"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteQuoteMutation.mutate(quote.id)}
                            disabled={deleteQuoteMutation.isPending}
                            className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                          >
                            {deleteQuoteMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                            Delete
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => transitionQuoteMutation.mutate({ quoteId: quote.id, status: 'SENT' })}
                            disabled={transitionQuoteMutation.isPending}
                            className="h-7 text-xs cursor-pointer gap-1 border-border/40 text-foreground"
                          >
                            {transitionQuoteMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                            <Send className="h-3 w-3" /> Send
                          </Button>
                        </>
                      )}

                      {quote.requiresApproval && !quote.approved && hasQuoteApproveAccess && (
                        <Button
                          onClick={() => approveQuoteMutation.mutate(quote.id)}
                          disabled={approveQuoteMutation.isPending}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-7 text-xs cursor-pointer"
                        >
                          {approveQuoteMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                          Clear Discount Approval
                        </Button>
                      )}

                      {quote.status !== 'APPROVED' &&
                        quote.status !== 'EXPIRED' &&
                        (!quote.requiresApproval || quote.approved) &&
                        hasQuoteWriteAccess && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => transitionQuoteMutation.mutate({ quoteId: quote.id, status: 'APPROVED' })}
                            disabled={transitionQuoteMutation.isPending}
                            className="h-7 text-xs font-bold cursor-pointer gap-1 bg-secondary text-secondary-foreground"
                          >
                            {transitionQuoteMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                            <Check className="h-3 w-3" /> Activate & Apply
                          </Button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Grid: Audit Timeline Logs */}
        <div className="flex flex-col gap-8">
          <div className="glass-card border border-border/20 rounded-2xl p-6 bg-card/30 flex flex-col gap-5 h-[550px] overflow-hidden">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/10 pb-2 flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              Audit Trail Activity
            </h3>

            <div className="flex-1 overflow-y-auto flex flex-col gap-5 pr-1">
              {loadingLogs ? (
                <div className="h-full flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading audit logs...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground text-center p-4">
                  No registered activities recorded for this opportunity yet.
                </div>
              ) : (
                auditLogs.map((log) => {
                  const date = new Date(log.createdAt).toLocaleString();
                  const userName = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System';
                  
                  // Format nice message based on action
                  let details = '';
                  if (log.action === 'opportunity.stage_changed' && log.payloadAfter) {
                    details = `Stage transitioned to ${log.payloadAfter.stage}`;
                  } else if (log.action === 'opportunity.amount_modified' && log.payloadAfter) {
                    details = `Amount updated to ${formatCurrency(log.payloadAfter.amount)}`;
                  } else if (log.action === 'opportunity.approved') {
                    details = 'Special VP approval granted';
                  } else {
                    details = log.action.replace('opportunity.', 'Deal ').replace('_', ' ');
                  }

                  return (
                    <div key={log.id} className="flex gap-3 text-xs">
                      <div className="flex flex-col items-center">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <Clock className="h-3 w-3" />
                        </div>
                        <div className="flex-1 w-[1px] bg-border/20 mt-2" />
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="font-bold text-foreground">{userName}</span>
                          <span>{date.split(',')[0]}</span>
                        </div>
                        <span className="text-muted-foreground font-semibold capitalize-first">{details}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
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
