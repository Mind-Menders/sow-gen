import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, Save } from "lucide-react";
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
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Sow, Workflow } from "@shared/schema";

const sowTypeOptions = [
  { value: "New Vendor (RFT)", title: "New Vendor (RFT)" },
  { value: "Existing Vendor Enhancement", title: "Existing Vendor Enhancement" },
  { value: "Flexi Sourcing - TNM", title: "Flexi Sourcing - TNM" },
  { value: "Flexi Sourcing - Fixed Scope", title: "Flexi Sourcing - Fixed Scope" },
];

export default function EditSOW() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    sowType: "",
    title: "",
    initiative: "",
    deliveryPortfolio: "",
    sponsor: "",
    businessOwner: "",
    vendorName: "",
    startDate: "",
    endDate: "",
    budget: "",
    currency: "USD",
    requirements: "",
    workflowId: "",
  });

  const sowId = new URLSearchParams(search).get("id");

  const { data: sow, isLoading: sowLoading } = useQuery<Sow>({
    queryKey: ["/api/sows", sowId],
    queryFn: () => apiRequest("GET", `/api/sows/${sowId}`),
    enabled: !!sowId,
  });

  const { data: workflows = [] } = useQuery<Workflow[]>({
    queryKey: ["/api/workflows"],
  });

  // Load SOW data into form when it loads
  useEffect(() => {
    if (sow) {
      setFormData({
        sowType: sow.sowType,
        title: sow.title,
        initiative: sow.initiative,
        deliveryPortfolio: sow.deliveryPortfolio || "",
        sponsor: sow.sponsor || "",
        businessOwner: sow.businessOwner || "",
        vendorName: sow.vendorName,
        startDate: sow.startDate || "",
        endDate: sow.endDate || "",
        budget: sow.budget || "",
        currency: sow.currency || "USD",
        requirements: sow.requirements || "",
        workflowId: sow.workflowId || "",
      });
    }
  }, [sow]);

  const updateSowMutation = useMutation({
    mutationFn: async () => {
      if (!sowId) throw new Error("No SOW ID provided");

      return apiRequest("PATCH", `/api/sows/${sowId}`, {
        sowType: formData.sowType,
        title: formData.title,
        initiative: formData.initiative,
        deliveryPortfolio: formData.deliveryPortfolio || undefined,
        vendorName: formData.vendorName,
        sponsor: formData.sponsor || undefined,
        businessOwner: formData.businessOwner || undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        budget: formData.budget || undefined,
        currency: formData.currency || "USD",
        requirements: formData.requirements || undefined,
        workflowId: formData.workflowId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sows"] });
      toast({
        title: "SOW Updated",
        description: "Your Statement of Work details have been updated successfully.",
      });
      setLocation("/");
    },
  });

  // Allow any authenticated user to edit
  // Show form as soon as SOW loads, user context will load separately
  const hasAccessToEdit = true;
  
  // Check if user can edit this SOW
  const canEdit = sow && user;
  
  // All authenticated users can edit (no readonly mode)
  const isReadonly = false;

  if (sowLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8 space-y-8">
          <div className="flex items-center gap-4">
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          <div className="h-96 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!sow) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">SOW Not Found</h1>
            <p className="text-muted-foreground mt-2">The requested SOW could not be found.</p>
            <Button onClick={() => setLocation("/")} className="mt-4">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation("/")} data-testid="button-back-to-dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
            Edit SOW Details
          </h1>
          <p className="text-muted-foreground">
            Update your Statement of Work project details
          </p>
        </div>

        <Card className="border-card-border">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Update the basic information for this SOW
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sowType">SOW Type *</Label>
                  <Select value={formData.sowType} onValueChange={(value) => setFormData({ ...formData, sowType: value })}>
                    <SelectTrigger data-testid="select-sow-type">
                      <SelectValue placeholder="Select SOW type" />
                    </SelectTrigger>
                    <SelectContent>
                      {sowTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    data-testid="input-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
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
                <Label htmlFor="workflow">Approval Workflow</Label>
                <Select value={formData.workflowId} onValueChange={(value) => setFormData({ ...formData, workflowId: value })}>
                  <SelectTrigger data-testid="select-workflow">
                    <SelectValue placeholder="Select approval workflow (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No workflow</SelectItem>
                    {workflows.map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements</Label>
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
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={() => updateSowMutation.mutate()}
            disabled={updateSowMutation.isPending || !formData.title || !formData.initiative || !formData.vendorName}
            data-testid="button-update-sow"
          >
            {updateSowMutation.isPending ? (
              "Updating..."
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Update SOW
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}