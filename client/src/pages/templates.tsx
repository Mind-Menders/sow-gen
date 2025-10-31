import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import ReactQuill from "react-quill";
import { FileStack, Eye, Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Template } from "@shared/schema";

interface TemplateSection {
  id: string;
  title: string;
  content: string;
  icon: string;
}

const sowTypeOptions = [
  "New Vendor (RFT)",
  "Existing Vendor Enhancement",
  "Flexi Sourcing - TNM",
  "Flexi Sourcing - Fixed Scope",
];

export default function Templates() {
  const { toast } = useToast();
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sowType: "",
  });
  const [sections, setSections] = useState<TemplateSection[]>([
    { id: "1", title: "Executive Summary", content: "", icon: "📋" },
    { id: "2", title: "Scope of Work", content: "", icon: "🎯" },
    { id: "3", title: "Deliverables", content: "", icon: "📦" },
  ]);

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      const sectionsData: Record<string, any> = {};
      sections.forEach((section, index) => {
        sectionsData[`section_${index + 1}`] = {
          title: section.title,
          content: section.content,
          icon: section.icon,
          order: index,
        };
      });

      return apiRequest("POST", "/api/templates", {
        name: formData.name,
        description: formData.description,
        sowType: formData.sowType,
        sections: JSON.stringify(sectionsData),
        isOfficial: "false",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setCreateDialogOpen(false);
      setFormData({ name: "", description: "", sowType: "" });
      setSections([
        { id: "1", title: "Executive Summary", content: "", icon: "📋" },
        { id: "2", title: "Scope of Work", content: "", icon: "🎯" },
        { id: "3", title: "Deliverables", content: "", icon: "📦" },
      ]);
      toast({
        title: "Template Created",
        description: "Your template has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addSection = () => {
    const newId = String(Date.now());
    setSections([...sections, { id: newId, title: "", content: "", icon: "📄" }]);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter((s) => s.id !== id));
  };

  const updateSection = (id: string, field: keyof TemplateSection, value: string) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleCreateClick = () => {
    setCreateDialogOpen(true);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Template Library</h1>
            <p className="text-muted-foreground">Manage SOW templates for faster document creation</p>
          </div>
          <Button className="gap-2" data-testid="button-create-template" onClick={handleCreateClick}>
            <Plus className="w-4 h-4" />
            Create Template
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-card-border">
                <CardHeader className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse w-20" />
                  <div className="h-6 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <Card className="border-card-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileStack className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-6">Create your first template to get started</p>
              <Button data-testid="button-create-first-template" onClick={handleCreateClick}>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="border-card-border hover-elevate group" data-testid={`card-template-${template.id}`}>
                <CardHeader className="space-y-3">
                  {template.isOfficial === "true" && (
                    <Badge variant="secondary" className="w-fit uppercase text-xs font-semibold">
                      official
                    </Badge>
                  )}
                  <CardTitle className="text-lg" data-testid={`text-template-name-${template.id}`}>{template.name}</CardTitle>
                  <CardDescription className="text-sm line-clamp-2">{template.description}</CardDescription>
                  <Badge variant="outline" className="w-fit text-xs lowercase">{template.sowType}</Badge>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    data-testid={`button-preview-${template.id}`}
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Define a reusable template with custom sections for your SOWs
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Standard Development SOW"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  placeholder="Brief description of when to use this template"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[60px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-sow-type">SOW Type</Label>
                <Select value={formData.sowType} onValueChange={(value) => setFormData({ ...formData, sowType: value })}>
                  <SelectTrigger id="template-sow-type">
                    <SelectValue placeholder="Select SOW type" />
                  </SelectTrigger>
                  <SelectContent>
                    {sowTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Template Sections */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Template Sections</Label>
                  <p className="text-sm text-muted-foreground">
                    Define the sections that will be included in SOWs created from this template
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addSection}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Section
                </Button>
              </div>

              <div className="space-y-3">
                {sections.map((section, index) => (
                  <Card key={section.id} className="border-card-border">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-2 mt-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor={`section-title-${section.id}`}>Section Title</Label>
                              <Input
                                id={`section-title-${section.id}`}
                                placeholder="e.g., Executive Summary"
                                value={section.title}
                                onChange={(e) => updateSection(section.id, "title", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`section-icon-${section.id}`}>Icon/Emoji</Label>
                              <Input
                                id={`section-icon-${section.id}`}
                                placeholder="e.g., 📋"
                                value={section.icon}
                                onChange={(e) => updateSection(section.id, "icon", e.target.value)}
                                maxLength={2}
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`section-content-${section.id}`}>Default Content (Rich Text)</Label>
                            <div className="bg-white rounded border">
                              <ReactQuill
                                theme="snow"
                                value={section.content}
                                onChange={(value: string) => updateSection(section.id, "content", value)}
                                placeholder="Enter default content for this section (optional)"
                                style={{ minHeight: 80 }}
                              />
                            </div>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSection(section.id)}
                          disabled={sections.length === 1}
                          className="mt-2"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createTemplateMutation.mutate()}
              disabled={!formData.name || !formData.sowType || createTemplateMutation.isPending}
            >
              {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Template Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>{previewTemplate?.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {(() => {
              if (!previewTemplate) return null;
              let sections: Record<string, any> = {};
              try {
                if (typeof previewTemplate.sections === "string") {
                  sections = JSON.parse(previewTemplate.sections || "{}");
                } else {
                  sections = previewTemplate.sections || {};
                }
              } catch (err) {
                console.error("Failed to parse template sections:", err);
                sections = {};
              }

              return Object.entries(sections).map(([key, s]) => (
                <div key={key} className="border rounded p-4 bg-card">
                  <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                    {s?.icon && <span>{s.icon}</span>}
                    {s?.title || key}
                  </h3>
                  {s?.content ? (
                    <div 
                      className="text-sm text-foreground prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: s.content }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">(no content)</p>
                  )}
                </div>
              ));
            })()}
          </div>

          <DialogFooter>
            <Button onClick={() => setPreviewTemplate(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
