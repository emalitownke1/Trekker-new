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
      {/* Mobile/Collapsed Sidebar Toggle Button - Fixed Position */}
      {isCollapsed && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          className="fixed top-4 left-4 z-50 p-2 bg-card border border-border shadow-lg hover:bg-muted"
          data-testid="sidebar-expand-button"
        >
          <i className="fas fa-bars"></i>
        </Button>
      )}

      <aside 
        ref={sidebarRef}
        className={cn(
          "bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64"
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

        {/* Session ID Tools */}
        {!isAdmin && !isAuthenticated && (
          <>
            <div className="border-t border-border my-4"></div>
            
            {isCollapsed ? (
              /* Collapsed view - icon buttons */
              <div className="space-y-2 px-2">
                <Button 
                  onClick={() => window.open('https://dc693d3f-99a0-4944-94cc-6b839418279c.e1-us-east-azure.choreoapps.dev/', '_blank')}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  title="Generate Session ID"
                  data-testid="button-generate-session"
                >
                  <i className="fas fa-key"></i>
                </Button>
                
                <Button 
                  onClick={() => setShowValidateModal(true)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  title="Validate Session ID"
                  data-testid="button-validate-session"
                >
                  <i className="fas fa-check-circle"></i>
                </Button>
                
                <Button 
                  onClick={() => setShowGuestRegistration(true)}
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  title="Register Bot"
                  data-testid="sidebar-register-bot"
                >
                  <i className="fas fa-plus"></i>
                </Button>
              </div>
            ) : (
              /* Expanded view - full buttons */
              <>
                <Button 
                  onClick={() => window.open('https://dc693d3f-99a0-4944-94cc-6b839418279c.e1-us-east-azure.choreoapps.dev/', '_blank')}
                  variant="outline"
                  className="w-full mx-3 mb-3"
                  data-testid="button-generate-session"
                >
                  <i className="fas fa-key mr-2"></i>
                  Generate Session ID
                </Button>
                
                <Button 
                  onClick={() => setShowValidateModal(true)}
                  variant="outline"
                  className="w-full mx-3 mb-3"
                  data-testid="button-validate-session"
                >
                  <i className="fas fa-check-circle mr-2"></i>
                  Validate Session ID
                </Button>
                
                <Button 
                  onClick={() => setShowGuestRegistration(true)}
                  className="w-full mx-3 bg-green-600 hover:bg-green-700 text-white"
                  data-testid="sidebar-register-bot"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Register Bot
                </Button>
              </>
            )}
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
  );
}
