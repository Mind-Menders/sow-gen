import { useState } from "react";
import { Workflow, Plus, Edit, Trash2, CheckCircle, XCircle, Users, Save, X } from "lucide-react";
import bgImage from "@assets/stock_images/corporate_workflow_p_bb66a5c7.jpg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Workflow as WorkflowType, User, WorkflowStage } from "@shared/schema";

export default function Workflows() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sowTypes: [] as string[],
    stages: [] as WorkflowStage[],
  });

  const { data: workflows = [], error: workflowsError, isLoading: isWorkflowsLoading } = useQuery<WorkflowType[]>({
    queryKey: ["/api/workflows"],
  });

  if (workflowsError) {
    console.error('Workflows error:', workflowsError);
  }

  const { data: users = [], error: usersError } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  if (usersError) {
    console.error('Users error:', usersError);
  }

  const createWorkflowMutation = useMutation({
    mutationFn: async () => {
      try {
        return await apiRequest("POST", "/api/workflows", {
          name: formData.name,
          description: formData.description,
          sowTypes: JSON.stringify(formData.sowTypes),
          stages: JSON.stringify(formData.stages),
          isActive: true,
        });
      } catch (error) {
        console.error('Error creating workflow:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Workflow Created",
        description: "The workflow has been created successfully.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to create workflow";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: async () => {
      if (!editingWorkflow) return;
      try {
        return await apiRequest("PATCH", `/api/workflows/${editingWorkflow.id}`, {
          name: formData.name,
          description: formData.description,
          sowTypes: JSON.stringify(formData.sowTypes),
          stages: JSON.stringify(formData.stages),
        });
      } catch (error) {
        console.error('Error updating workflow:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      setEditingWorkflow(null);
      resetForm();
      toast({
        title: "Workflow Updated",
        description: "The workflow has been updated successfully.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to update workflow";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/workflows/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      toast({
        title: "Workflow Deleted",
        description: "The workflow has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to delete workflow";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      sowTypes: [],
      stages: [],
    });
  };

  const handleOpenCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleOpenEditDialog = (workflow: WorkflowType) => {
    // Be defensive: workflow.sowTypes and workflow.stages may already be parsed arrays
    setEditingWorkflow(workflow);
    let parsedSowTypes: string[] = [];
    let parsedStages: WorkflowStage[] = [];
    try {
      if (typeof workflow.sowTypes === "string") {
        parsedSowTypes = JSON.parse(workflow.sowTypes || "[]");
      } else if (Array.isArray(workflow.sowTypes)) {
        parsedSowTypes = workflow.sowTypes as unknown as string[];
      }
    } catch (err) {
      console.error("Failed to parse sowTypes for edit:", err);
      parsedSowTypes = [];
    }

    try {
      if (typeof workflow.stages === "string") {
        parsedStages = JSON.parse(workflow.stages || "[]");
      } else if (Array.isArray(workflow.stages)) {
        parsedStages = workflow.stages as unknown as WorkflowStage[];
      }
    } catch (err) {
      console.error("Failed to parse stages for edit:", err);
      parsedStages = [];
    }

    setFormData({
      name: workflow.name,
      description: workflow.description,
      sowTypes: parsedSowTypes,
      stages: parsedStages,
    });
  };

  const handleAddStage = () => {
    setFormData({
      ...formData,
      stages: [
        ...formData.stages,
        {
          id: `stage-${Date.now()}`,
          name: "",
          reviewerIds: [],
          requireAll: false,
        },
      ],
    });
  };

  const handleUpdateStage = (index: number, field: keyof WorkflowStage, value: any) => {
    const updatedStages = [...formData.stages];
    updatedStages[index] = { ...updatedStages[index], [field]: value };
    setFormData({ ...formData, stages: updatedStages });
  };

  const handleRemoveStage = (index: number) => {
    setFormData({
      ...formData,
      stages: formData.stages.filter((_, i) => i !== index),
    });
  };

  const sowTypeOptions = [
    "New Vendor (RFT)",
    "Existing Vendor Enhancement",
    "Flexi Sourcing - TNM",
    "Flexi Sourcing - Fixed Scope",
  ];

  return (
    <div className="flex-1 overflow-y-auto relative">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-5"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      
      <div className="relative w-full mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
              Workflow Manager
            </h1>
            <p className="text-muted-foreground">Configure approval workflows and review processes</p>
          </div>
          <Button className="gap-2" onClick={handleOpenCreateDialog} data-testid="button-create-workflow">
            <Plus className="w-4 h-4" />
            Create Workflow
          </Button>
        </div>

        {isWorkflowsLoading ? (
          <Card className="border-card-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Workflow className="w-16 h-16 text-muted-foreground mb-4 animate-spin" />
              <h3 className="text-lg font-semibold mb-2">Loading workflows...</h3>
            </CardContent>
          </Card>
        ) : workflowsError ? (
          <Card className="border-card-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center text-destructive">
              <XCircle className="w-16 h-16 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error loading workflows</h3>
              <p className="text-sm">{workflowsError instanceof Error ? workflowsError.message : 'An error occurred'}</p>
            </CardContent>
          </Card>
        ) : workflows.length === 0 ? (
          <Card className="border-card-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Workflow className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Workflows Yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first workflow to manage SOW approvals
              </p>
              <Button onClick={handleOpenCreateDialog} data-testid="button-create-first-workflow">
                <Plus className="w-4 h-4 mr-2" />
                Create Workflow
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workflows.map((workflow) => {
              let stages: WorkflowStage[] = [];
              let types: string[] = [];
              try {
                stages = JSON.parse(workflow.stages || '[]') as WorkflowStage[];
                types = JSON.parse(workflow.sowTypes || '[]') as string[];
              } catch (error) {
                console.error('Error parsing workflow data:', error);
                // Provide default values if parsing fails
                stages = [];
                types = [];
              }

              return (
                <Card key={workflow.id} className="border-card-border" data-testid={`card-workflow-${workflow.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{workflow.name}</CardTitle>
                          <Badge variant={workflow.isActive ? "default" : "secondary"} className="text-xs">
                            {workflow.isActive ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </Badge>
                        </div>
                        <CardDescription>{workflow.description}</CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditDialog(workflow)}
                          data-testid={`button-edit-workflow-${workflow.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteWorkflowMutation.mutate(workflow.id)}
                          data-testid={`button-delete-workflow-${workflow.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Applicable SOW Types:</p>
                      <div className="flex flex-wrap gap-2">
                        {types.map((type, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Approval Stages ({stages.length}):</p>
                      <div className="space-y-2">
                        {stages.map((stage, index) => (
                          <div key={stage.id} className="flex items-center gap-2 text-sm">
                            <span className="font-mono text-muted-foreground">{index + 1}.</span>
                            <span className="flex-1">{stage.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {stage.reviewerIds.length} reviewers
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={isCreateDialogOpen || !!editingWorkflow} onOpenChange={() => {
          setIsCreateDialogOpen(false);
          setEditingWorkflow(null);
          resetForm();
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingWorkflow ? "Edit Workflow" : "Create New Workflow"}</DialogTitle>
              <DialogDescription>
                Configure the approval workflow stages and assign reviewers
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workflow Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard Approval"
                  data-testid="input-workflow-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the purpose of this workflow"
                  data-testid="textarea-workflow-description"
                />
              </div>

              <div className="space-y-2">
                <Label>Applicable SOW Types</Label>
                <div className="grid grid-cols-2 gap-2">
                  {sowTypeOptions.map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sowTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, sowTypes: [...formData.sowTypes, type] });
                          } else {
                            setFormData({
                              ...formData,
                              sowTypes: formData.sowTypes.filter((t) => t !== type),
                            });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Approval Stages</Label>
                  <Button variant="outline" size="sm" onClick={handleAddStage} data-testid="button-add-stage">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Stage
                  </Button>
                </div>

                {formData.stages.map((stage, index) => (
                  <Card key={stage.id} className="border-card-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Stage {index + 1}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStage(index)}
                          data-testid={`button-remove-stage-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs">Stage Name</Label>
                        <Input
                          value={stage.name}
                          onChange={(e) => handleUpdateStage(index, "name", e.target.value)}
                          placeholder="e.g., Legal Review"
                          className="mt-1"
                          data-testid={`input-stage-name-${index}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Assigned Reviewers</Label>
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (!stage.reviewerIds.includes(value)) {
                              handleUpdateStage(index, "reviewerIds", [...stage.reviewerIds, value]);
                            }
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Add reviewer" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name} ({user.department})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {stage.reviewerIds.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {stage.reviewerIds.map((reviewerId) => {
                              const user = users.find((u) => u.id === reviewerId);
                              return user ? (
                                <Badge key={reviewerId} variant="secondary" className="text-xs">
                                  {user.name}
                                  <button
                                    onClick={() =>
                                      handleUpdateStage(
                                        index,
                                        "reviewerIds",
                                        stage.reviewerIds.filter((id) => id !== reviewerId)
                                      )
                                    }
                                    className="ml-1 hover:text-destructive"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stage.requireAll}
                          onChange={(e) => handleUpdateStage(index, "requireAll", e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Require all reviewers to approve</span>
                      </label>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingWorkflow(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editingWorkflow) {
                    updateWorkflowMutation.mutate();
                  } else {
                    createWorkflowMutation.mutate();
                  }
                }}
                disabled={
                  !formData.name ||
                  !formData.description ||
                  formData.sowTypes.length === 0 ||
                  formData.stages.length === 0
                }
                data-testid="button-save-workflow"
              >
                {editingWorkflow ? "Update" : "Create"} Workflow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
