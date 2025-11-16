import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, Save, History, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface AccessRule {
  userType: 'creator' | 'current_reviewer' | 'admin' | 'other';
  draft: boolean;
  pending_review: boolean;
  in_review: boolean;
  ready_for_submission: boolean;
}

interface AccessControlConfig {
  _id?: string;
  version: number;
  rules: AccessRule[];
  updatedAt: string;
  updatedBy: string;
}

const USER_TYPE_LABELS = {
  creator: 'Creator',
  current_reviewer: 'Current Reviewer',
  admin: 'Admin',
  other: 'Other Users',
};

const STATUS_LABELS = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  in_review: 'In Review',
  ready_for_submission: 'Ready for Submission',
};

export default function AccessControl() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<AccessRule[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: config, isLoading } = useQuery<AccessControlConfig>({
    queryKey: ["/api/access-control"],
  });

  // Set rules when config loads
  useEffect(() => {
    if (config) {
      setRules(config.rules);
      setHasChanges(false);
    }
  }, [config]);

  const { data: history = [] } = useQuery<AccessControlConfig[]>({
    queryKey: ["/api/access-control/history"],
    enabled: historyOpen,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/access-control", { rules });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/access-control"] });
      queryClient.invalidateQueries({ queryKey: ["/api/access-control/history"] });
      setHasChanges(false);
      toast({
        title: "Access Control Updated",
        description: "The access control configuration has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save access control configuration.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (userType: string, status: string) => {
    const newRules = rules.map(rule => {
      if (rule.userType === userType) {
        return {
          ...rule,
          [status]: !rule[status as keyof Omit<AccessRule, 'userType'>],
        };
      }
      return rule;
    });
    setRules(newRules);
    setHasChanges(true);
  };

  const handleReset = () => {
    if (config) {
      setRules(config.rules);
      setHasChanges(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex-1 p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access this page. Admin access is required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading access control configuration...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              SOW Access Control
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure edit permissions for different user types across SOW statuses
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="w-4 h-4 mr-2" />
              View History
            </Button>
            {hasChanges && (
              <Button variant="outline" onClick={handleReset}>
                Reset Changes
              </Button>
            )}
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </div>

        {config && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Current Version: <strong>v{config.version}</strong> | 
              Last Updated: <strong>{format(new Date(config.updatedAt), "MMM dd, yyyy 'at' HH:mm")}</strong>
            </AlertDescription>
          </Alert>
        )}

        {hasChanges && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              You have unsaved changes. Click "Save Configuration" to apply them.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Access Control Matrix</CardTitle>
            <CardDescription>
              Toggle edit permissions for each user type and SOW status combination. 
              Green indicates edit access is granted.
            </CardDescription>
              {isLoading && (
                <div className="text-sm text-muted-foreground">Loading configuration...</div>
              )}
              {!isLoading && rules.length === 0 && (
                <div className="text-sm text-destructive">No rules loaded. Please refresh the page.</div>
              )}
              {!isLoading && rules.length > 0 && (
                <div className="text-sm text-green-600">✓ {rules.length} user types configured</div>
              )}
          </CardHeader>
          <CardContent>
              {rules.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No access control rules available. The configuration may still be loading.
                </div>
              ) : (
               <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">User Type</th>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <th key={key} className="text-center p-4 font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.userType} className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">
                        <div className="flex items-center gap-2">
                          {USER_TYPE_LABELS[rule.userType]}
                          {rule.userType === 'admin' && (
                            <Badge variant="secondary" className="text-xs">Privileged</Badge>
                          )}
                        </div>
                      </td>
                      {Object.keys(STATUS_LABELS).map((status) => (
                        <td key={status} className="p-4 text-center">
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={rule[status as keyof Omit<AccessRule, 'userType'>]}
                              onCheckedChange={() => handleToggle(rule.userType, status)}
                              disabled={saveMutation.isPending}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
              <h4 className="font-semibold">Legend:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><strong>Creator:</strong> User who created the SOW</li>
                <li><strong>Current Reviewer:</strong> User assigned as the active reviewer for pending approval</li>
                <li><strong>Admin:</strong> Users with administrative privileges</li>
                <li><strong>Other Users:</strong> All other users not in above categories</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                Note: Changes will apply immediately to all SOWs once saved.
              </p>
            </div>
               </>
              )}
          </CardContent>
        </Card>

        {/* History Dialog */}
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Access Control Configuration History</DialogTitle>
              <DialogDescription>
                View all previous versions of the access control configuration
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {history.map((version) => (
                <Card key={version._id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Version {version.version}</CardTitle>
                      <Badge variant={version.version === config?.version ? "default" : "outline"}>
                        {version.version === config?.version ? "Current" : "Historical"}
                      </Badge>
                    </div>
                    <CardDescription>
                      Updated on {format(new Date(version.updatedAt), "MMM dd, yyyy 'at' HH:mm")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-2">
                      {version.rules.map((rule) => (
                        <div key={rule.userType} className="flex items-center gap-2">
                          <span className="font-medium w-40">{USER_TYPE_LABELS[rule.userType]}:</span>
                          <div className="flex gap-2 flex-wrap">
                            {Object.entries(STATUS_LABELS).map(([key, label]) => (
                              rule[key as keyof Omit<AccessRule, 'userType'>] && (
                                <Badge key={key} variant="secondary" className="text-xs">
                                  {label}
                                </Badge>
                              )
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
