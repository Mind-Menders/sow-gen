import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import ReactQuill, { Quill } from "react-quill";
import { ArrowLeft, Save, Download, Sparkles, Check, CheckCircle2, Clock, XCircle, FileDown, Users2, Copy, Ban, CheckSquare, History, UserCog, RotateCcw, GripVertical, Pencil, Trash2, Lock } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Sow, SowSections, SowApproval, Workflow, User, SowAuditTrail } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { AIBadge, AIContainer } from "@/components/ai-badge";
import { AIAnalysisPanel } from "@/components/ai-analysis-panel";
import { AIChatAssistant } from "@/components/ai-chat-assistant";

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
  draft: { label: "Draft", variant: "secondary" as const },
  initiated: { label: "Initiated", variant: "secondary" as const },
  pending_review: { label: "Pending Review", variant: "default" as const },
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
  const quillRef = useRef<any>(null);
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
  const [aiSuggestionsDialogOpen, setAiSuggestionsDialogOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ title: string; icon: string; description: string; selected: boolean }>>([]);
  const debouncedEditContent = useDebounce(editContent, 2000);
  const [draggedSectionKey, setDraggedSectionKey] = useState<string | null>(null);
  const [dragOverSectionKey, setDragOverSectionKey] = useState<string | null>(null);
  const [editSectionDialogOpen, setEditSectionDialogOpen] = useState(false);
  const [editingSectionKey, setEditingSectionKey] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");
  const [deleteSectionDialogOpen, setDeleteSectionDialogOpen] = useState(false);
  const [deletingSectionKey, setDeletingSectionKey] = useState<string | null>(null);
  const [duplicateConfirmDialogOpen, setDuplicateConfirmDialogOpen] = useState(false);
  const [cancelConfirmDialogOpen, setCancelConfirmDialogOpen] = useState(false);

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

  // Determine if user can edit this SOW
  const canEditSow = useMemo(() => {
    if (!user || !sow) return false;
    
    // Cannot edit if ready for submission (final version) or rejected
    if (sow.status === 'ready_for_submission' || sow.status === 'rejected') return false;
    
    // Admin can edit any SOW (except ready for submission or rejected)
    if (user.role === "admin") return true;
    
    // Creator can edit their own SOWs
    if (sow.createdBy === user.id) return true;
    
    // Current reviewer can edit
    const pendingApproval = approvals?.find((a) => a.status === 'pending');
    if (pendingApproval && pendingApproval.reviewerId === user.id) return true;
    
    return false;
  }, [user, sow, approvals]);

  const isFinalVersion = sow?.status === 'ready_for_submission';
  const isRejected = sow?.status === 'rejected';

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

  // Debug: Log approvals data when loaded
  useEffect(() => {
    if (approvals && approvals.length > 0) {
      console.log('Approvals loaded:', approvals.map(a => ({
        id: a.id,
        reviewerId: a.reviewerId,
        currentStage: a.currentStage,
        status: a.status,
        reviewedAt: a.reviewedAt
      })));
    }
  }, [approvals]);

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
      // Autosave: do NOT pass manual flag - no version increment
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
      // Manual save: pass manual flag to increment version and create audit entry
      return apiRequest("PATCH", `/api/sows/${sowId}?manual=1`, {
        sections: JSON.stringify(updatedSections),
      });
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}/audit`] });
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
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}/audit`] });
      toast({
        title: "Marked as Reviewed",
        description: "Your review has been recorded.",
      });
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
      // No need to pass createdBy - server will use current session user
      return apiRequest("POST", `/api/sows/${sowId}/copy`, {});
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

  const markReadyForSubmissionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/sows/${sowId}/ready-for-submission`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}/audit`] });
      queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
      toast({
        title: "SOW Ready for Submission",
        description: "All approvals are complete. SOW is now ready for submission.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.details 
        ? `${error.error || 'Not all approvals are complete'}. Pending: ${error.details.pending || 0}, Rejected: ${error.details.rejected || 0}`
        : error?.error || "Could not mark SOW as ready for submission. Please try again.";
      toast({
        title: "Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleApplySuggestion = () => {
    if (aiSuggestion && quillRef.current) {
      const quill = quillRef.current.getEditor();
      quill.clipboard.dangerouslyPasteHTML(aiSuggestion);
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

  const getSuggestedSectionsMutation = useMutation({
    mutationFn: async () => {
      if (!sowId) return;
      return apiRequest("POST", "/api/ai/suggest-sections", { sowId });
    },
    onSuccess: (data: any) => {
      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setAiSuggestions(data.suggestions.map((s: any) => ({ ...s, selected: true })));
        setAiSuggestionsDialogOpen(true);
      } else {
        toast({
          title: "No Suggestions",
          description: "No additional sections recommended at this time.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Failed",
        description: "Could not get AI section suggestions. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleApplySuggestedSections = async () => {
    const selectedSuggestions = aiSuggestions.filter(s => s.selected);
    
    if (selectedSuggestions.length === 0) {
      toast({
        title: "No Sections Selected",
        description: "Please select at least one section to add.",
        variant: "destructive",
      });
      return;
    }

    const updatedSections = { ...sections };
    
    for (const suggestion of selectedSuggestions) {
      const sectionId = suggestion.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Skip if section already exists
      if (updatedSections[sectionId]) {
        continue;
      }

      updatedSections[sectionId] = {
        id: sectionId,
        icon: suggestion.icon,
        title: suggestion.title,
        content: "",
      };
    }

    setSections(updatedSections);

    if (sowId) {
      try {
        await apiRequest("PATCH", `/api/sows/${sowId}`, {
          sections: JSON.stringify(updatedSections),
        });
        queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
        toast({
          title: "Sections Added",
          description: `${selectedSuggestions.length} section(s) added successfully`,
        });
        setAiSuggestionsDialogOpen(false);
        setAiSuggestions([]);
      } catch (error) {
        toast({
          title: "Failed to Add Sections",
          description: "Could not add the suggested sections. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, sectionKey: string) => {
    setDraggedSectionKey(sectionKey);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>, sectionKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSectionKey(sectionKey);
  };

  const handleDragLeave = () => {
    setDragOverSectionKey(null);
  };

  const handleDrop = async (e: React.DragEvent<HTMLButtonElement>, targetKey: string) => {
    e.preventDefault();
    setDragOverSectionKey(null);

    if (!draggedSectionKey || draggedSectionKey === targetKey) {
      setDraggedSectionKey(null);
      return;
    }

    // Reorder sections
    const sectionEntries = Object.entries(sections);
    const draggedIndex = sectionEntries.findIndex(([key]) => key === draggedSectionKey);
    const targetIndex = sectionEntries.findIndex(([key]) => key === targetKey);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedSectionKey(null);
      return;
    }

    // Create new array with reordered sections
    const reordered = [...sectionEntries];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    // Convert back to object maintaining new order
    const reorderedSections: SowSections = {};
    reordered.forEach(([key, value]) => {
      reorderedSections[key] = value;
    });

    setSections(reorderedSections);
    setDraggedSectionKey(null);

    // Save reordered sections to backend
    if (sowId) {
      try {
        await apiRequest("PATCH", `/api/sows/${sowId}`, {
          sections: JSON.stringify(reorderedSections),
        });
        queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
        toast({
          title: "Sections Reordered",
          description: "Section order has been saved successfully.",
        });
      } catch (error) {
        toast({
          title: "Save Failed",
          description: "Could not save section order. Please try again.",
          variant: "destructive",
        });
        // Revert on error
        setSections(sections);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedSectionKey(null);
    setDragOverSectionKey(null);
  };

  const handleEditSectionClick = (e: React.MouseEvent, sectionKey: string) => {
    e.stopPropagation(); // Prevent section selection
    setEditingSectionKey(sectionKey);
    setEditingSectionTitle(sections[sectionKey].title);
    setEditSectionDialogOpen(true);
  };

  const handleDeleteSectionClick = (e: React.MouseEvent, sectionKey: string) => {
    e.stopPropagation(); // Prevent section selection
    setDeletingSectionKey(sectionKey);
    setDeleteSectionDialogOpen(true);
  };

  const editSectionMutation = useMutation({
    mutationFn: async () => {
      if (!editingSectionKey || !editingSectionTitle.trim()) {
        throw new Error("Invalid section data");
      }

      const oldTitle = sections[editingSectionKey].title;
      const updatedSections = {
        ...sections,
        [editingSectionKey]: {
          ...sections[editingSectionKey],
          title: editingSectionTitle.trim(),
        },
      };

      // Update SOW with new section title
      await apiRequest("PATCH", `/api/sows/${sowId}`, {
        sections: JSON.stringify(updatedSections),
      });

      // Create audit trail entry
      await apiRequest("POST", `/api/sows/${sowId}/audit`, {
        action: "section_renamed",
        remarks: `Renamed section from "${oldTitle}" to "${editingSectionTitle.trim()}"`,
        metadata: JSON.stringify({
          sectionKey: editingSectionKey,
          oldTitle,
          newTitle: editingSectionTitle.trim(),
        }),
      });

      return updatedSections;
    },
    onSuccess: (updatedSections) => {
      setSections(updatedSections);
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}/audit`] });
      setEditSectionDialogOpen(false);
      setEditingSectionKey(null);
      setEditingSectionTitle("");
      toast({
        title: "Section Updated",
        description: "Section title has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not update section title. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async () => {
      if (!deletingSectionKey) {
        throw new Error("No section selected");
      }

      const deletedSection = sections[deletingSectionKey];
      const updatedSections = { ...sections };
      delete updatedSections[deletingSectionKey];

      // Update SOW with section removed
      await apiRequest("PATCH", `/api/sows/${sowId}`, {
        sections: JSON.stringify(updatedSections),
      });

      // Create audit trail entry
      await apiRequest("POST", `/api/sows/${sowId}/audit`, {
        action: "section_deleted",
        remarks: `Deleted section "${deletedSection.title}"`,
        metadata: JSON.stringify({
          sectionKey: deletingSectionKey,
          sectionTitle: deletedSection.title,
          sectionIcon: deletedSection.icon,
        }),
      });

      return { updatedSections, deletedKey: deletingSectionKey };
    },
    onSuccess: ({ updatedSections, deletedKey }) => {
      setSections(updatedSections);
      
      // If the deleted section was selected, clear selection or select first available
      if (selectedSection === deletedKey) {
        const remainingSections = Object.keys(updatedSections);
        setSelectedSection(remainingSections.length > 0 ? remainingSections[0] : null);
        setEditContent(remainingSections.length > 0 ? updatedSections[remainingSections[0]].content : "");
      }

      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}/audit`] });
      setDeleteSectionDialogOpen(false);
      setDeletingSectionKey(null);
      toast({
        title: "Section Deleted",
        description: "Section has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Could not delete section. Please try again.",
        variant: "destructive",
      });
    },
  });

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

  // Normalize status values coming from server/DB to the canonical keys used in statusConfig
  const normalizeStatus = (value: string | null | undefined): keyof typeof statusConfig | undefined => {
    if (!value) return undefined;
    const raw = (value + "").toLowerCase().trim();
    // common whitespace/hyphen variations -> underscore
    const underscored = raw.replace(/[\s-]+/g, "_");
    // legacy and friendly mappings
    const map: Record<string, keyof typeof statusConfig> = {
      pending_approval: "pending_review",
      approved: "ready_for_submission",
      in_review: "in_review",
      inreview: "in_review",
      pending_review: "pending_review",
      pendingreview: "pending_review",
      ready_for_submission: "ready_for_submission",
      readyforsubmission: "ready_for_submission",
      draft: "draft",
      initiated: "initiated",
      rejected: "rejected",
    };
    if (map[underscored]) return map[underscored];
    // final check if statusConfig has the key after normalization
    return (underscored in statusConfig) ? (underscored as keyof typeof statusConfig) : undefined;
  };

  const normalizedStatus = normalizeStatus(sow.status);

  // Compute derived status for display
  let displayStatus: keyof typeof statusConfig | undefined = normalizedStatus;
  if (
    normalizedStatus !== 'rejected' &&
    normalizedStatus !== 'ready_for_submission' &&
    approvals && approvals.some(a => a.status === 'reviewed' || a.status === 'approved')
  ) {
    displayStatus = 'in_review';
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
                    size="default"
                    onClick={() => setLocation("/")} 
                    data-testid="button-back"
                    className="gap-2 -ml-2 h-10 px-4 rounded-lg transition-all hover:bg-accent"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                  </Button>
                  <div className="h-5 w-px bg-border" />
                  <p className="text-lg font-bold font-mono text-foreground" data-testid="text-sow-number">
                    #{sow.sowNumber}
                  </p>
                  <div className="h-5 w-px bg-border" />
                  
                  {/* Version Stamp Badge - Larger in Editor */}
                  <div className="relative">
                    <div 
                      className="px-4 py-2.5 bg-gradient-to-br from-amber-500/20 to-orange-600/30 border-2 border-amber-600/40 rounded-lg shadow-lg transform rotate-1 hover:rotate-0 transition-transform duration-200"
                      style={{
                        boxShadow: "0 3px 6px rgba(217, 119, 6, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
                      }}
                      data-testid="text-sow-version"
                    >
                      <div className="text-center">
                        <div className="text-[11px] font-bold text-amber-900/70 uppercase tracking-wide leading-none">
                          Version
                        </div>
                        <div className="text-2xl font-black text-amber-900 leading-none mt-1">
                          {sow.version ?? 1}
                        </div>
                        {(() => {
                          const lastEditor = users?.find((u: any) => u.id === sow.lastEditedBy);
                          if (lastEditor) {
                            return (
                              <div className="text-[10px] text-amber-900/60 leading-tight mt-1">
                                Last edited by<br/>
                                <span className="font-semibold">{lastEditor.firstName || lastEditor.name}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-3" data-testid="sow-title">
                  {sow.title}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Status:</span>
                    {displayStatus ? (
                      <Badge variant={statusConfig[displayStatus].variant} className="text-xs">
                        {statusConfig[displayStatus].label}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        {sow.status ? sow.status : 'Unknown Status'}
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
              <div className="flex items-center gap-3 flex-wrap">
                <Button 
                  variant="outline" 
                  size="default"
                  onClick={() => setLocation(`/edit-sow?id=${sowId}`)}
                  data-testid="button-edit-details"
                  className="h-10 px-5 rounded-lg transition-all hover:shadow-md"
                >
                  Edit Details
                </Button>
                
                <Button 
                  variant="outline" 
                  size="default"
                  onClick={() => setDuplicateConfirmDialogOpen(true)}
                  disabled={copySowMutation.isPending}
                  data-testid="button-copy-sow"
                  className="h-10 px-5 rounded-lg transition-all hover:shadow-md"
                >
                  <Copy className="w-5 h-5 mr-2" />
                  {copySowMutation.isPending ? "Duplicating now..." : "Duplicate"}
                </Button>
                
                {sow.status !== "rejected" && (
                  <Button 
                    variant="outline" 
                    size="default"
                    onClick={() => setCancelConfirmDialogOpen(true)}
                    disabled={cancelSowMutation.isPending}
                    data-testid="button-cancel-sow"
                    className="h-10 px-5 rounded-lg transition-all hover:shadow-md"
                  >
                    <Ban className="w-5 h-5 mr-2" />
                    {cancelSowMutation.isPending ? "Cancelling..." : "Cancel"}
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  size="default"
                  onClick={handleExport} 
                  data-testid="button-export"
                  className="h-10 px-5 rounded-lg transition-all hover:shadow-md"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Export
                </Button>
                
                <Button 
                  size="default"
                  onClick={() => saveMutation.mutate()} 
                  disabled={saveMutation.isPending || !canEditSow || isFinalVersion || isRejected} 
                  data-testid="button-save"
                  className="h-10 px-6 rounded-lg transition-all hover:shadow-md"
                  title={isRejected ? "Cannot edit rejected SOW" : isFinalVersion ? "Cannot edit final version" : !canEditSow ? "You don't have permission to edit" : ""}
                >
                  <Save className="w-5 h-5 mr-2" />
                  {saveMutation.isPending ? "Saving..." : isRejected ? "Rejected" : isFinalVersion ? "Locked" : "Save"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="review" disabled={isRejected}>
              <Users2 className="w-4 h-4 mr-2" />
              Review and Approvals
            </TabsTrigger>
          </TabsList>

          {/* Rejected Status Banner */}
          {isRejected && (
            <div className="mt-6 bg-red-50 border-2 border-red-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold text-red-900 text-lg mb-1">SOW Rejected</h3>
                  <p className="text-red-700 text-sm mb-2">
                    This SOW has been rejected and cannot be edited or submitted for review.
                  </p>
                  {auditTrail && auditTrail.length > 0 && (() => {
                    const rejectionEntry = auditTrail
                      .filter(a => a.newStatus === 'rejected')
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                    
                    if (rejectionEntry) {
                      const rejector = users?.find(u => u.id === rejectionEntry.performedBy);
                      return (
                        <div className="bg-red-100 rounded p-3 text-sm">
                          <p className="text-red-900 font-medium mb-1">
                            Rejected by: {rejector?.firstName || rejector?.name || 'Unknown'}
                          </p>
                          {rejectionEntry.remarks && (
                            <p className="text-red-800">
                              <span className="font-medium">Reason:</span> {rejectionEntry.remarks}
                            </p>
                          )}
                          <p className="text-red-600 text-xs mt-1">
                            {format(new Date(rejectionEntry.createdAt), 'PPpp')}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          )}

          <TabsContent value="editor" className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-[18px] pl-[1px] pr-[1px] ml-[1px] mr-[1px] pt-[1px] pb-[1px]">
          <div className="lg:col-span-1">
            <Card className="border-card-border sticky top-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Document Sections</CardTitle>
                    <p className="text-xs text-muted-foreground">Click to edit a section</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => getSuggestedSectionsMutation.mutate()}
                      disabled={getSuggestedSectionsMutation.isPending || !canEditSow || isFinalVersion}
                      className="gap-1 h-9 px-3 rounded-lg transition-all hover:shadow-md"
                      title="AI Suggested Sections"
                    >
                      <Sparkles className="w-4 h-4" />
                      {getSuggestedSectionsMutation.isPending ? "..." : "AI"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setNewSectionDialogOpen(true)}
                      disabled={!canEditSow || isFinalVersion}
                      className="gap-1 h-9 px-3 rounded-lg transition-all hover:shadow-md"
                    >
                      <span className="text-lg">+</span>
                      Add
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {sectionsList.map(([key, section], index) => {
                  const isCompleted = section.content.trim().length > 0;
                  const isActive = selectedSection === key;
                  const isDragging = draggedSectionKey === key;
                  const isDropTarget = dragOverSectionKey === key;
                  
                  return (
                    <div key={key} className="relative group">
                      <button
                        draggable
                        onDragStart={(e) => handleDragStart(e, key)}
                        onDragOver={(e) => handleDragOver(e, key)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, key)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleSectionChange(key)}
                        className={`w-full text-left p-3 rounded-md border transition-all hover-elevate ${
                          isActive ? "border-primary bg-accent" : "border-card-border"
                        } ${isDragging ? "opacity-50 cursor-grabbing" : "cursor-grab"} ${
                          isDropTarget ? "border-primary border-2 bg-primary/5" : ""
                        }`}
                        data-testid={`button-section-${key}`}
                      >
                        <div className="flex items-start gap-3">
                          <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                          <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {section.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground mb-1">
                              {index + 1}. {section.title}
                            </p>
                            {/* {section.content && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{section.content.substring(0, 60)}...</p>
                            )} */}
                          </div>
                          {isCompleted && <Check className="w-4 h-4 text-green-600 flex-shrink-0" />}
                        </div>
                      </button>
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleEditSectionClick(e, key)}
                          className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-600"
                          title="Edit section title"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteSectionClick(e, key)}
                          className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                          title="Delete section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
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
              <>
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
                    {isFinalVersion && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-green-900 mb-1">Final Version - Read Only</h4>
                          <p className="text-sm text-green-700">
                            This SOW has been marked as ready for submission and cannot be edited. 
                            All changes are locked to preserve the final version.
                          </p>
                        </div>
                      </div>
                    )}
                    {!canEditSow && !isFinalVersion && !isRejected && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                            <Ban className="w-5 h-5 text-amber-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-amber-900 mb-1">Read Only Access</h4>
                          <p className="text-sm text-amber-700">
                            You don't have permission to edit this SOW. Only the creator and assigned reviewers can make changes.
                          </p>
                        </div>
                      </div>
                    )}
                    {isRejected && (
                      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4 flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-red-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-900 mb-1">SOW Rejected - Read Only</h4>
                          <p className="text-sm text-red-700">
                            This SOW has been rejected and cannot be edited. View the Review and Approvals tab for rejection details.
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="bg-white rounded border" data-testid="textarea-content">
                      <ReactQuill
                        ref={quillRef}
                        theme="snow"
                        value={editContent}
                        onChange={handleContentChange}
                        placeholder={`Enter ${sections[selectedSection].title.toLowerCase()} content... Paste from Word to preserve formatting.`}
                        modules={quillModules}
                        formats={quillFormats}
                        style={{ minHeight: 300 }}
                        readOnly={!canEditSow || isFinalVersion || isRejected}
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
              </>
            )}
          </div>

          {/* Right Column: AI Panels */}
          <div className="lg:col-span-1 space-y-6">
            {selectedSection && sections[selectedSection] && (
              <AIContainer>
                <AIAnalysisPanel
                  sowId={sowId!}
                  sectionTitle={sections[selectedSection].title}
                  sectionContent={editContent}
                />
              </AIContainer>
            )}

            <AIContainer>
              <Card className="border-card-border sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AIBadge tooltip="AI-Powered Content Generation">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      <span>AI Content Generator</span>
                    </AIBadge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Generate professional content suggestions using AI</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    variant="outline" 
                    size="default"
                    className="w-full h-11 rounded-lg transition-all hover:shadow-md" 
                    onClick={() => generateAiMutation.mutate()}
                    disabled={generateAiMutation.isPending || !selectedSection}
                    data-testid="button-generate-ai"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    {generateAiMutation.isPending ? "Generating..." : "Generate Content"}
                  </Button>

                  {aiSuggestion ? (
                    <div className="space-y-3">
                      <div className="p-4 rounded-md border border-card-border bg-card prose prose-sm max-w-none">
                        <div 
                          dangerouslySetInnerHTML={{ __html: aiSuggestion }}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="default" 
                          variant="default"
                          className="flex-1 h-10 rounded-lg transition-all hover:shadow-md"
                          onClick={() => {
                            if (aiSuggestion && quillRef.current) {
                              const quill = quillRef.current.getEditor();
                              quill.clipboard.dangerouslyPasteHTML(aiSuggestion);
                              setHasUnsavedChanges(true);
                              setAiSuggestion("");
                              toast({
                                title: "Content Inserted",
                                description: "AI suggestion has been inserted into the editor.",
                              });
                            }
                          }}
                          data-testid="button-insert-ai"
                        >
                          Insert
                        </Button>
                        <Button 
                          size="default" 
                          variant="outline"
                          className="h-10 px-5 rounded-lg transition-all hover:shadow-md"
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
                          size="default" 
                          variant="ghost"
                          className="h-10 px-5 rounded-lg transition-all hover:bg-accent"
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
            </AIContainer>
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

                          // Visual style based on stage state
                          const stageState = isPastStage ? 'completed' : (isCurrentStage ? 'current' : 'upcoming');
                          const containerClass = stageState === 'completed'
                            ? 'border-emerald-200 bg-emerald-50'
                            : stageState === 'current'
                              ? 'border-amber-200 bg-amber-50'
                              : 'border-card-border';
                          const iconBubbleClass = stageState === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : stageState === 'current'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-muted text-muted-foreground';
                          const IconForStage = isPastStage ? CheckCircle2 : (isCurrentStage ? Clock : Users2);

                          return (
                            <div key={stage.id || stageIdx} className={`border rounded-xl p-4 md:p-5 ${containerClass}`}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-md flex items-center justify-center ${iconBubbleClass}`}>
                                    <IconForStage className="w-5 h-5" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={isPastStage ? "default" : isCurrentStage ? "secondary" : "outline"} className="text-sm px-2 py-0.5">
                                      Stage {stageIdx + 1}
                                    </Badge>
                                    <span className="text-base font-semibold">{stage.name}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3 mt-3">
                                {stageReviewers.map((reviewer: any) => {
                                  // Debug: log user, reviewer, and button logic
                                  if (user && reviewer) {
                                    const reviewerApproval = approvals?.find(
                                      (approval) => approval.reviewerId === reviewer.id && approval.currentStage === stageIdx
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
                                    (approval) => approval.reviewerId === reviewer.id && approval.currentStage === stageIdx
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
                                    <div key={reviewer.id} className="flex items-center justify-between text-sm md:text-base">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full ${hasReviewed ? 'bg-green-600' : 'bg-gray-300'}`} />
                                        <span className="font-medium">{reviewer.firstName} {reviewer.lastName}</span>
                                      </div>
                                      {isCurrentStage && !hasReviewed && isCurrentUser && (
                                        <Button
                                          size="default"
                                          variant="destructive"
                                          className="h-9 text-sm px-4 flex items-center gap-2"
                                          onClick={() => {
                                            // Find the approval record for this reviewer and stage
                                            // First try to match by reviewerId, then fall back to just stage
                                            let approval = approvals?.find(
                                              (a) => a.reviewerId === reviewer.id && a.currentStage === stageIdx
                                            );
                                            
                                            // If not found by exact reviewerId match, try to find by stage only
                                            // This handles cases where the approval was created with a different user ID
                                            if (!approval) {
                                              const stageApprovals = approvals?.filter(a => a.currentStage === stageIdx && !a.reviewedAt);
                                              if (stageApprovals && stageApprovals.length > 0) {
                                                approval = stageApprovals[0]; // Use the first pending approval for this stage
                                                console.log('Using fallback approval for stage', stageIdx, ':', approval);
                                              }
                                            }
                                            
                                            console.log('Mark Reviewed clicked - Debug Info:', {
                                              approvalId: approval?.id,
                                              reviewerId: reviewer.id,
                                              currentStage: stageIdx,
                                              allApprovals: approvals,
                                              matchingApprovals: approvals?.filter(a => a.currentStage === stageIdx),
                                              reviewerIdsInStage: approvals?.filter(a => a.currentStage === stageIdx).map(a => a.reviewerId),
                                            });
                                            if (approval?.id && reviewer.id) {
                                              markAsReviewedMutation.mutate({
                                                approvalId: approval.id,
                                                reviewerId: reviewer.id,
                                              });
                                            } else {
                                              console.error('Approval record not found!', {
                                                searchedFor: { reviewerId: reviewer.id, currentStage: stageIdx },
                                                availableApprovals: approvals?.map(a => ({ 
                                                  id: a.id, 
                                                  reviewerId: a.reviewerId, 
                                                  currentStage: a.currentStage,
                                                  status: a.status 
                                                }))
                                              });
                                              alert(`Approval record not found for this reviewer/stage.\n\nSearching for: Reviewer ${reviewer.id}, Stage ${stageIdx}\nPlease check the console for details.`);
                                            }
                                          }}
                                          disabled={markAsReviewedMutation.isPending}
                                        >
                                          <CheckSquare className="w-5 h-5 mr-1" />
                                          {markAsReviewedMutation.isPending ? "..." : "Mark Reviewed"}
                                        </Button>
                                      )}
                                      {hasReviewed && (
                                        <span className="text-muted-foreground font-medium">Reviewed</span>
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
                {/* Administrative Actions moved to top */}
                <div className="mb-6 pb-6 border-b space-y-3">
                  <h3 className="font-medium text-sm">Administrative Actions</h3>
                  
                  {/* User-friendly approval status message */}
                  {sow && 
                    String(sow.createdBy) === String(user?.id) && 
                    normalizedStatus === 'in_review' && 
                    approvals && 
                    approvals.length > 0 && (
                    <div className={`rounded-lg p-4 border-2 ${
                      approvals.every((a) => a.status === 'approved' || a.status === 'reviewed')
                        ? 'bg-green-50 border-green-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        {approvals.every((a) => a.status === 'approved' || a.status === 'reviewed') ? (
                          <>
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-green-900 mb-1">All Reviews Complete!</p>
                              <p className="text-sm text-green-700">
                                All {approvals.length} reviewer{approvals.length > 1 ? 's have' : ' has'} approved this SOW. 
                                You can now mark it as ready for submission.
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-blue-900 mb-1">Review in Progress</p>
                              <p className="text-sm text-blue-700 mb-2">
                                {approvals.filter(a => a.status === 'pending').length} of {approvals.length} review{approvals.length > 1 ? 's' : ''} pending.
                              </p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-blue-200 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="bg-blue-600 h-full transition-all duration-500"
                                    style={{ 
                                      width: `${(approvals.filter(a => a.status === 'approved' || a.status === 'reviewed').length / approvals.length) * 100}%` 
                                    }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-blue-700 min-w-[3rem] text-right">
                                  {approvals.filter(a => a.status === 'approved' || a.status === 'reviewed').length}/{approvals.length}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3 flex-wrap">
                    {/* Ready for Submission button - only show to creator when all approvals complete and in_review */}
                    {(() => {
                      // Use string comparison to handle both string IDs and MongoDB ObjectIds
                      const isCreator = sow && user?.id && String(sow.createdBy) === String(user.id);
                      const isInReview = normalizedStatus === 'in_review';
                      const hasApprovals = approvals && approvals.length > 0;
                      const allApproved = hasApprovals && approvals.every((a) => a.status === 'approved' || a.status === 'reviewed');
                      
                      const shouldShow = isCreator && isInReview && hasApprovals && allApproved;
                      
                      console.log('Ready for Submission button check:', {
                        sowCreatedBy: sow?.createdBy,
                        userId: user?.id,
                        isCreator,
                        isInReview,
                        hasApprovals,
                        allApproved,
                        shouldShow,
                        approvals: approvals?.map(a => ({ status: a.status, reviewerId: a.reviewerId }))
                      });
                      
                      if (shouldShow) {
                        return (
                          <Button
                            variant="default"
                            size="default"
                            onClick={() => markReadyForSubmissionMutation.mutate()}
                            disabled={markReadyForSubmissionMutation.isPending}
                            className="h-10 px-5 rounded-lg transition-all hover:shadow-md bg-green-600 hover:bg-green-700"
                          >
                            <CheckSquare className="w-5 h-5 mr-2" />
                            {markReadyForSubmissionMutation.isPending ? "Updating..." : "Mark Ready for Submission"}
                          </Button>
                        );
                      }
                      return null;
                    })()}
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setRevertDialogOpen(true)}
                      disabled={!sow || normalizedStatus === 'draft'}
                      className="h-10 px-5 rounded-lg transition-all hover:shadow-md"
                    >
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Revert to Previous Stage
                    </Button>
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setReassignDialogOpen(true)}
                      disabled={!workflow}
                      className="h-10 px-5 rounded-lg transition-all hover:shadow-md"
                    >
                      <UserCog className="w-5 h-5 mr-2" />
                      Reassign Reviewer
                    </Button>
                  </div>
                </div>
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
                              {entry.action === 'reviewed' && 'Approval Updated'}
                              {entry.action === 'section_renamed' && 'Section Title Updated'}
                              {entry.action === 'section_deleted' && 'Section Deleted'}
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

                {/* Administrative Actions are placed above */}
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
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
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
            <Button 
              variant="outline" 
              size="default"
              className="h-10 px-6 rounded-lg transition-all hover:shadow-md"
              onClick={() => {
                setRevertDialogOpen(false);
                setRevertStatus("");
                setActionRemarks("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="default"
              className="h-10 px-6 rounded-lg transition-all hover:shadow-md"
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
            <Button 
              variant="outline" 
              size="default"
              className="h-10 px-6 rounded-lg transition-all hover:shadow-md"
              onClick={() => {
                setReassignDialogOpen(false);
                setReassignReviewer("");
                setActionRemarks("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="default"
              className="h-10 px-6 rounded-lg transition-all hover:shadow-md"
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
            <Button 
              variant="outline" 
              size="default"
              className="h-10 px-6 rounded-lg transition-all hover:shadow-md"
              onClick={() => {
                setNewSectionDialogOpen(false);
                setNewSectionTitle("");
                setNewSectionIcon("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="default"
              className="h-10 px-6 rounded-lg transition-all hover:shadow-md"
              onClick={handleAddNewSection}
              disabled={!newSectionTitle.trim()}
            >
              Add Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Suggested Sections Dialog */}
      <Dialog open={aiSuggestionsDialogOpen} onOpenChange={setAiSuggestionsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Recommended Sections
            </DialogTitle>
            <DialogDescription>
              Select sections to add to your SOW based on AI analysis
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
            {aiSuggestions.map((suggestion, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => {
                  const updated = [...aiSuggestions];
                  updated[index].selected = !updated[index].selected;
                  setAiSuggestions(updated);
                }}
              >
                <div className="flex items-center h-6">
                  <input
                    type="checkbox"
                    checked={suggestion.selected}
                    onChange={(e) => {
                      const updated = [...aiSuggestions];
                      updated[index].selected = e.target.checked;
                      setAiSuggestions(updated);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </div>
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
                    {suggestion.icon}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm mb-1">{suggestion.title}</h4>
                  <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              size="default"
              className="h-10 px-6 rounded-lg transition-all hover:shadow-md"
              onClick={() => {
                setAiSuggestionsDialogOpen(false);
                setAiSuggestions([]);
              }}
            >
              Cancel
            </Button>
            <Button
              size="default"
              className="h-10 px-6 rounded-lg transition-all hover:shadow-md"
              onClick={handleApplySuggestedSections}
              disabled={aiSuggestions.filter(s => s.selected).length === 0}
            >
              Add {aiSuggestions.filter(s => s.selected).length} Section(s)
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
              <div className="bg-white rounded border">
                <ReactQuill
                  theme="snow"
                  value={exportHeader}
                  onChange={setExportHeader}
                  placeholder="Add header content with images, logos, or formatted text..."
                  modules={quillModules}
                  formats={quillFormats}
                  style={{ minHeight: 150 }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Supports rich formatting and images. This will appear at the top of the exported document.
              </p>
            </div>

            {/* Footer */}
            <div className="space-y-2">
              <Label htmlFor="export-footer">Document Footer (Optional)</Label>
              <div className="bg-white rounded border">
                <ReactQuill
                  theme="snow"
                  value={exportFooter}
                  onChange={setExportFooter}
                  placeholder="Add footer content with images, logos, or formatted text..."
                  modules={quillModules}
                  formats={quillFormats}
                  style={{ minHeight: 150 }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Supports rich formatting and images. This will appear at the bottom of the exported document.
              </p>
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-xs font-medium mb-2">Export Preview:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>✓ Document title and metadata</p>
                <p>✓ Table of contents ({Object.keys(sections).length} sections)</p>
                <p>✓ All section content with formatting and tables</p>
                {exportHeader && <p>✓ Custom header with rich content</p>}
                {exportFooter && <p>✓ Custom footer with rich content</p>}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              size="default"
              className="h-10 px-6 rounded-lg transition-all hover:shadow-md"
              onClick={() => setExportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              size="default"
              className="h-10 px-6 rounded-lg transition-all hover:shadow-md"
              onClick={performExport}
            >
              <Download className="w-5 h-5 mr-2" />
              Export as {exportFormat.toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Section Title Dialog */}
      <Dialog open={editSectionDialogOpen} onOpenChange={setEditSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section Title</DialogTitle>
            <DialogDescription>
              Update the title for this section.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-section-title">Section Title</Label>
              <Input
                id="edit-section-title"
                value={editingSectionTitle}
                onChange={(e) => setEditingSectionTitle(e.target.value)}
                placeholder="Enter section title"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editingSectionTitle.trim()) {
                    editSectionMutation.mutate();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditSectionDialogOpen(false);
                setEditingSectionKey(null);
                setEditingSectionTitle("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => editSectionMutation.mutate()}
              disabled={!editingSectionTitle.trim() || editSectionMutation.isPending}
            >
              {editSectionMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Section Confirmation Dialog */}
      <AlertDialog open={deleteSectionDialogOpen} onOpenChange={setDeleteSectionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the section "{deletingSectionKey && sections[deletingSectionKey] ? sections[deletingSectionKey].title : ''}"? 
              This action cannot be undone and all content in this section will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteSectionDialogOpen(false);
                setDeletingSectionKey(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSectionMutation.mutate()}
              disabled={deleteSectionMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteSectionMutation.isPending ? "Deleting..." : "Delete Section"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate SOW Confirmation Dialog */}
      <AlertDialog open={duplicateConfirmDialogOpen} onOpenChange={setDuplicateConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate SOW</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to create a duplicate of this Statement of Work? 
              A new SOW will be created with all the same content, sections, and workflow settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDuplicateConfirmDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                copySowMutation.mutate();
                setDuplicateConfirmDialogOpen(false);
              }}
              disabled={copySowMutation.isPending}
            >
              {copySowMutation.isPending ? "Duplicating..." : "Duplicate SOW"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel SOW Confirmation Dialog */}
      <AlertDialog open={cancelConfirmDialogOpen} onOpenChange={setCancelConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel SOW</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this Statement of Work? 
              This will mark the SOW as rejected and it cannot be submitted for approval.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelConfirmDialogOpen(false)}>
              No, Keep SOW
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                cancelSowMutation.mutate();
                setCancelConfirmDialogOpen(false);
              }}
              disabled={cancelSowMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {cancelSowMutation.isPending ? "Cancelling..." : "Yes, Cancel SOW"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Chat Assistant */}
      {sowId && <AIChatAssistant sowId={sowId} />}
    </div>
  );
}
