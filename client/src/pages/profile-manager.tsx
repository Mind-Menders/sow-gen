import { User, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ProfileManager() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Profile Manager</h1>
            <p className="text-muted-foreground">Manage user profiles and permissions</p>
          </div>
          <Button className="gap-2" data-testid="button-add-user">
            <Plus className="w-4 h-4" />
            Add User
          </Button>
        </div>

        <Card className="border-card-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <User className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Profile Manager</h3>
            <p className="text-muted-foreground mb-6">Manage team members, roles, and permissions</p>
            <Button data-testid="button-add-first-user">
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
