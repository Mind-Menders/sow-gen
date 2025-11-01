import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Sparkles, Send, X, Minimize2, Maximize2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { AIBadge } from "./ai-badge";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatAssistantProps {
  sowId: string;
}

export function AIChatAssistant({ sowId }: AIChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI SOW assistant. I can help you with questions about your Statement of Work, suggest improvements, or explain sections. What would you like to know?"
    }
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Determine AI provider label safely in browser
  const provider = (import.meta as any)?.env?.VITE_AI_PROVIDER || "";
  const providerLabel = (provider || "").toLowerCase() === "olama"
    ? "Ollama"
    : (provider || "").toLowerCase() === "azure"
      ? "Azure OpenAI"
      : "AI";

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest("POST", "/api/ai/chat", {
        sowId,
        message,
        history: messages.slice(-6), // Send last 6 messages for context
      });
    },
    onSuccess: (data: any) => {
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    },
    onError: () => {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I'm sorry, I encountered an error. Please try again." 
      }]);
    },
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    chatMutation.mutate(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 relative group"
        >
          <MessageSquare className="w-6 h-6 text-white" />
          <div className="absolute -top-1 -right-1">
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-20" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed z-50 shadow-2xl rounded-lg bg-white border-2 border-purple-200 flex flex-col transition-all duration-300 ${
      isMinimized 
        ? "bottom-6 right-6 w-80 h-14" 
        : "bottom-6 right-6 w-96 h-[600px]"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-purple-600 to-pink-600 rounded-t-lg">
        <AIBadge tooltip="AI-Powered Chat Assistant" size="sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="font-semibold text-white text-sm">AI Assistant</span>
          </div>
        </AIBadge>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0 text-white hover:bg-white/20"
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-6 w-6 p-0 text-white hover:bg-white/20"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4" ref={scrollRef}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <Sparkles className="w-3 h-3 inline mr-1 text-purple-600" />
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm">
                    <Sparkles className="w-4 h-4 inline text-purple-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your SOW..."
                className="flex-1 text-sm"
                disabled={chatMutation.isPending}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || chatMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 h-10 px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Powered by {providerLabel}</p>
          </div>
        </>
      )}
    </div>
  );
}
