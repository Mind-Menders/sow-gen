import { Home, FileText, FileStack, Workflow, User, FileSignature } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    color: "text-blue-500",
  },
  {
    title: "New SOW Request",
    url: "/createsow",
    icon: FileText,
    color: "text-green-500",
  },
  {
    title: "Template Manager",
    url: "/templates",
    icon: FileStack,
    color: "text-purple-500",
  },
  {
    title: "Workflow Manager",
    url: "/workflows",
    icon: Workflow,
    color: "text-orange-500",
  },
  {
    title: "Profile Manager",
    url: "/profilemanager",
    icon: User,
    color: "text-pink-500",
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <FileSignature className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-foreground" data-testid="text-app-title">
              SOW Generator
            </h1>
            <p className="text-xs text-muted-foreground" data-testid="text-app-edition">Enterprise Edition</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-6">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive} 
                      className={`h-12 text-base ${isActive ? 'bg-primary/10 border-l-4 border-l-primary text-primary font-semibold' : ''}`}
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url} className="flex items-center gap-3 px-3">
                        <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : item.color}`} />
                        <span className={isActive ? 'text-primary' : ''}>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3" data-testid="user-profile">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">U</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate" data-testid="text-username">User</p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-user-role">Administrator</p>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
