import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Save, Download, Sparkles, Check } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Sow, SowSections } from "@shared/schema";

const statusConfig = {
  draft: { label: "Draft", variant: "secondary" as const },
  pending_approval: { label: "Pending Approval", variant: "default" as const },
  approved: { label: "Approved", variant: "default" as const },
  rejected: { label: "Rejected", variant: "destructive" as const },
};

export default function Editor() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const sowId = params.get("id");

  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [sections, setSections] = useState<SowSections>({});
  const [editContent, setEditContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const debouncedEditContent = useDebounce(editContent, 2000);

  const { data: sow, isLoading } = useQuery<Sow>({
    queryKey: sowId ? [`/api/sows/${sowId}`] : ["/api/sows"],
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
        title: "Save failed",
        description: "Could not save your changes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    if (!sow) return;
    const content = Object.values(sections)
      .map((section) => `${section.title}\n\n${section.content}\n\n`)
      .join("\n");
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sow.title.replace(/\s+/g, "_")}_SOW.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Exported",
      description: "SOW document has been exported successfully.",
    });
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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground truncate" data-testid="text-sow-title">{sow.title}</h1>
              <Badge variant={statusConfig[sow.status as keyof typeof statusConfig].variant} className="uppercase text-xs font-semibold">
                {statusConfig[sow.status as keyof typeof statusConfig].label}
              </Badge>
            </div>
            <p className="text-sm font-mono text-muted-foreground" data-testid="text-sow-number">#{sow.sowNumber}</p>
          </div>
          <div className="flex items-center gap-2">
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
                  <Textarea
                    value={editContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder={`Enter ${sections[selectedSection].title.toLowerCase()} content...`}
                    className="min-h-[300px] resize-none"
                    data-testid="textarea-content"
                  />
                  {hasUnsavedChanges && (
                    <p className="text-xs text-muted-foreground">Auto-saving...</p>
                  )}
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
                  Powered by OpenAI GPT-5
                  <br />
                  <span className="text-[10px] text-muted-foreground/60 italic">
                    [Can be replaced with Microsoft Azure AI]
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
