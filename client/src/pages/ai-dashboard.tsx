import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, Gauge, Timer, Users, TrendingUp, PieChart, BarChart3, Clock, Download, Calendar as CalendarIcon, Sparkles, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";

interface MetricsResponse {
  statusCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  createdSeries: { date: string; count: number }[];
  avgCompleteness: number;
  avgCycleTimeDays: number;
  throughput30: number;
  versions: { version: string; count: number }[];
  reviewers: { reviewerId: string; name: string; count: number; avgHours: number; reviewed: number; pending: number }[];
  topIncomplete: { title: string; count: number }[];
  portfolios: { portfolio: string; count: number; avgCycle: number }[];
  totalSows: number;
}

export default function AIDashboard() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    if (statusFilter) params.append('status', statusFilter);
    if (typeFilter) params.append('type', typeFilter);
    if (departmentFilter) params.append('department', departmentFilter);
    return params.toString();
  }, [startDate, endDate, statusFilter, typeFilter, departmentFilter]);

  const { data, isLoading, error } = useQuery<MetricsResponse>({
    queryKey: ["/api/metrics/sow", queryParams],
    queryFn: async () => {
      const url = `/api/metrics/sow${queryParams ? `?${queryParams}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
  });

  const insightsMutation = useMutation({
    mutationFn: async (metrics: MetricsResponse) => {
      return apiRequest("POST", "/api/metrics/insights", { metrics });
    },
  });

  const handleGetInsights = () => {
    if (data) {
      insightsMutation.mutate(data);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;

    const rows = [
      ['Metric', 'Value'],
      ['Total SOWs', data.totalSows?.toString() || '0'],
      ['Average Cycle Time (days)', data.avgCycleTimeDays?.toFixed(1) || '0'],
      ['Average Completeness (%)', data.avgCompleteness?.toFixed(0) || '0'],
      ['Throughput (last 30 days)', data.throughput30?.toString() || '0'],
      [],
      ['Status', 'Count'],
      ...Object.entries(data.statusCounts || {}).map(([status, count]) => [status, count.toString()]),
      [],
      ['Type', 'Count'],
      ...Object.entries(data.typeCounts || {}).map(([type, count]) => [type, count.toString()]),
      [],
      ['Reviewer', 'Pending', 'Avg Hours'],
      ...(data.reviewers || []).map(r => [r.name, r.pending.toString(), r.avgHours?.toFixed(1) || '0']),
    ];

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sow-metrics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setStatusFilter("");
    setTypeFilter("");
    setDepartmentFilter("");
  };

  const hasFilters = startDate || endDate || statusFilter || typeFilter || departmentFilter;

  if (isLoading) {
    return (
      <div className="flex-1 p-8">Loading AI Dashboard...</div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load metrics.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const COLORS = ["#6366f1", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316"]; 

  const statusData = Object.entries(data?.statusCounts || {}).map(([name, value]) => ({ name, value }));
  const typeData = Object.entries(data?.typeCounts || {}).map(([name, value]) => ({ name, value }));

  return (
    <div 
      className="flex-1 p-8 overflow-y-auto relative"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
  <div className="absolute inset-0 bg-background/95 backdrop-blur-sm" />
  <div className="relative w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">AI Dashboard</h1>
              <p className="text-muted-foreground">Operational analytics and AI insights across all SOWs</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGetInsights} disabled={insightsMutation.isPending || !data}>
              <Sparkles className="w-4 h-4 mr-2" />
              {insightsMutation.isPending ? "Analyzing..." : "Get AI Insights"}
            </Button>
            <Button variant="outline" onClick={handleExportCSV} disabled={!data}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <CardTitle className="text-base">Filters</CardTitle>
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="ready_for_submission">Ready for Submission</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="New Vendor (RFT)">New Vendor (RFT)</SelectItem>
                    <SelectItem value="Existing Vendor Enhancement">Existing Vendor Enhancement</SelectItem>
                    <SelectItem value="Flexi Sourcing - TNM">Flexi Sourcing - TNM</SelectItem>
                    <SelectItem value="Flexi Sourcing - Fixed Scope">Flexi Sourcing - Fixed Scope</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Delivery Portfolio</Label>
                <Select value={departmentFilter || "all"} onValueChange={(v) => setDepartmentFilter(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All portfolios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All portfolios</SelectItem>
                    {data?.portfolios?.map(p => (
                      <SelectItem key={p.portfolio} value={p.portfolio}>{p.portfolio}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        {insightsMutation.data && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI-Generated Insights
              </CardTitle>
              <CardDescription>Actionable recommendations based on current metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: (insightsMutation.data as any).insights || '' }}
                style={{
                  fontSize: '0.95rem',
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average cycle time to final</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Timer className="w-5 h-5 text-primary" /> {data?.avgCycleTimeDays?.toFixed(1)} days
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average section completeness</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Gauge className="w-5 h-5 text-primary" /> {data?.avgCompleteness?.toFixed(0)}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={data?.avgCompleteness || 0} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Finalized in last 30 days</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> {data?.throughput30 || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Status distribution</CardTitle>
              <CardDescription>Current SOWs by status</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ count: { label: "Count", color: "#6366f1" } }}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} angle={-10} height={50} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {statusData.map((_, index) => (
                      <Cell key={`status-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Types distribution</CardTitle>
              <CardDescription>Breakdown by SOW type</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ value: { label: "SOWs" } }}>
                <RePieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" outerRadius={100}>
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                </RePieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>New SOWs (last 30 days)</CardTitle>
              <CardDescription>Daily creations</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ count: { label: "SOWs", color: "#06b6d4" } }}>
                <LineChart data={data?.createdSeries || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent labelKey="date" />} />
                  <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top incomplete sections</CardTitle>
              <CardDescription>Most frequently empty across SOWs</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ count: { label: "Missing", color: "#ef4444" } }}>
                <BarChart data={(data?.topIncomplete || []).map((d) => ({ ...d, label: d.title }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" interval={0} angle={-10} height={60} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {(data?.topIncomplete || []).map((_, index) => (
                      <Cell key={`incomplete-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Versions distribution</CardTitle>
              <CardDescription>How many versions SOWs have</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ count: { label: "SOWs", color: "#8b5cf6" } }}>
                <BarChart data={data?.versions || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="version" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent nameKey="version" />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {(data?.versions || []).map((_, index) => (
                      <Cell key={`version-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reviewer workload & speed</CardTitle>
              <CardDescription>Pending items and average turnaround</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ pending: { label: "Pending", color: "#f59e0b" }, avg: { label: "Avg Hours", color: "#22c55e" } }}>
                <BarChart data={(data?.reviewers || []).map((r) => ({ name: r.name, pending: r.pending, avg: Number(r.avgHours?.toFixed(1)) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} angle={-10} height={60} />
                  <YAxis yAxisId="left" orientation="left" allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar yAxisId="left" dataKey="pending" fill="var(--color-pending)" radius={[6,6,0,0]} />
                  <Bar yAxisId="right" dataKey="avg" fill="var(--color-avg)" radius={[6,6,0,0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Delivery Portfolio breakdown if available */}
        {data?.portfolios && data.portfolios.length > 0 && !departmentFilter && (
          <Card>
            <CardHeader>
              <CardTitle>Delivery Portfolio Breakdown</CardTitle>
              <CardDescription>SOW volume by portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ count: { label: "SOWs", color: "#14b8a6" } }}>
                <BarChart data={data.portfolios}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="portfolio" interval={0} angle={-10} height={60} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent nameKey="portfolio" />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {data.portfolios.map((_, index) => (
                      <Cell key={`portfolio-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
