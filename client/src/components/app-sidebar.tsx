import { Home, FileText, FileStack, Workflow, User } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "New SOW Request",
    url: "/createsow",
    icon: FileText,
  },
  {
    title: "Template Manager",
    url: "/templates",
    icon: FileStack,
  },
  {
    title: "Workflow Manager",
    url: "/workflows",
    icon: Workflow,
  },
  {
    title: "Profile Manager",
    url: "/profilemanager",
    icon: User,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b">
        <div className="space-y-1">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent" data-testid="text-app-title">
            SOW Generator
          </h1>
          <p className="text-xs text-muted-foreground" data-testid="text-app-edition">Enterprise Edition</p>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
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
    </Sidebar>
  );
}
