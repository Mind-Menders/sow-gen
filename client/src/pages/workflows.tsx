import { Workflow, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Workflows() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Workflow Manager</h1>
            <p className="text-muted-foreground">Configure approval workflows and review processes</p>
          </div>
          <Button className="gap-2" data-testid="button-create-workflow">
            <Plus className="w-4 h-4" />
            Create Workflow
          </Button>
        </div>

        <Card className="border-card-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Workflow className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Workflow Manager</h3>
            <p className="text-muted-foreground mb-6">Configure and manage approval workflows for your SOW documents</p>
            <Button data-testid="button-create-first-workflow">
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
