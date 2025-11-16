import { Home, FileText, FileStack, Workflow, User, FileSignature, LogOut, ChevronUp, KeyRound, Shield, BarChart3 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    color: "text-blue-500",
  },
  {
    title: "AI Dashboard",
    url: "/ai-dashboard",
    icon: BarChart3,
    color: "text-cyan-600",
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
  {
    title: "SOW Access Control",
    url: "/access-control",
    icon: Shield,
    color: "text-red-500",
    adminOnly: true,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isMobile, setOpen } = useSidebar();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Automatically open change password dialog if user must change password
  useEffect(() => {
    if ((user as any)?.mustChangePassword) {
      setChangePasswordOpen(true);
    }
  }, [user]);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }
    try {
      const skipCurrent = !!(user as any)?.mustChangePassword || !!(user as any)?.forcePasswordChange;
      const payload: any = { newPassword: passwordData.newPassword };
      if (!skipCurrent) payload.currentPassword = passwordData.currentPassword;

      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setChangePasswordOpen(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    }
  };

  // Prefer full name if available, then fallback to name, then email local part
  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.name && user.name.length > 0
      ? user.name
      : user?.firstName
        ? user.firstName
        : user?.lastName
          ? user.lastName
          : user?.email?.split('@')[0] || "User";

  const userRole = user?.role || "User";

  // Compute initials from name if present, otherwise fall back to firstName/lastName or email
  let initials = "U";
  if (user?.name && user.name.trim().length > 0) {
    const parts = user.name.trim().split(/\s+/);
    initials = (parts[0][0] || "").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
    initials = initials || "U";
  } else if (user?.firstName || user?.lastName) {
    const f = user?.firstName?.[0] || "";
    const l = user?.lastName?.[0] || "";
    initials = (f + l).toUpperCase() || "U";
  } else if (user?.email) {
    initials = (user.email[0] || "U").toUpperCase();
  }

  return (
    <Sidebar
      collapsible="icon"
      className="transition-all duration-300 ease-in-out"
    >
      {/* Hover zone extender - invisible area that triggers expansion */}
      <div 
        className="fixed left-0 top-0 bottom-0 w-2 z-40 group-data-[state=collapsed]:block hidden hover:bg-primary/10 transition-colors"
        onMouseEnter={() => {
          if (!isMobile) setOpen(true);
        }}
        title="Hover to expand menu"
      />
      
      {/* Visual edge indicator when collapsed */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 w-1 h-32 bg-gradient-to-b from-transparent via-primary/30 to-transparent rounded-r-full group-data-[state=expanded]:hidden pointer-events-none transition-opacity duration-300" />
      
      <div className="h-full">
      <SidebarHeader className="p-6 border-b overflow-hidden group-data-[collapsible=icon]:p-3 transition-all duration-300">
        {/* Emirates Logo - Full Width */}
        <div className="mb-4 group-data-[collapsible=icon]:hidden transition-opacity duration-300">
          <div className="bg-[#D71921] px-6 py-8 rounded-lg shadow-lg transform transition-transform duration-300 hover:scale-105">
            <img 
              src="https://c.ekstatic.net/ecl/logos/emirates/emirates-logo-badge.svg?h=d-52wmsnqryhi7L83BAKpg" 
              alt="Emirates Logo" 
              className="h-24 w-full object-contain"
            />
          </div>
        </div>
        {/* Compact logo for collapsed state */}
        <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center mb-2 transition-opacity duration-300">
          <div className="bg-[#D71921] rounded-md w-12 h-12 flex items-center justify-center transform transition-transform duration-300 hover:scale-110 shadow-md">
            <img 
              src="https://c.ekstatic.net/ecl/logos/emirates/emirates-logo-badge.svg?h=d-52wmsnqryhi7L83BAKpg" 
              alt="Emirates" 
              className="w-10 h-10 object-contain"
            />
          </div>
        </div>
        
        <div className="space-y-1 group-data-[collapsible=icon]:hidden transition-opacity duration-300"><center>
          <h1 className="text-xl font-bold text-foreground" data-testid="text-app-title">
            SOW Gen.ai
          </h1>
          <p className="text-xs text-muted-foreground" data-testid="text-app-edition">Enterprise Edition</p>
          </center>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-6 group-data-[collapsible=icon]:px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => {
                // Hide admin-only items from non-admin users
                if (item.adminOnly && user?.role !== 'admin') {
                  return null;
                }
                
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive} 
                      tooltip={item.title}
                      className={`h-12 text-base transition-all duration-200 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center ${isActive ? 'bg-primary/10 border-l-4 border-l-primary text-primary font-semibold group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:bg-primary/20' : 'hover:bg-muted'}`}
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url} className="flex items-center gap-3 px-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center transition-all duration-200">
                        <item.icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-primary' : item.color}`} />
                        <span className={`truncate transition-opacity duration-200 ${isActive ? 'text-primary' : ''}`}>{item.title}</span>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="flex items-center gap-3 w-full hover-elevate rounded-lg px-2 py-2 transition-colors"
              data-testid="button-user-menu"
            >
              <Avatar className="w-9 h-9">
                {user?.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={displayName} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground truncate" data-testid="text-username">
                  {displayName}
                </p>
                <p className="text-xs text-muted-foreground truncate" data-testid="text-user-role">
                  {userRole}
                </p>
              </div>
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-56">
            <DropdownMenuItem onClick={() => setChangePasswordOpen(true)} data-testid="button-change-password">
              <KeyRound className="w-4 h-4 mr-2" />
              <span>Change Password</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={changePasswordOpen} onOpenChange={(open) => {
          // Prevent closing if user must change password
          if (!(user as any)?.mustChangePassword) {
            setChangePasswordOpen(open);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                {(user as any)?.mustChangePassword 
                  ? "You must change your password to continue. Use 'admin' as your current password if this is your first login."
                  : "Update your account password. Enter your current password and choose a new one."
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                {/* Show current password only if user is not forced to change */}
                {!( (user as any)?.mustChangePassword || (user as any)?.forcePasswordChange ) && (
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                    />
                  </div>
                )}
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleChangePassword}
                disabled={(!( (user as any)?.mustChangePassword || (user as any)?.forcePasswordChange ) && !passwordData.currentPassword) || !passwordData.newPassword || !passwordData.confirmPassword}
              >
                Change Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarFooter>
      <SidebarRail />
      </div>
    </Sidebar>
  );
}
