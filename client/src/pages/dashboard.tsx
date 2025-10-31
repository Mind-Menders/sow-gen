import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, FileCheck, Clock, CheckCircle2, Plus, Filter, Search, User, Edit, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Sow, User as UserType } from "@shared/schema";
import { format } from "date-fns";
import bgImage from "@assets/stock_images/abstract_blue_purple_8c94cc67.jpg";
import { useAuth } from "@/hooks/useAuth";

const statusConfig = {
  draft: {
    label: "Initiated",
    variant: "secondary" as const,
  },
  in_review: {
    label: "In Review",
    variant: "default" as const,
  },
  ready_for_submission: {
    label: "Ready for Submission",
    variant: "default" as const,
  },
  rejected: {
    label: "Rejected",
    variant: "destructive" as const,
  },
};

export default function Dashboard() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { user } = useAuth();

  const { data: sows = [], isLoading } = useQuery<Sow[]>({
    queryKey: ["/api/sows"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const filteredSows = sows.filter((sow) => {
    if (statusFilter !== "all" && sow.status !== statusFilter) return false;
    if (typeFilter !== "all" && sow.sowType !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        sow.title.toLowerCase().includes(query) ||
        sow.sowNumber.toLowerCase().includes(query) ||
        sow.vendorName.toLowerCase().includes(query) ||
        sow.sponsor.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const stats = {
    total: sows.length,
    draft: sows.filter((s) => s.status === "draft").length,
    in_review: sows.filter((s) => s.status === "in_review").length,
    ready_for_submission: sows.filter((s) => s.status === "ready_for_submission").length,
  };

  const canEditSow = (sow: Sow) => {
    if (!user) return false;
    // Admin can edit any SOW
    if (user.role === "admin") return true;
    // Initiator can edit their own SOWs
    return sow.createdBy === user.id;
  };

  return (
    <div className="flex-1 overflow-y-auto relative">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-5"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      
      <div className="relative max-w-7xl mx-auto p-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">SOW Dashboard</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">Manage and track all your Statement of Work documents</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-card-border hover-elevate">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Total SOWs</p>
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground" data-testid="stat-total">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="border-card-border hover-elevate">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Draft</p>
                <FileCheck className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground" data-testid="stat-draft">{stats.draft}</p>
            </CardContent>
          </Card>

          <Card className="border-card-border hover-elevate">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">In Review</p>
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground" data-testid="stat-pending">{stats.in_review}</p>
            </CardContent>
          </Card>

          <Card className="border-card-border hover-elevate">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Reviewed</p>
                <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground" data-testid="stat-approved">{stats.ready_for_submission}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[300px] flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by title, number, vendor, or sponsor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusConfig).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[220px]" data-testid="select-type-filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="New Vendor (RFT)">New Vendor (RFT)</SelectItem>
                <SelectItem value="Existing Vendor Enhancement">Existing Vendor Enhancement</SelectItem>
                <SelectItem value="Flexi Sourcing - TNM">Flexi Sourcing - TNM</SelectItem>
                <SelectItem value="Flexi Sourcing - Fixed Scope">Flexi Sourcing - Fixed Scope</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Link href="/createsow">
            <Button className="gap-2" data-testid="button-new-sow">
              <Plus className="w-4 h-4" />
              New SOW
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-card-border">
                <CardHeader className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse w-20" />
                  <div className="h-6 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-muted rounded animate-pulse w-24" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredSows.length === 0 ? (
          <Card className="border-card-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No SOWs found</h3>
              <p className="text-muted-foreground mb-6">Get started by creating your first Statement of Work</p>
              <Link href="/createsow">
                <Button data-testid="button-create-first-sow">
                  <Plus className="w-4 h-4 mr-2" />
                  Create SOW
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSows.map((sow) => {
              const initiator = users.find((u) => u.id === sow.createdBy);
              return (
              <Link key={sow.id} href={`/editor?id=${sow.id}`}>
                <Card 
                  className="border-card-border hover-elevate group cursor-pointer transition-all duration-300 relative overflow-hidden" 
                  data-testid={`card-sow-${sow.id}`}
                >
                  <CardHeader className="space-y-3 pr-16">
                    {statusConfig[sow.status as keyof typeof statusConfig] ? (
                      <Badge
                        variant={statusConfig[sow.status as keyof typeof statusConfig].variant}
                        className={
                          `w-fit uppercase text-xs font-semibold` +
                          (sow.status === "ready_for_submission" ? " bg-green-600 text-white" : "")
                        }
                      >
                        {statusConfig[sow.status as keyof typeof statusConfig].label}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="w-fit uppercase text-xs font-semibold">
                        Unknown Status
                      </Badge>
                    )}
                    <h3 className="text-lg font-semibold text-foreground line-clamp-2" data-testid={`text-sow-title-${sow.id}`}>
                      {sow.title}
                    </h3>
                    <p className="text-sm font-mono text-muted-foreground" data-testid={`text-sow-number-${sow.id}`}>
                      #{sow.sowNumber}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4 pr-16">
                    <div className="space-y-2 text-sm">
                      <p className="text-foreground" data-testid={`text-vendor-${sow.id}`}>{sow.vendorName}</p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">Sponsor:</span> {sow.sponsor}
                      </p>
                      {initiator && (
                        <p className="text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span className="font-medium">Initiated by:</span> {initiator.firstName} {initiator.lastName}
                        </p>
                      )}
                      <p className="text-muted-foreground">{format(new Date(sow.createdAt), "MMM dd, yyyy")}</p>
                      <Badge variant="outline" className="text-xs">{sow.sowType}</Badge>
                    </div>
                  </CardContent>
                  
                  {/* Arrow Button on Right */}
                  <div 
                    className="absolute right-0 top-0 bottom-0 w-16 bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:w-20 group-hover:bg-destructive border-l border-white/30"
                    data-testid={`button-open-${sow.id}`}
                  >
                    <ArrowRight className="w-6 h-6 text-white transition-all duration-300 group-hover:translate-x-1" />
                  </div>
                </Card>
              </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
