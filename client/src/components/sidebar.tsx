import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useState, useRef, useEffect } from "react";
import { LoginModal } from "./login-modal";
import { ValidateCredentialsModal } from "./validate-credentials-modal";
import { Button } from "./ui/button";
import GuestBotRegistration from "./guest-bot-registration";
import GuestBotSearch from "./guest-bot-search";

// Guest mode navigation - only Dashboard
const guestNavigationItems = [
  { href: "/", label: "Dashboard", icon: "fas fa-tachometer-alt" },
  { href: "/guest/verification", label: "Phone Verification", icon: "fas fa-phone" },
  { href: "/guest/bot-management", label: "Bot Management", icon: "fas fa-robot" },
  { href: "/guest/credentials", label: "Credential Manager", icon: "fas fa-key" },
  { href: "/guest/cross-server", label: "Cross-Server Bots", icon: "fas fa-network-wired" },
];

// Admin mode navigation - full access
const adminNavigationItems = [
  { href: "/", label: "Dashboard", icon: "fas fa-tachometer-alt" },
  { href: "/bot-instances", label: "Bot Instances", icon: "fas fa-robot" },
  { href: "/commands", label: "Commands", icon: "fas fa-terminal" },
  { href: "/chatgpt", label: "ChatGPT Integration", icon: "fas fa-brain" },
  { href: "/groups", label: "Group Management", icon: "fas fa-users" },
  { href: "/analytics", label: "Analytics", icon: "fas fa-chart-line" },
  { href: "/settings", label: "Settings", icon: "fas fa-cog" },
];

// Admin console items
const adminConsoleItems = [
  { href: "/admin", label: "Admin Console", icon: "fas fa-shield-alt" },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showGuestRegistration, setShowGuestRegistration] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle click outside to collapse sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && !isCollapsed) {
        setIsCollapsed(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCollapsed]);

  return (
    <>
      {/* Floating expand button - larger size and always visible */}
      <Button
        variant="default"
        size="lg"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="fixed top-6 left-6 z-[9999] p-4 bg-primary text-primary-foreground shadow-2xl hover:bg-primary/90 rounded-full border-2 border-background transition-all duration-300 hover:scale-110 w-14 h-14"
        data-testid="sidebar-expand-button"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <i className={`fas ${isCollapsed ? 'fa-bars' : 'fa-times'} text-lg`}></i>
      </Button>
      
      <aside 
        ref={sidebarRef}
        className={cn(
          "bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out fixed left-0 top-0 h-full z-[9998]",
          isCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-64 opacity-100"
        )} 
        data-testid="sidebar"
      >
        <div className={cn(
          "border-b border-border flex items-center justify-between",
          isCollapsed ? "p-4" : "p-6"
        )}>
          <div className={cn(
            "flex items-center",
            isCollapsed ? "justify-center w-full" : "space-x-3"
          )}>
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <i className="fab fa-whatsapp text-primary-foreground text-xl"></i>
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-lg font-semibold text-foreground">Bot Manager</h1>
                <p className="text-sm text-muted-foreground">WhatsApp Automation</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(true)}
              className="p-2 hover:bg-muted"
              data-testid="sidebar-toggle"
            >
              <i className="fas fa-chevron-left"></i>
            </Button>
          )}
        </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {/* Show different navigation items based on user role */}
        {(isAdmin ? adminNavigationItems : guestNavigationItems).map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              className={cn(
                "flex items-center rounded-md transition-colors cursor-pointer",
                isCollapsed ? "justify-center px-3 py-3" : "space-x-3 px-3 py-2",
                location === item.href
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              title={isCollapsed ? item.label : undefined}
            >
              <i className={`${item.icon} w-5`}></i>
              {!isCollapsed && <span>{item.label}</span>}
            </div>
          </Link>
        ))}
        
        {/* Guest Bot Management */}
        {!isAdmin && !isCollapsed && (
          <>
            <div className="border-t border-border my-4"></div>
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                My Bots
              </h3>
              <GuestBotSearch />
            </div>
          </>
        )}

        
        
        {/* Admin Console navigation */}
        {isAdmin && (
          <>
            <div className="border-t border-border my-4"></div>
            {!isCollapsed && (
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Administration
                </p>
              </div>
            )}
            {adminConsoleItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center rounded-md transition-colors cursor-pointer",
                    isCollapsed ? "justify-center px-3 py-3" : "space-x-3 px-3 py-2",
                    location === item.href
                      ? "bg-red-500/10 text-red-600 border border-red-500/20"
                      : "hover:bg-red-500/5 text-muted-foreground hover:text-red-600"
                  )}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <i className={`${item.icon} w-5`}></i>
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
              </Link>
            ))}
          </>
        )}
      </nav>
      
      <div className="p-4 border-t border-border">
        {isAuthenticated ? (
          <div className={cn(
            "flex items-center px-3 py-2",
            isCollapsed ? "justify-center" : "space-x-3"
          )}>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <i className="fas fa-user text-primary-foreground text-sm"></i>
            </div>
            {!isCollapsed && (
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{user?.username || 'User'}</p>
                <p className="text-xs text-muted-foreground">{isAdmin ? 'Administrator' : 'User'}</p>
              </div>
            )}
            <button 
              onClick={logout}
              className="text-muted-foreground hover:text-foreground" 
              data-testid="button-logout"
              title="Logout"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        ) : (
          <Button 
            onClick={() => setShowLoginModal(true)}
            className="w-full"
            size={isCollapsed ? "sm" : "default"}
          >
            <i className={cn("fas fa-sign-in-alt", !isCollapsed && "mr-2")}></i>
            {!isCollapsed && "Admin Login"}
          </Button>
        )}
      </div>
      
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onLogin={(token, user) => {
          // The login is handled by the useAuth hook
          setShowLoginModal(false);
        }} 
      />
      
      <ValidateCredentialsModal 
        isOpen={showValidateModal} 
        onClose={() => setShowValidateModal(false)}
      />
      
      <GuestBotRegistration 
        open={showGuestRegistration} 
        onClose={() => setShowGuestRegistration(false)} 
      />
    </aside>
    </>
  );
}
