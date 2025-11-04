import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, FileText, Building, FileStack, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Template, Workflow, WorkflowStage } from "@shared/schema";

const sowTypeOptions = [
  {
    value: "New Vendor (RFT)",
    title: "New Vendor (RFT)",
    description: "Request for Tender for engaging new vendors",
    icon: Building,
  },
  {
    value: "Existing Vendor Enhancement",
    title: "Existing Vendor Enhancement",
    description: "Enhancements or changes to existing vendor agreements",
    icon: FileText,
  },
  {
    value: "Flexi Sourcing - TNM",
    title: "Flexi Sourcing - TNM",
    description: "Time and Materials flexible sourcing model",
    icon: FileStack,
  },
  {
    value: "Flexi Sourcing - Fixed Scope",
    title: "Flexi Sourcing - Fixed Scope",
    description: "Fixed scope within flexible sourcing arrangement",
    icon: Users,
  },
];

const steps = [
  { id: 1, title: "SOW Type", subtitle: "Select SOW category" },
  { id: 2, title: "Project Details", subtitle: "Basic information" },
  { id: 3, title: "Template", subtitle: "Choose starting point" },
  { id: 4, title: "Workflow & Reviewers", subtitle: "Setup approvals" },
];

export default function CreateSOW() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  // New: toggle for auto AI generation
  const [autoAIGenerate, setAutoAIGenerate] = useState(false);
  // Track the created SOW ID for navigation after AI generation
  const [createdSowId, setCreatedSowId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    sowType: "",
    title: "",
    initiative: "",
    deliveryPortfolio: "",
    sponsor: "",
    businessOwner: "",
    vendorName: "",
    client: "Emirates",
    startDate: "",
    endDate: "",
    budget: "",
    currency: "USD",
    requirements: "",
    templateId: "",
    workflowId: "",
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const { data: workflows = [] } = useQuery<Workflow[]>({
    queryKey: ["/api/workflows"],
  });

  // New: AI bulk generation mutation
  const aiBulkMutation = useMutation({
    mutationFn: async (sowId: string) => {
      const response = await apiRequest("POST", `/api/sows/${sowId}/ai-generate-all`, {});
      return { sowId, ...response };
    },
    onSuccess: async (data) => {
      const sowId = data.sowId;
      
      // Invalidate queries to mark them as stale
      queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
      queryClient.invalidateQueries({ queryKey: [`/api/sows/${sowId}`] });
      
      // Remove the query from cache to force a fresh fetch
      queryClient.removeQueries({ queryKey: [`/api/sows/${sowId}`] });
      
      toast({
        title: "SOW Created with AI Content",
        description: "All sections have been filled with AI-generated content.",
      });
      
      // Navigate to editor - it will fetch fresh data
      setLocation(`/editor?id=${sowId}`);
    },
    onError: (error, sowId) => {
      console.error("AI generation error:", error);
      toast({
        title: "AI Generation Failed",
        description: "SOW created but AI generation failed. You can edit sections manually.",
        variant: "destructive",
      });
      
      // Still navigate to editor even if AI generation failed
      setLocation(`/editor?id=${sowId}`);
    },
  });

  const createSowMutation = useMutation({
    mutationFn: async () => {
      const template = templates.find((t) => t.id === formData.templateId);
      let sectionsData = "{}";
      if (template?.sections) {
        try {
          const parsed = typeof template.sections === "string" ? JSON.parse(template.sections) : template.sections;
          sectionsData = JSON.stringify(parsed);
        } catch (e) {
          console.error("Error parsing template sections:", e);
        }
      }
      return apiRequest("POST", "/api/sows", {
        sowType: formData.sowType,
        title: formData.title,
        initiative: formData.initiative,
        deliveryPortfolio: formData.deliveryPortfolio || undefined,
        vendorName: formData.vendorName,
        client: formData.client,
        sponsor: formData.sponsor || undefined,
        businessOwner: formData.businessOwner || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        budget: formData.budget || undefined,
        currency: formData.currency || "USD",
        requirements: formData.requirements,
        // If a workflow is selected, set to pending_review so approvals can be created
        status: formData.workflowId ? "pending_review" : "draft",
        workflowId: formData.workflowId || undefined,
        createdBy: user?.id || undefined,
        sections: sectionsData,
      });
    },
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
      
      if (autoAIGenerate && data?.id) {
        // Don't show "SOW Created" toast yet if AI generation is enabled
        // We'll navigate after AI generation completes
        await aiBulkMutation.mutateAsync(data.id);
        // Navigation happens in aiBulkMutation.onSuccess
      } else {
        // If no AI generation, show toast and navigate immediately
        toast({
          title: "SOW Created",
          description: "Your Statement of Work has been created successfully.",
        });
        setLocation(`/editor?id=${data.id}`);
      }
    },
  });

  const filteredTemplates = templates.filter(
    (t) => !formData.sowType || t.sowType.toLowerCase() === formData.sowType.toLowerCase()
  );

  const canProceed = () => {
    if (currentStep === 1) return !!formData.sowType;
    if (currentStep === 2) return !!formData.title && !!formData.initiative && !!formData.vendorName && !!formData.client && !!formData.startDate && !!formData.endDate && !!formData.requirements;
    if (currentStep === 3) return !!formData.templateId;
    return true;
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      createSowMutation.mutate();
    }
  };

  return (
    <>
      {/* Loader dialog for SOW creation and AI bulk generation */}
      {(createSowMutation.isPending || aiBulkMutation.isPending) && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center gap-4 min-w-[320px]">
            <Loader2 className="animate-spin w-10 h-10 text-primary" />
            <div className="text-lg font-semibold text-center">
              {createSowMutation.isPending && !aiBulkMutation.isPending
                ? "Creating your SOW..."
                : "Generating all sections with AI..."}
            </div>
            <div className="text-sm text-muted-foreground text-center">
              {createSowMutation.isPending && !aiBulkMutation.isPending
                ? "Setting up your Statement of Work..."
                : "This may take up to a minute for large SOWs."}
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        <div className="w-full mx-auto p-8 space-y-8">
          <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation("/")} data-testid="button-back-to-dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Create New SOW</h1>
          <p className="text-muted-foreground">Let's set up your Statement of Work</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    currentStep > step.id
                      ? "bg-primary border-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                  data-testid={`step-indicator-${step.id}`}
                >
                  {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
                </div>
                <div className="text-center hidden sm:block">
                  <p className="text-xs font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.subtitle}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.id ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="border-card-border">
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <CardDescription>{steps[currentStep - 1].subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Select SOW Type</h3>
                <p className="text-sm text-muted-foreground mb-6">Choose the category that best fits your needs</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sowTypeOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = formData.sowType === option.value;
                    return (
                      <Card
                        key={option.value}
                        className={`cursor-pointer border-2 transition-all hover-elevate ${
                          isSelected ? "border-primary bg-accent" : "border-card-border"
                        }`}
                        onClick={() => setFormData({ ...formData, sowType: option.value })}
                        data-testid={`card-sow-type-${option.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      >
                        <CardHeader>
                          <Icon className="w-8 h-8 text-primary mb-2" />
                          <CardTitle className="text-base">{option.title}</CardTitle>
                          <CardDescription className="text-sm">{option.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">SOW Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Digital Transformation Project 2024"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    data-testid="input-title"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="initiative">Initiative *</Label>
                    <Input
                      id="initiative"
                      placeholder="Initiative name"
                      value={formData.initiative}
                      onChange={(e) => setFormData({ ...formData, initiative: e.target.value })}
                      data-testid="input-initiative"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryPortfolio">Delivery Portfolio</Label>
                    <Input
                      id="deliveryPortfolio"
                      placeholder="Portfolio name"
                      value={formData.deliveryPortfolio}
                      onChange={(e) => setFormData({ ...formData, deliveryPortfolio: e.target.value })}
                      data-testid="input-delivery-portfolio"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sponsor">Sponsor</Label>
                    <Input
                      id="sponsor"
                      placeholder="Project sponsor name"
                      value={formData.sponsor}
                      onChange={(e) => setFormData({ ...formData, sponsor: e.target.value })}
                      data-testid="input-sponsor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessOwner">Business Owner</Label>
                    <Input
                      id="businessOwner"
                      placeholder="Business owner name"
                      value={formData.businessOwner}
                      onChange={(e) => setFormData({ ...formData, businessOwner: e.target.value })}
                      data-testid="input-business-owner"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor Name *</Label>
                  <Input
                    id="vendor"
                    placeholder="Vendor or contractor name"
                    value={formData.vendorName}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                    data-testid="input-vendor"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client">Client *</Label>
                  <Input
                    id="client"
                    placeholder="Client name"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    data-testid="input-client"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      data-testid="input-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      data-testid="input-end-date"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget</Label>
                    <Input
                      id="budget"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      data-testid="input-budget"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      placeholder="USD"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      data-testid="input-currency"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">Requirements *</Label>
                  <Textarea
                    id="requirements"
                    placeholder="Enter key requirements and expectations for this SOW..."
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    className="min-h-[120px]"
                    data-testid="textarea-requirements"
                  />
                  <p className="text-xs text-muted-foreground">
                    These requirements will be used by AI to generate better content suggestions
                  </p>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Select Template</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Choose a starting template for your SOW
                </p>
                <div className="grid grid-cols-1 gap-4">
                  {filteredTemplates.map((template) => {
                    const isSelected = formData.templateId === template.id;
                    return (
                      <Card
                        key={template.id}
                        className={`cursor-pointer border-2 transition-all hover-elevate ${
                          isSelected ? "border-primary bg-accent" : "border-card-border"
                        }`}
                        onClick={() => setFormData({ ...formData, templateId: template.id })}
                        data-testid={`card-template-${template.id}`}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              {template.isOfficial === "true" && (
                                <Badge variant="secondary" className="mb-2 text-xs">official</Badge>
                              )}
                              <CardTitle className="text-base mb-2">{template.name}</CardTitle>
                              <CardDescription className="text-sm">{template.description}</CardDescription>
                              <Badge variant="outline" className="mt-3 text-xs">{template.sowType}</Badge>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
               
                
                <h3 className="text-lg font-semibold mb-4">Select Approval Workflow</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Choose the approval workflow that matches your SOW type
                </p>
                <div className="space-y-4">
                  {workflows
                    .filter((w) => {
                      if (!formData.sowType) return true;
                      try {
                        const sowTypes = JSON.parse(w.sowTypes) as string[];
                        return sowTypes.includes(formData.sowType);
                      } catch (e) {
                        // If sowTypes is not valid JSON, treat it as a single type
                        return w.sowTypes === formData.sowType;
                      }
                    })
                    .map((workflow) => {
                      let stages: WorkflowStage[] = [];
                      try {
                        stages = JSON.parse(workflow.stages) as WorkflowStage[];
                      } catch (e) {
                        console.error("Error parsing workflow stages:", e);
                      }
                      const isSelected = formData.workflowId === workflow.id;
                      return (
                        <Card
                          key={workflow.id}
                          className={`cursor-pointer border-2 transition-all hover-elevate ${
                            isSelected ? "border-primary bg-accent" : "border-card-border"
                          }`}
                          onClick={() => setFormData({ ...formData, workflowId: workflow.id })}
                          data-testid={`card-workflow-${workflow.id}`}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <CardTitle className="text-base mb-2">{workflow.name}</CardTitle>
                                <CardDescription className="text-sm mb-3">{workflow.description}</CardDescription>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {stages.length} {stages.length === 1 ? "stage" : "stages"}
                                  </Badge>
                                  {workflow.isActive && (
                                    <Badge variant="secondary" className="text-xs">active</Badge>
                                  )}
                                </div>
                                {stages.length > 0 && (
                                  <div className="mt-3 pt-3 border-t space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Approval Stages:</p>
                                    {stages.map((stage, index) => (
                                      <div key={stage.id} className="text-xs text-muted-foreground">
                                        {index + 1}. {stage.name}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      );
                    })}
                  {workflows.filter((w) => {
                    if (!formData.sowType) return true;
                    try {
                      const sowTypes = JSON.parse(w.sowTypes) as string[];
                      return sowTypes.includes(formData.sowType);
                    } catch (e) {
                      return w.sowTypes === formData.sowType;
                    }
                  }).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No workflows available for this SOW type</p>
                      <p className="text-xs mt-2">You can proceed without selecting a workflow</p>
                    </div>
                  )}
                </div>

                 {/* AI Generation Toggle */}
                <Card className="border-purple-200 bg-purple-50/30">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Switch
                        id="auto-ai-generate"
                        checked={autoAIGenerate}
                        onCheckedChange={setAutoAIGenerate}
                      />
                      <div className="flex-1">
                        <Label htmlFor="auto-ai-generate" className="cursor-pointer text-base font-semibold">
                          Auto-generate all sections with AI
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Enable this to automatically generate content for all SOW sections using AI after creation. This will save time but you can always edit the content later.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || createSowMutation.isPending || aiBulkMutation.isPending}
            data-testid="button-next"
          >
            {createSowMutation.isPending
              ? "Creating..."
              : aiBulkMutation.isPending
                ? "Generating with AI..."
                : currentStep === 4
                  ? (autoAIGenerate ? "Create & Auto-Generate" : "Create SOW")
                  : <>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
            }
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}
