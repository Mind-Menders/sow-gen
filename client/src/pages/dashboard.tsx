import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, FileCheck, Clock, CheckCircle2, Plus, Filter, Search, User, Edit, ArrowRight, ChevronLeft, ChevronRight, AlertCircle, Lock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Sow, User as UserType, SowApproval, Workflow, WorkflowStage } from "@shared/schema";
import { format } from "date-fns";
import bgImage from "@assets/stock_images/corporate_workflow_p_bb66a5c7.jpg";
import { useAuth } from "@/hooks/useAuth";
import { defaultStatusConfig, normalizeStatus, type StatusConfig } from "@shared/status-config";

const ITEMS_PER_PAGE = 9;

export default function Dashboard() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const { user } = useAuth();

  const { data: sows = [], isLoading } = useQuery<Sow[]>({
    queryKey: ["/api/sows"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  // Fetch workflows to determine who needs to action
  const { data: workflows = [] } = useQuery<Workflow[]>({
    queryKey: ["/api/workflows"],
  });

  // Fetch access control configuration
  const { data: accessControlConfig } = useQuery({
    queryKey: ["/api/access-control"],
  });

  // Fetch all approvals for all SOWs (needed to compute derived status)
  const { data: allApprovals = [] } = useQuery<SowApproval[]>({
    queryKey: ["/api/approvals"],
    enabled: sows.length > 0,
  });

  // Compute derived status for each SOW
  const sowsWithDerivedStatus = useMemo(() => {
    return sows.map((sow) => {
      const sowApprovals = allApprovals.filter((a) => a.sowId === sow.id);
      const normalizedStatus = normalizeStatus(sow.status);
      
      let displayStatus: keyof StatusConfig | undefined = normalizedStatus;
      
      // If not rejected/completed and at least one approval is reviewed, show "In Review"
      if (
        normalizedStatus !== 'rejected' &&
        normalizedStatus !== 'ready_for_submission' &&
        sowApprovals.some((a) => a.status === 'reviewed' || a.status === 'approved')
      ) {
        displayStatus = 'in_review';
      }

      return {
        ...sow,
        displayStatus,
        normalizedStatus,
      };
    });
  }, [sows, allApprovals]);

  type DerivedSow = typeof sowsWithDerivedStatus[number];

  const filteredSows = sowsWithDerivedStatus.filter((sow) => {
    if (statusFilter !== "all" && sow.displayStatus !== statusFilter) return false;
    if (typeFilter !== "all" && sow.sowType !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        sow.title.toLowerCase().includes(query) ||
        sow.sowNumber.toLowerCase().includes(query) ||
        sow.vendorName.toLowerCase().includes(query) ||
        (sow.sponsor && sow.sponsor.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredSows.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSows = filteredSows.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const stats = {
    total: sows.length,
    draft: sowsWithDerivedStatus.filter((s) => s.displayStatus === "draft").length,
    pending_review: sowsWithDerivedStatus.filter((s) => s.displayStatus === "pending_review").length,
    in_review: sowsWithDerivedStatus.filter((s) => s.displayStatus === "in_review").length,
    ready_for_submission: sowsWithDerivedStatus.filter((s) => s.displayStatus === "ready_for_submission").length,
  };

  const canEditSow = (sow: DerivedSow) => {
    if (!user) return false;
    
    // Cannot edit if ready for submission (final version)
    if (sow.displayStatus === 'ready_for_submission') return false;
    
    // Admin can edit any SOW (except ready for submission)
    if (user.role === "admin") return true;
    
    // Creator can edit their own SOWs
    if (sow.createdBy === user.id) return true;
    
    // Current reviewer can edit
    const sowApprovals = allApprovals.filter((a) => a.sowId === sow.id);
    const pendingApproval = sowApprovals.find((a) => a.status === 'pending');
    if (pendingApproval && pendingApproval.reviewerId === user.id) return true;
    
    return false;
  };

  // Get the user who needs to action on this SOW
  const getActionUser = (sow: DerivedSow) => {
    const sowApprovals = allApprovals.filter((a) => a.sowId === sow.id);
    
    // If draft, creator needs to action
    if (sow.displayStatus === 'draft') {
      return users.find(u => u.id === sow.createdBy);
    }
    
    // If pending review or in review, find current reviewer
    if (sow.displayStatus === 'pending_review' || sow.displayStatus === 'in_review') {
      const pendingApproval = sowApprovals.find((a) => a.status === 'pending');
      if (pendingApproval) {
        return users.find(u => u.id === pendingApproval.reviewerId);
      }
    }
    
    // If ready for submission, no action needed
    if (sow.displayStatus === 'ready_for_submission') {
      return null;
    }
    
    return null;
  };

  return (
    <div className="flex-1 overflow-y-auto relative">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
      
      <div className="relative w-full mx-auto p-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Statement Of Work Dashboard</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">Manage and track all your Statement of Work documents</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-card-border hover-elevate">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Total SOWs</p>
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground" data-testid="stat-total">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-card-border hover-elevate">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Draft</p>
                <FileCheck className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground" data-testid="stat-draft">{stats.draft}</p>
            </CardContent>
          </Card>

          <Card className="border-card-border hover-elevate">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground" data-testid="stat-pending">{stats.in_review}</p>
            </CardContent>
          </Card>

          <Card className="border-card-border hover-elevate">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Reviewed</p>
                <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground" data-testid="stat-approved">{stats.ready_for_submission}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[300px] flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by title, number, vendor, or sponsor..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(defaultStatusConfig).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={handleFilterChange(setTypeFilter)}>
              <SelectTrigger className="w-[220px]" data-testid="select-type-filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="New Vendor (RFT)">New Vendor (RFT)</SelectItem>
                <SelectItem value="Existing Vendor Enhancement">Existing Vendor Enhancement</SelectItem>
                <SelectItem value="Flexi Sourcing - TNM">Flexi Sourcing - TNM</SelectItem>
                <SelectItem value="Flexi Sourcing - Fixed Scope">Flexi Sourcing - Fixed Scope</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Link href="/createsow">
            <Button className="gap-2" data-testid="button-new-sow">
              <Plus className="w-4 h-4" />
              New SOW
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-card-border">
                <CardHeader className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse w-20" />
                  <div className="h-6 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-muted rounded animate-pulse w-24" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredSows.length === 0 ? (
          <Card className="border-card-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No SOWs found</h3>
              <p className="text-muted-foreground mb-6">Get started by creating your first Statement of Work</p>
              <Link href="/createsow">
                <Button data-testid="button-create-first-sow">
                  <Plus className="w-4 h-4 mr-2" />
                  Create SOW
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedSows.map((sow) => {
                const initiator = users.find((u) => u.id === sow.createdBy);
                const lastEditor = users.find((u) => u.id === sow.lastEditedBy);
                const displayStatus = sow.displayStatus;
                const actionUser = getActionUser(sow);
                const canEdit = canEditSow(sow);
                const isFinalVersion = displayStatus === 'ready_for_submission';
              
              return (
              <Link key={sow.id} href={`/editor?id=${sow.id}`}>
                <Card 
                  className={`border-card-border hover-elevate group cursor-pointer transition-all duration-300 relative overflow-hidden ${isFinalVersion ? 'ring-2 ring-green-500/50' : ''}`}
                  data-testid={`card-sow-${sow.id}`}
                >
                  <CardHeader className="space-y-3 pr-16">
                    <div className="flex items-start justify-between gap-2">
                      {displayStatus && defaultStatusConfig[displayStatus] ? (
                        <Badge
                          variant={defaultStatusConfig[displayStatus].variant}
                          className={
                            `w-fit uppercase text-xs font-semibold` +
                            (displayStatus === "ready_for_submission" ? " bg-green-600 text-white" : "")
                          }
                        >
                          {defaultStatusConfig[displayStatus].label}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="w-fit uppercase text-xs font-semibold">
                          Unknown Status
                        </Badge>
                      )}
                      
                      {/* Version Stamp Badge - Highlighted if final */}
                      <div className="relative">
                        <div 
                          className={`px-3 py-2 bg-gradient-to-br border-2 rounded-md shadow-md transform rotate-2 hover:rotate-0 transition-transform duration-200 ${
                            isFinalVersion 
                              ? 'from-green-500/30 to-emerald-600/40 border-green-600/60 ring-2 ring-green-400/50' 
                              : 'from-amber-500/20 to-orange-600/30 border-amber-600/40'
                          }`}
                          style={{
                            boxShadow: isFinalVersion 
                              ? "0 2px 6px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
                              : "0 2px 4px rgba(217, 119, 6, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
                          }}
                        >
                          <div className="text-center">
                            <div className={`text-[10px] font-bold uppercase tracking-wide leading-none ${
                              isFinalVersion ? 'text-green-900/80' : 'text-amber-900/70'
                            }`}>
                              {isFinalVersion ? 'Final' : 'Version'}
                            </div>
                            <div className={`text-xl font-black leading-none mt-0.5 ${
                              isFinalVersion ? 'text-green-900' : 'text-amber-900'
                            }`}>
                              {sow.version ?? 1}
                            </div>
                            {lastEditor && (
                              <div className={`text-[9px] leading-tight mt-0.5 max-w-[80px] truncate ${
                                isFinalVersion ? 'text-green-900/70' : 'text-amber-900/60'
                              }`}>
                                by {lastEditor.firstName || lastEditor.name}
                              </div>
                            )}
                          </div>
                        </div>
                        {isFinalVersion && (
                          <Lock className="absolute -top-1 -right-1 w-4 h-4 text-green-600" />
                        )}
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground line-clamp-2" data-testid={`text-sow-title-${sow.id}`}>
                      {sow.title}
                    </h3>
                    <p className="text-sm font-mono text-muted-foreground" data-testid={`text-sow-number-${sow.id}`}>
                      #{sow.sowNumber}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4 pr-16">
                    <div className="space-y-2 text-sm">
                      <p className="text-foreground" data-testid={`text-vendor-${sow.id}`}>{sow.vendorName}</p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">Sponsor:</span> {sow.sponsor}
                      </p>
                      {initiator && (
                        <p className="text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span className="font-medium">Initiated by:</span> {initiator.firstName} {initiator.lastName}
                        </p>
                      )}
                      
                      {/* Action Required Indicator */}
                      {actionUser && (
                        <div className="flex items-center gap-1 text-orange-600 font-medium">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs">
                            Action: {actionUser.id === user?.id ? 'You' : `${actionUser.firstName} ${actionUser.lastName}`}
                          </span>
                        </div>
                      )}
                      
                      {isFinalVersion && (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <Lock className="w-3 h-3 mr-1" />
                          Locked - No Edits
                        </Badge>
                      )}
                      
                      <p className="text-muted-foreground">{format(new Date(sow.createdAt), "MMM dd, yyyy")}</p>
                      <Badge variant="outline" className="text-xs">{sow.sowType}</Badge>
                    </div>
                  </CardContent>
                  
                  {/* Arrow Button on Right */}
                  <div 
                    className={`absolute right-0 top-0 bottom-0 w-16 bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:w-20 border-l border-white/30 ${
                      canEdit && !isFinalVersion ? 'group-hover:bg-primary' : 'group-hover:bg-muted'
                    }`}
                    data-testid={`button-open-${sow.id}`}
                  >
                    <ArrowRight className="w-6 h-6 text-white transition-all duration-300 group-hover:translate-x-1" />
                  </div>
                </Card>
              </Link>
              );
            })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first, last, current, and pages around current
                    const showPage = page === 1 || 
                                    page === totalPages || 
                                    Math.abs(page - currentPage) <= 1;
                    
                    if (!showPage) {
                      // Show ellipsis for gaps
                      if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="px-2 text-muted-foreground">...</span>;
                      }
                      return null;
                    }
                    
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-9 h-9 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Results Summary */}
            <div className="text-center text-sm text-muted-foreground mt-4">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredSows.length)} of {filteredSows.length} SOW{filteredSows.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
