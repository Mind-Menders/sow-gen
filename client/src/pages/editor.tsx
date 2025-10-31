import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import ReactQuill from "react-quill";
import { ArrowLeft, Save, Download, Sparkles, Check, CheckCircle2, Clock, XCircle, FileDown, Users2, Copy, Ban, CheckSquare } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Sow, SowSections, SowApproval, Workflow, User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

const statusConfig = {
  initiated: { label: "Initiated", variant: "secondary" as const },
  in_review: { label: "In Review", variant: "default" as const },
  ready_for_submission: { label: "Ready for Submission", variant: "default" as const },
  rejected: { label: "Rejected", variant: "destructive" as const },
};

// Rich text editor configuration
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'font': [] }],
    [{ 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean']
  ],
  clipboard: {
    matchVisual: false,
  }
};

const quillFormats = [
  'header', 'font', 'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'script',
  'list', 'bullet', 'indent',
  'align',
  'blockquote', 'code-block',
  'link', 'image'
];

export default function Editor() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const sowId = params.get("id");

  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [sections, setSections] = useState<SowSections>({});
  const [editContent, setEditContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "word">("pdf");
  const [exportHeader, setExportHeader] = useState("");
  const [exportFooter, setExportFooter] = useState("");
  const debouncedEditContent = useDebounce(editContent, 2000);

  const { data: sow, isLoading } = useQuery<Sow>({
    queryKey: sowId ? [`/api/sows/${sowId}`] : ["/api/sows"],
    enabled: !!sowId,
  });

  const { data: approvals } = useQuery<SowApproval[]>({
    queryKey: sowId ? [`/api/sows/${sowId}/approvals`] : ["/api/approvals"],
    enabled: !!sowId,
  });

  const { data: workflow } = useQuery<Workflow>({
    queryKey: sow?.workflowId ? [`/api/workflows/${sow.workflowId}`] : ["/api/workflows"],
    enabled: !!sow?.workflowId,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!sow?.workflowId,
  });

  useEffect(() => {
    if (sow?.sections) {
      try {
        const parsed = typeof sow.sections === "string" ? JSON.parse(sow.sections) : sow.sections;
        setSections(parsed);
        if (!selectedSection && Object.keys(parsed).length > 0) {
          const firstKey = Object.keys(parsed)[0];
          setSelectedSection(firstKey);
          setEditContent(parsed[firstKey]?.content || "");
        }
      } catch (e) {
        console.error("Error parsing sections:", e);
      }
    }
  }, [sow]);

  useEffect(() => {
    if (selectedSection && sections[selectedSection]) {
      setEditContent(sections[selectedSection].content);
      setHasUnsavedChanges(false);
    }
  }, [selectedSection]);

  useEffect(() => {
    if (debouncedEditContent !== undefined && selectedSection && sections[selectedSection]) {
      if (debouncedEditContent !== sections[selectedSection].content && hasUnsavedChanges) {
        autoSaveMutation.mutate();
      }
    }
  }, [debouncedEditContent]);

  const handleContentChange = useCallback((newContent: string) => {
    setEditContent(newContent);
    setHasUnsavedChanges(true);
  }, []);

  const handleSectionChange = useCallback(async (newSectionKey: string) => {
    if (hasUnsavedChanges && selectedSection) {
      const updatedSections = { ...sections };
      updatedSections[selectedSection] = {
        ...updatedSections[selectedSection],
        content: editContent,
      };
      setSections(updatedSections);
      
      if (sowId) {
        try {
          await apiRequest("PATCH", `/api/sows/${sowId}`, {
            sections: JSON.stringify(updatedSections),
          });
          queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}`] });
          queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
        } catch (error) {
          toast({
            title: "Save failed",
            description: "Could not save changes before switching sections. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }
    }
    setSelectedSection(newSectionKey);
    setHasUnsavedChanges(false);
  }, [hasUnsavedChanges, selectedSection, sections, editContent, sowId, toast]);

  const autoSaveMutation = useMutation({
    mutationFn: async () => {
      if (!sowId || !selectedSection) return;
      const updatedSections = { ...sections };
      updatedSections[selectedSection] = {
        ...updatedSections[selectedSection],
        content: editContent,
      };
      setSections(updatedSections);
      return apiRequest("PATCH", `/api/sows/${sowId}`, {
        sections: JSON.stringify(updatedSections),
      });
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
    },
    onError: () => {
      toast({
        title: "Auto-save failed",
        description: "Could not save your changes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateAiMutation = useMutation({
    mutationFn: async () => {
      if (!sowId || !selectedSection || !sections[selectedSection]) return;
      return apiRequest("POST", "/api/ai/generate-content", {
        sowId,
        sectionTitle: sections[selectedSection].title,
        sectionContent: editContent,
      });
    },
    onSuccess: (data: any) => {
      if (data?.suggestion) {
        setAiSuggestion(data.suggestion);
        toast({
          title: "Content Generated",
          description: "AI has generated content suggestions for this section.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Could not generate AI content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!sowId) return;
      const updatedSections = { ...sections };
      if (selectedSection) {
        updatedSections[selectedSection] = {
          ...updatedSections[selectedSection],
          content: editContent,
        };
      }
      setSections(updatedSections);
      return apiRequest("PATCH", `/api/sows/${sowId}`, {
        sections: JSON.stringify(updatedSections),
      });
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
      toast({
        title: "Saved",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Could not save your changes. Please try again.",
        variant: "destructive",
      });
    },
  });



  const markAsReviewedMutation = useMutation({
    mutationFn: async ({ approvalId, reviewerId }: { approvalId: string; reviewerId: string }) => {
      const res = await apiRequest("PATCH", `/api/sow-approvals/${approvalId}`, {
        reviewerId,
        status: "approved",
        reviewedAt: new Date().toISOString(),
      });
      console.log('Mark as reviewed response:', res);
      return res;
    },
    onSuccess: async (data) => {
      console.log('Mark as reviewed success:', data);
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}/approvals`] });
      toast({
        title: "Marked as Reviewed",
        description: "Your review has been recorded.",
      });

      // Check if all approvals are reviewed
      try {
        const approvalsRes = await apiRequest("GET", `/api/sows/${sowId}/approvals`);
        const allReviewed = Array.isArray(approvalsRes) && approvalsRes.length > 0 && approvalsRes.every((a) => a.reviewedAt);
        if (allReviewed) {
          await apiRequest("PATCH", `/api/sows/${sowId}`, { status: "ready_for_submission" });
          queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}`] });
          queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
          toast({
            title: "SOW Ready for Submission",
            description: "All reviewers have approved. Status updated.",
          });
        }
      } catch (e) {
        console.error("Error updating SOW status after all reviews:", e);
      }
    },
    onError: (err) => {
      console.error('Mark as reviewed error:', err);
      toast({
        title: "Failed",
        description: "Could not mark as reviewed. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copySowMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/sows/${sowId}/copy`, {
        createdBy: sow?.createdBy,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
      toast({
        title: "SOW Copied",
        description: "A copy of this SOW has been created.",
      });
      setLocation(`/editor?id=${data.id}`);
    },
    onError: () => {
      toast({
        title: "Failed",
        description: "Could not copy SOW. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelSowMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/sows/${sowId}`, {
        status: "rejected",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
      toast({
        title: "SOW Cancelled",
        description: "This SOW has been marked as cancelled.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Failed",
        description: "Could not cancel SOW. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleApplySuggestion = () => {
    if (aiSuggestion) {
      setEditContent(aiSuggestion);
      setAiSuggestion("");
      setHasUnsavedChanges(true);
    }
  };

  const handleExport = () => {
    setExportDialogOpen(true);
  };

  const performExport = async () => {
    if (!sow) return;
    
    try {
      const response = await fetch(`/api/sows/${sowId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: exportFormat,
          header: exportHeader || undefined,
          footer: exportFooter || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = exportFormat === 'pdf' ? 'pdf' : 'docx';
      a.download = `${sow.title.replace(/\s+/g, '_')}_SOW.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportDialogOpen(false);
      toast({
        title: 'Exported',
        description: `SOW document has been exported as ${exportFormat.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Could not export the document. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-48 animate-pulse" />
            <div className="h-12 bg-muted rounded w-96 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!sow) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <p className="text-muted-foreground">SOW not found</p>
        </div>
      </div>
    );
  }

  const sectionsList = Object.entries(sections);
  const completedSections = sectionsList.filter(([, section]) => section.content.trim().length > 0).length;
  
  // Get current approval status
  const currentApproval = approvals && approvals.length > 0 ? approvals[0] : null;
  const approvalStatusConfig = {
    pending: { label: "Pending Review", icon: Clock, variant: "secondary" as const },
    approved: { label: "Approved", icon: CheckCircle2, variant: "default" as const },
    rejected: { label: "Rejected", icon: XCircle, variant: "destructive" as const },
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-6">
        {/* Project Title */}
        <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="sow-title">
          {sow.title}
        </h1>
        <div className="flex items-center gap-4">
          <Button 
            variant="destructive" 
            size="lg"
            onClick={() => setLocation("/")} 
            data-testid="button-back"
            className="gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Button>
          <div>
            {statusConfig[sow.status as keyof typeof statusConfig] ? (
              <Badge variant={statusConfig[sow.status as keyof typeof statusConfig].variant} className="text-xs">
                {statusConfig[sow.status as keyof typeof statusConfig].label}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                Unknown Status
              </Badge>
            )}
          </div>
          <p className="text-sm font-mono text-muted-foreground" data-testid="text-sow-number">#{sow.sowNumber}</p>
          {/* Approval Status */}
          {currentApproval && (
            <div className="mt-3 flex items-center gap-2">
              {(() => {
                const ApprovalIcon = approvalStatusConfig[currentApproval.status as keyof typeof approvalStatusConfig]?.icon || Clock;
                return (
                  <>
                    <ApprovalIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Approval: <span className="font-medium">{approvalStatusConfig[currentApproval.status as keyof typeof approvalStatusConfig]?.label || currentApproval.status}</span>
                      {currentApproval.currentStage !== undefined && ` (Stage ${currentApproval.currentStage})`}
                    </span>
                  </>
                );
              })()}
            </div>
          )}
          <div className="flex items-center gap-2">
            {/* Edit Project Details */}
            <Button 
              variant="outline" 
              onClick={() => setLocation(`/editsow?id=${sowId}`)}
              data-testid="button-edit-details"
            >
              Edit Details
            </Button>
            
            {/* Copy SOW */}
            <Button 
              variant="outline" 
              onClick={() => copySowMutation.mutate()}
              disabled={copySowMutation.isPending}
              data-testid="button-copy-sow"
            >
              <Copy className="w-4 h-4 mr-2" />
              {copySowMutation.isPending ? "Copying..." : "Copy"}
            </Button>
            
            {/* Cancel SOW - only show if not already rejected */}
            {sow.status !== "rejected" && (
              <Button 
                variant="outline" 
                onClick={() => cancelSowMutation.mutate()}
                disabled={cancelSowMutation.isPending}
                data-testid="button-cancel-sow"
              >
                <Ban className="w-4 h-4 mr-2" />
                {cancelSowMutation.isPending ? "Cancelling..." : "Cancel"}
              </Button>
            )}
            
            <Button variant="outline" onClick={handleExport} data-testid="button-export">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save">
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-[18px] pl-[1px] pr-[1px] ml-[1px] mr-[1px] pt-[1px] pb-[1px]">
          <div className="lg:col-span-1">
            <Card className="border-card-border sticky top-6">
              <CardHeader>
                <CardTitle className="text-base">Document Sections</CardTitle>
                <p className="text-xs text-muted-foreground">Click to edit a section</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {sectionsList.map(([key, section], index) => {
                  const isCompleted = section.content.trim().length > 0;
                  const isActive = selectedSection === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleSectionChange(key)}
                      className={`w-full text-left p-3 rounded-md border transition-all hover-elevate ${
                        isActive ? "border-primary bg-accent" : "border-card-border"
                      }`}
                      data-testid={`button-section-${key}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {section.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground mb-1">
                            {index + 1}. {section.title}
                          </p>
                          {section.content && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{section.content.substring(0, 60)}...</p>
                          )}
                        </div>
                        {isCompleted && <Check className="w-4 h-4 text-green-600 flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}
                <div className="pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Completion:</span>{" "}
                    <span data-testid="text-completion">{completedSections} / {sectionsList.length}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Reviewers Card */}
            {workflow && (
              <Card className="border-card-border mt-6">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users2 className="w-4 h-4" />
                    Reviewers & Approvals
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Track review status</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    try {
                      if (!workflow.stages) {
                        return <p className="text-xs text-muted-foreground">No workflow stages defined</p>;
                      }

                      const stagesData = typeof workflow.stages === "string" 
                        ? JSON.parse(workflow.stages) 
                        : workflow.stages;
                      
                      // Handle both array and object formats
                      const stages = Array.isArray(stagesData) ? stagesData : [];
                      
                      if (stages.length === 0) {
                        return <p className="text-xs text-muted-foreground">No review stages configured</p>;
                      }

                      // Find the first stage with at least one reviewer who has not reviewed
                      let currentStageIdx = -1;
                      for (let i = 0; i < stages.length; i++) {
                        const stage = stages[i];
                        const stageReviewers = (stage.reviewerIds || [])
                          .map((reviewerId: string) => users.find((u) => u.id === reviewerId))
                          .filter(Boolean);
                        const hasPending = stageReviewers.some((reviewer: any) => {
                          const reviewerApproval = approvals?.find(
                            (approval) => approval.reviewerId === reviewer.id && approval.currentStage === i
                          );
                          return !(reviewerApproval && reviewerApproval.reviewedAt);
                        });
                        if (hasPending && currentStageIdx === -1) {
                          currentStageIdx = i;
                        }
                      }
                      // If all reviewers in all stages have reviewed, set currentStageIdx beyond last stage
                      if (currentStageIdx === -1) {
                        currentStageIdx = stages.length;
                      }

                      return stages.map((stage: any, stageIdx: number) => {
                        const stageReviewers = (stage.reviewerIds || [])
                          .map((reviewerId: string) => users.find((u) => u.id === reviewerId))
                          .filter(Boolean);

                        const isCurrentStage = stageIdx === currentStageIdx;
                        const isPastStage = stageIdx < currentStageIdx;

                        return (
                          <div key={stage.id || stageIdx} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={isPastStage ? "default" : isCurrentStage ? "secondary" : "outline"} className="text-xs">
                                  Stage {stageIdx + 1}
                                </Badge>
                                <span className="text-sm font-medium">{stage.name}</span>
                              </div>
                              {isPastStage && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                              {isCurrentStage && <Clock className="w-4 h-4 text-yellow-600" />}
                            </div>

                            <div className="space-y-2 mt-2">
                              {stageReviewers.map((reviewer: any) => {
                                // Debug: log user, reviewer, and button logic
                                if (user && reviewer) {
                                  const reviewerApproval = approvals?.find(
                                    (approval) => approval.reviewerId === reviewer.id && approval.currentStage === stage.stage
                                  );
                                  const hasReviewed = !!(reviewerApproval && reviewerApproval.reviewedAt);
                                  const isCurrentUser = user && (
                                    reviewer.id === user.id ||
                                    (reviewer.email && user.email && reviewer.email === user.email) ||
                                    ((reviewer.firstName && reviewer.lastName && user.firstName && user.lastName) &&
                                      reviewer.firstName.toLowerCase() === user.firstName.toLowerCase() &&
                                      reviewer.lastName.toLowerCase() === user.lastName.toLowerCase())
                                  );
                                  console.log('Logged-in user:', user);
                                  console.log('Reviewer:', reviewer);
                                  console.log('isCurrentStage:', isCurrentStage, 'hasReviewed:', hasReviewed, 'reviewerApproval:', reviewerApproval, 'isCurrentUser:', isCurrentUser);
                                }
                                // Debug: log user and reviewer
                                if (user && reviewer) {
                                  console.log('Logged-in user:', user);
                                  console.log('Reviewer:', reviewer);
                                }
                                if (!reviewer) return null;
                                // Check all approvals to see if this reviewer has reviewed
                                const reviewerApproval = approvals?.find(
                                  (approval) => approval.reviewerId === reviewer.id && approval.currentStage === stage.stage
                                );
                                const hasReviewed = !!(reviewerApproval && reviewerApproval.reviewedAt);


                                // Only show the button for the logged-in reviewer (by id, email, or name)
                                const isCurrentUser = user && (
                                  reviewer.id === user.id ||
                                  (reviewer.email && user.email && reviewer.email === user.email) ||
                                  ((reviewer.firstName && reviewer.lastName && user.firstName && user.lastName) &&
                                    reviewer.firstName.toLowerCase() === user.firstName.toLowerCase() &&
                                    reviewer.lastName.toLowerCase() === user.lastName.toLowerCase())
                                );

                                return (
                                  <div key={reviewer.id} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${hasReviewed ? 'bg-green-600' : 'bg-gray-300'}`} />
                                      <span>{reviewer.firstName} {reviewer.lastName}</span>
                                    </div>
                                    {isCurrentStage && !hasReviewed && isCurrentUser && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="h-6 text-xs flex items-center gap-1"
                                        onClick={() => {
                                          // Find the approval record for this reviewer and stage
                                          const approval = approvals?.find(
                                            (a) => a.reviewerId === reviewer.id && a.currentStage === stageIdx
                                          );
                                          console.log('Mark Reviewed clicked', {
                                            approvalId: approval?.id,
                                            reviewerId: reviewer.id
                                          });
                                          if (approval?.id && reviewer.id) {
                                            markAsReviewedMutation.mutate({
                                              approvalId: approval.id,
                                              reviewerId: reviewer.id,
                                            });
                                          } else {
                                            alert('Approval record not found for this reviewer/stage.');
                                          }
                                        }}
                                        disabled={markAsReviewedMutation.isPending}
                                      >
                                        <CheckSquare className="w-4 h-4 mr-1" />
                                        {markAsReviewedMutation.isPending ? "..." : "Mark Reviewed"}
                                      </Button>
                                    )}
                                    {hasReviewed && (
                                      <span className="text-muted-foreground">Reviewed</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    } catch (e) {
                      console.error("Error parsing workflow stages:", e);
                      console.log("Workflow stages data:", workflow.stages);
                      return (
                        <div className="text-xs text-muted-foreground">
                          <p>Unable to load reviewers</p>
                          <p className="text-red-500 mt-1">Check console for details</p>
                        </div>
                      );
                    }
                  })()}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {selectedSection && sections[selectedSection] && (
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                      {sections[selectedSection].icon}
                    </div>
                    {sections[selectedSection].title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Edit this section of your Statement of Work</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white rounded border" data-testid="textarea-content">
                    <ReactQuill
                      theme="snow"
                      value={editContent}
                      onChange={handleContentChange}
                      placeholder={`Enter ${sections[selectedSection].title.toLowerCase()} content... Paste from Word to preserve formatting.`}
                      modules={quillModules}
                      formats={quillFormats}
                      style={{ minHeight: 300 }}
                    />
                  </div>
                  {hasUnsavedChanges && (
                    <p className="text-xs text-muted-foreground">Auto-saving...</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Supports rich formatting, tables (paste from Word), lists, images, and more
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Assistant
                </CardTitle>
                <p className="text-sm text-muted-foreground">Generate content suggestions using AI</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => generateAiMutation.mutate()}
                  disabled={generateAiMutation.isPending || !selectedSection}
                  data-testid="button-generate-ai"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {generateAiMutation.isPending ? "Generating..." : "Generate Content"}
                </Button>
                
                {aiSuggestion ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-md border border-card-border bg-card">
                      <p className="text-sm whitespace-pre-wrap">{aiSuggestion}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="default"
                        className="flex-1"
                        onClick={() => {
                          setEditContent(aiSuggestion);
                          setHasUnsavedChanges(true);
                          setAiSuggestion("");
                          toast({
                            title: "Content Inserted",
                            description: "AI suggestion has been inserted into the editor.",
                          });
                        }}
                        data-testid="button-insert-ai"
                      >
                        Insert
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(aiSuggestion);
                          toast({
                            title: "Copied",
                            description: "AI suggestion copied to clipboard.",
                          });
                        }}
                        data-testid="button-copy-ai"
                      >
                        Copy
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setAiSuggestion("")}
                        data-testid="button-clear-ai"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No suggestions yet. Generate content to get started.</p>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground text-center border-t pt-4">
                  Powered by Gemma3 / Azure AI GPT-5
                  <br />
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="w-5 h-5" />
              Export SOW Document
            </DialogTitle>
            <DialogDescription>
              Customize your export settings and add header/footer information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Export Format */}
            <div className="space-y-2">
              <Label htmlFor="export-format">Export Format</Label>
              <Select value={exportFormat} onValueChange={(value: "pdf" | "word") => setExportFormat(value)}>
                <SelectTrigger id="export-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Document (.pdf)</SelectItem>
                  <SelectItem value="word">Word Document (.docx)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Document will include a table of contents automatically
              </p>
            </div>

            {/* Header */}
            <div className="space-y-2">
              <Label htmlFor="export-header">Document Header (Optional)</Label>
              <Textarea
                id="export-header"
                placeholder="e.g., CONFIDENTIAL - Internal Use Only&#10;Company Name&#10;Date: {date}"
                value={exportHeader}
                onChange={(e) => setExportHeader(e.target.value)}
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                This will appear at the top of the exported document
              </p>
            </div>

            {/* Footer */}
            <div className="space-y-2">
              <Label htmlFor="export-footer">Document Footer (Optional)</Label>
              <Textarea
                id="export-footer"
                placeholder="e.g., © 2025 Company Name. All rights reserved.&#10;Page {page} of {total}"
                value={exportFooter}
                onChange={(e) => setExportFooter(e.target.value)}
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                This will appear at the bottom of the exported document
              </p>
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-xs font-medium mb-2">Export Preview:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>✓ Document title and metadata</p>
                <p>✓ Table of contents ({Object.keys(sections).length} sections)</p>
                <p>✓ All section content</p>
                {exportHeader && <p>✓ Custom header included</p>}
                {exportFooter && <p>✓ Custom footer included</p>}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={performExport}>
              <Download className="w-4 h-4 mr-2" />
              Export as {exportFormat.toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
