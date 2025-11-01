import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { AIBadge } from "./ai-badge";

interface AIAnalysisPanelProps {
  sowId: string;
  sectionTitle: string;
  sectionContent: string;
}

export function AIAnalysisPanel({ sowId, sectionTitle, sectionContent }: AIAnalysisPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const { data: analysis, isLoading, refetch } = useQuery({
    queryKey: [`/api/ai/analyze-section`, sowId, sectionTitle, sectionContent],
    queryFn: async () => {
      if (!sectionContent || sectionContent.length < 10) {
        return null;
      }
      return apiRequest("POST", "/api/ai/analyze-section", {
        sowId,
        sectionTitle,
        sectionContent,
      });
    },
    enabled: !!sowId && !!sectionTitle && !!sectionContent && sectionContent.length >= 10,
    staleTime: 60000, // Cache for 1 minute
  });

  if (!sectionContent || sectionContent.length < 10) {
    return (
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AIBadge tooltip="AI Content Analysis">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>AI Analysis</span>
            </AIBadge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Add content to see AI analysis and suggestions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <AIBadge tooltip="AI-Powered Quality Analysis">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>AI Content Analysis</span>
            </AIBadge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4">
              <Sparkles className="w-6 h-6 text-purple-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Analyzing content...</p>
            </div>
          ) : analysis ? (
            <>
              {/* Overall Score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Overall Quality</span>
                  <Badge 
                    variant={analysis.score >= 80 ? "default" : analysis.score >= 60 ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {analysis.score}/100
                  </Badge>
                </div>
                <Progress 
                  value={analysis.score} 
                  className="h-2 bg-gray-100"
                  indicatorClassName={
                    analysis.score >= 80 
                      ? "bg-green-600" 
                      : analysis.score >= 60 
                        ? "bg-yellow-500" 
                        : "bg-red-500"
                  }
                />
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-blue-600" />
                    <span className="text-xs text-muted-foreground">Clarity</span>
                  </div>
                  <p className="text-sm font-bold">{analysis.clarity}%</p>
                  <Progress
                    value={analysis.clarity}
                    className="h-1 bg-gray-100"
                    indicatorClassName={
                      analysis.clarity >= 80
                        ? "bg-green-600"
                        : analysis.clarity >= 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-muted-foreground">Complete</span>
                  </div>
                  <p className="text-sm font-bold">{analysis.completeness}%</p>
                  <Progress
                    value={analysis.completeness}
                    className="h-1 bg-gray-100"
                    indicatorClassName={
                      analysis.completeness >= 80
                        ? "bg-green-600"
                        : analysis.completeness >= 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    <span className="text-xs text-muted-foreground">Professional</span>
                  </div>
                  <p className="text-sm font-bold">{analysis.professionalism}%</p>
                  <Progress
                    value={analysis.professionalism}
                    className="h-1 bg-gray-100"
                    indicatorClassName={
                      analysis.professionalism >= 80
                        ? "bg-green-600"
                        : analysis.professionalism >= 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }
                  />
                </div>
              </div>

              {/* Issues */}
              {analysis.issues && analysis.issues.length > 0 && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <p className="text-xs font-medium mb-1">Issues Found:</p>
                    <ul className="text-xs space-y-0.5 list-disc list-inside">
                      {analysis.issues.slice(0, 3).map((issue: string, idx: number) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Missing Information */}
              {analysis.missingInfo && analysis.missingInfo.length > 0 && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <XCircle className="w-4 h-4 text-yellow-600" />
                  <AlertDescription>
                    <p className="text-xs font-medium mb-1">Missing Information:</p>
                    <ul className="text-xs space-y-0.5 list-disc list-inside">
                      {analysis.missingInfo.slice(0, 3).map((info: string, idx: number) => (
                        <li key={idx}>{info}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Suggestions */}
              {analysis.suggestions && analysis.suggestions.length > 0 && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                  <AlertDescription>
                    <p className="text-xs font-medium mb-1">AI Suggestions:</p>
                    <ul className="text-xs space-y-0.5 list-disc list-inside">
                      {analysis.suggestions.slice(0, 3).map((suggestion: string, idx: number) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="w-full h-8 text-xs gap-1.5"
              >
                <Sparkles className="w-3 h-3" />
                Refresh Analysis
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              Unable to analyze content
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
