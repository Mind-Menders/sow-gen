import { FileText, Workflow, Users, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import bgImage from "@assets/stock_images/abstract_blue_purple_8c94cc67.jpg";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/20" />
      
      <div className="relative min-h-screen flex flex-col">
        <header className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">SOWify</h1>
          </div>
          <Button onClick={handleLogin} data-testid="button-login" className="gap-2">
            Log In
            <ArrowRight className="w-4 h-4" />
          </Button>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-6xl w-full space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-bold text-foreground">
                Enterprise SOW Generator
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Streamline your Statement of Work creation process with powerful templates,
                AI-assisted content generation, and multi-stage approval workflows.
              </p>
              <div className="pt-4">
                <Button onClick={handleLogin} size="lg" className="gap-2" data-testid="button-get-started">
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
              <Card className="border-card-border">
                <CardHeader>
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Smart Templates</CardTitle>
                  <CardDescription>
                    Pre-built templates for RFT, enhancements, and flexi sourcing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span>9 standard sections</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span>Official templates</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span>Customizable content</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-card-border">
                <CardHeader>
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                    <Workflow className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Approval Workflows</CardTitle>
                  <CardDescription>
                    Multi-stage review process with configurable reviewers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span>Multi-stage approvals</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span>Role-based access</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span>Status tracking</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-card-border">
                <CardHeader>
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Team Collaboration</CardTitle>
                  <CardDescription>
                    Manage users, roles, and departments across your organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span>User management</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span>Department assignment</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span>Activity tracking</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        <footer className="p-6 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 SOWify. Enterprise Edition.</p>
        </footer>
      </div>
    </div>
  );
}
