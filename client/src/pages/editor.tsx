import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import ReactQuill, { Quill } from "react-quill";
import { ArrowLeft, Save, Download, Sparkles, Check, CheckCircle2, Clock, XCircle, FileDown, Users2, Copy, Ban, CheckSquare, History, UserCog, RotateCcw } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Sow, SowSections, SowApproval, Workflow, User, SowAuditTrail } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

// Register custom table blots to preserve table HTML
const BlockEmbed = Quill.import('blots/block/embed');

class TableBlot extends BlockEmbed {
  static create(value: any) {
    const node = super.create();
    if (typeof value === 'string') {
      node.innerHTML = value;
    }
    return node;
  }

  static value(node: HTMLElement) {
    return node.innerHTML;
  }
}

TableBlot.blotName = 'table-html';
TableBlot.tagName = 'TABLE';
TableBlot.className = 'pasted-table';

Quill.register(TableBlot);

const statusConfig = {
  initiated: { label: "Initiated", variant: "secondary" as const },
  in_review: { label: "In Review", variant: "default" as const },
  ready_for_submission: { label: "Ready for Submission", variant: "default" as const },
  rejected: { label: "Rejected", variant: "destructive" as const },
};

// Rich text editor configuration with enhanced table paste support
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
    ['link', 'image', 'video'],
    ['clean']
  ],
  clipboard: {
    matchVisual: false,
    matchers: [
      ['table', (node: HTMLElement, delta: any) => {
        // Preserve the entire table HTML structure
        const tableHTML = node.outerHTML;
        const Delta = Quill.import('delta');
        return new Delta().insert({ 'table-html': tableHTML });
      }]
    ]
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
  'link', 'image', 'video',
  'table-html'
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
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [revertStatus, setRevertStatus] = useState("");
  const [reassignReviewer, setReassignReviewer] = useState("");
  const [actionRemarks, setActionRemarks] = useState("");
  const [newSectionDialogOpen, setNewSectionDialogOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionIcon, setNewSectionIcon] = useState("");
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

  const { data: auditTrail = [] } = useQuery<SowAuditTrail[]>({
    queryKey: sowId ? [`/api/sows/${sowId}/audit`] : ["/api/audit"],
    enabled: !!sowId,
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

  const revertStageMutation = useMutation({
    mutationFn: async ({ toStatus, remarks }: { toStatus: string; remarks: string }) => {
      return apiRequest("POST", `/api/sows/${sowId}/revert`, {
        toStatus,
        remarks,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}/audit`] });
      queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
      toast({
        title: "Stage Reverted",
        description: "SOW has been reverted to the previous stage.",
      });
    },
    onError: () => {
      toast({
        title: "Revert Failed",
        description: "Could not revert SOW stage. Please try again.",
        variant: "destructive",
      });
    },
  });

  const reassignReviewerMutation = useMutation({
    mutationFn: async ({ toReviewer, remarks }: { toReviewer: string; remarks: string }) => {
      return apiRequest("POST", `/api/sows/${sowId}/reassign`, {
        toReviewer,
        remarks,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}/approvals`] });
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}/audit`] });
      queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
      toast({
        title: "Reviewer Reassigned",
        description: "SOW has been reassigned to a different reviewer.",
      });
    },
    onError: () => {
      toast({
        title: "Reassign Failed",
        description: "Could not reassign reviewer. Please try again.",
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

  const handleAddNewSection = async () => {
    if (!newSectionTitle.trim()) {
      toast({
        title: "Invalid Input",
        description: "Section title is required",
        variant: "destructive",
      });
      return;
    }

    const sectionId = newSectionTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    if (sections[sectionId]) {
      toast({
        title: "Section Exists",
        description: "A section with this name already exists",
        variant: "destructive",
      });
      return;
    }

    const updatedSections = {
      ...sections,
      [sectionId]: {
        id: sectionId,
        icon: newSectionIcon.toUpperCase().substring(0, 2) || newSectionTitle.substring(0, 2).toUpperCase(),
        title: newSectionTitle,
        content: "",
      },
    };

    setSections(updatedSections);

    if (sowId) {
      try {
        await apiRequest("PATCH", `/api/sows/${sowId}`, {
          sections: JSON.stringify(updatedSections),
        });
        queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
        toast({
          title: "Section Added",
          description: "New section has been added successfully",
        });
        setNewSectionDialogOpen(false);
        setNewSectionTitle("");
        setNewSectionIcon("");
        setSelectedSection(sectionId);
      } catch (error) {
        toast({
          title: "Failed to Add Section",
          description: "Could not add the new section. Please try again.",
          variant: "destructive",
        });
      }
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
        <div className="w-full mx-auto p-8">
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
        <div className="w-full mx-auto p-8">
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
      <div className="w-full mx-auto p-8 space-y-6">
        {/* Header Panel */}
        <Card className="border-card-border">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setLocation("/")} 
                    data-testid="button-back"
                    className="gap-2 -ml-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <div className="h-4 w-px bg-border" />
                  <p className="text-sm font-mono text-muted-foreground" data-testid="text-sow-number">
                    #{sow.sowNumber}
                  </p>
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-3" data-testid="sow-title">
                  {sow.title}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Status:</span>
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
                  
                  {/* Approval Status */}
                  {currentApproval && (
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-px bg-border" />
                      {(() => {
                        const ApprovalIcon = approvalStatusConfig[currentApproval.status as keyof typeof approvalStatusConfig]?.icon || Clock;
                        return (
                          <>
                            <ApprovalIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {approvalStatusConfig[currentApproval.status as keyof typeof approvalStatusConfig]?.label || currentApproval.status}
                              {currentApproval.currentStage !== undefined && ` (Stage ${currentApproval.currentStage})`}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Completion Status */}
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      Completion: <span className="font-medium">{completedSections}/{sectionsList.length}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation(`/editsow?id=${sowId}`)}
                  data-testid="button-edit-details"
                >
                  Edit Details
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copySowMutation.mutate()}
                  disabled={copySowMutation.isPending}
                  data-testid="button-copy-sow"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copySowMutation.isPending ? "Copying..." : "Copy"}
                </Button>
                
                {sow.status !== "rejected" && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => cancelSowMutation.mutate()}
                    disabled={cancelSowMutation.isPending}
                    data-testid="button-cancel-sow"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    {cancelSowMutation.isPending ? "Cancelling..." : "Cancel"}
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExport} 
                  data-testid="button-export"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                
                <Button 
                  size="sm"
                  onClick={() => saveMutation.mutate()} 
                  disabled={saveMutation.isPending} 
                  data-testid="button-save"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="review">
              <Users2 className="w-4 h-4 mr-2" />
              Review and Approvals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-[18px] pl-[1px] pr-[1px] ml-[1px] mr-[1px] pt-[1px] pb-[1px]">
          <div className="lg:col-span-1">
            <Card className="border-card-border sticky top-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Document Sections</CardTitle>
                    <p className="text-xs text-muted-foreground">Click to edit a section</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setNewSectionDialogOpen(true)}
                    className="gap-1"
                  >
                    <span className="text-lg">+</span>
                    Add
                  </Button>
                </div>
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
          </TabsContent>

          <TabsContent value="review" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Reviewers & Approvals Card */}
              {workflow && (
                <Card className="border-card-border">
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

              {/* Audit Trail Card */}
            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Audit Trail
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track all changes, status updates, and reviewer assignments
                </p>
              </CardHeader>
              <CardContent>
                {auditTrail && auditTrail.length > 0 ? (
                  <div className="space-y-4">
                    {auditTrail.map((entry) => (
                      <div key={entry.id} className="border-l-2 border-primary pl-4 pb-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">
                              {entry.action === 'status_change' && 'Status Changed'}
                              {entry.action === 'reviewer_change' && 'Reviewer Reassigned'}
                              {entry.action === 'stage_revert' && 'Stage Reverted'}
                              {entry.action === 'created' && 'SOW Created'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.createdAt && format(new Date(entry.createdAt), 'PPpp')}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm space-y-1">
                          {entry.previousStatus && entry.newStatus && (
                            <p>
                              <span className="text-muted-foreground">Status:</span>{' '}
                              <Badge variant="outline" className="text-xs">{entry.previousStatus}</Badge>
                              {' → '}
                              <Badge variant="outline" className="text-xs">{entry.newStatus}</Badge>
                            </p>
                          )}
                          {entry.previousReviewer && entry.newReviewer && (
                            <p>
                              <span className="text-muted-foreground">Reviewer:</span>{' '}
                              {users.find(u => u.id === entry.previousReviewer)?.name || entry.previousReviewer}
                              {' → '}
                              {users.find(u => u.id === entry.newReviewer)?.name || entry.newReviewer}
                            </p>
                          )}
                          {entry.performedBy && (
                            <p>
                              <span className="text-muted-foreground">Performed by:</span>{' '}
                              {users.find(u => u.id === entry.performedBy)?.name || entry.performedBy}
                            </p>
                          )}
                          {entry.remarks && (
                            <div className="mt-2 p-2 bg-muted rounded-md">
                              <p className="text-xs text-muted-foreground mb-1">Remarks:</p>
                              <p className="text-sm">{entry.remarks}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No audit trail entries yet
                  </p>
                )}

                {/* Action Buttons */}
                <div className="mt-6 pt-6 border-t space-y-3">
                  <h3 className="font-medium text-sm mb-3">Administrative Actions</h3>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setRevertDialogOpen(true)}
                      disabled={!sow || sow.status === 'draft'}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Revert to Previous Stage
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setReassignDialogOpen(true)}
                      disabled={!workflow}
                    >
                      <UserCog className="w-4 h-4 mr-2" />
                      Reassign Reviewer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Revert Stage Dialog */}
      <Dialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Revert to Previous Stage
            </DialogTitle>
            <DialogDescription>
              Select the status to revert to and provide remarks for audit trail
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="revert-status">Target Status</Label>
              <Select value={revertStatus} onValueChange={setRevertStatus}>
                <SelectTrigger id="revert-status">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="revert-remarks">Remarks *</Label>
              <Textarea
                id="revert-remarks"
                placeholder="Explain why this SOW is being reverted..."
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                className="min-h-[100px]"
                required
              />
              <p className="text-xs text-muted-foreground">
                Remarks are required and will be recorded in the audit trail
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRevertDialogOpen(false);
              setRevertStatus("");
              setActionRemarks("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (revertStatus && actionRemarks.trim()) {
                  revertStageMutation.mutate({
                    toStatus: revertStatus,
                    remarks: actionRemarks
                  });
                  setRevertDialogOpen(false);
                  setRevertStatus("");
                  setActionRemarks("");
                }
              }}
              disabled={!revertStatus || !actionRemarks.trim() || revertStageMutation.isPending}
            >
              {revertStageMutation.isPending ? "Reverting..." : "Revert Stage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Reviewer Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              Reassign Reviewer
            </DialogTitle>
            <DialogDescription>
              Select a new reviewer and provide remarks for audit trail
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reassign-reviewer">New Reviewer</Label>
              <Select value={reassignReviewer} onValueChange={setReassignReviewer}>
                <SelectTrigger id="reassign-reviewer">
                  <SelectValue placeholder="Select reviewer..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reassign-remarks">Remarks *</Label>
              <Textarea
                id="reassign-remarks"
                placeholder="Explain why this reviewer is being reassigned..."
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                className="min-h-[100px]"
                required
              />
              <p className="text-xs text-muted-foreground">
                Remarks are required and will be recorded in the audit trail
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setReassignDialogOpen(false);
              setReassignReviewer("");
              setActionRemarks("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (reassignReviewer && actionRemarks.trim()) {
                  reassignReviewerMutation.mutate({
                    toReviewer: reassignReviewer,
                    remarks: actionRemarks
                  });
                  setReassignDialogOpen(false);
                  setReassignReviewer("");
                  setActionRemarks("");
                }
              }}
              disabled={!reassignReviewer || !actionRemarks.trim() || reassignReviewerMutation.isPending}
            >
              {reassignReviewerMutation.isPending ? "Reassigning..." : "Reassign Reviewer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Section Dialog */}
      <Dialog open={newSectionDialogOpen} onOpenChange={setNewSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
            <DialogDescription>
              Create a custom section for your Statement of Work
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="section-title">Section Title *</Label>
              <Input
                id="section-title"
                placeholder="e.g., Risk Management, Budget, Dependencies..."
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSectionTitle.trim()) {
                    handleAddNewSection();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="section-icon">Section Icon (Optional)</Label>
              <Input
                id="section-icon"
                placeholder="2 letters, e.g., RM, BG, DP..."
                value={newSectionIcon}
                onChange={(e) => setNewSectionIcon(e.target.value.substring(0, 2))}
                maxLength={2}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to auto-generate from title
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setNewSectionDialogOpen(false);
              setNewSectionTitle("");
              setNewSectionIcon("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddNewSection}
              disabled={!newSectionTitle.trim()}
            >
              Add Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
