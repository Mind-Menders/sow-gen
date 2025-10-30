import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileStack, Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Template } from "@shared/schema";

export default function Templates() {
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Template Library</h1>
            <p className="text-muted-foreground">Manage SOW templates for faster document creation</p>
          </div>
          <Button className="gap-2" data-testid="button-create-template">
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
              <Button data-testid="button-create-first-template">
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

      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
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
                <div key={key} className="border rounded p-3">
                  <h3 className="font-semibold">{s?.title || key}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{s?.content || "(no content)"}</p>
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
