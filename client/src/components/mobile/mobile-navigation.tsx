import { useState, useEffect } from "react";
import { Home, Search, Music, User, Menu, X, Heart, Download, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

interface MobileNavigationProps {
  showBottomNav?: boolean;
}

export function MobileNavigation({ showBottomNav = true }: MobileNavigationProps) {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Get cart count for badge
  const { data: cartItems } = useQuery({
    queryKey: ['/api/cart'],
    enabled: isAuthenticated
  });

  const cartCount = cartItems?.length || 0;

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const navItems = [
    { href: "/", icon: Home, label: "Home", active: location === "/" },
    { href: "/search", icon: Search, label: "Search", active: location.startsWith("/search") },
    { href: "/beats", icon: Music, label: "Beats", active: location.startsWith("/beats") },
    { href: "/profile", icon: User, label: "Profile", active: location.startsWith("/profile"), requireAuth: true }
  ];

  const menuItems = [
    { href: "/liked", icon: Heart, label: "Liked Beats", requireAuth: true },
    { href: "/downloads", icon: Download, label: "Downloads", requireAuth: true },
    { href: "/challenges", icon: Music, label: "Challenges" },
    { href: "/opportunities", icon: User, label: "Opportunities" },
    { href: "/settings", icon: Settings, label: "Settings", requireAuth: true }
  ];

  if (!showBottomNav) return null;

  return (
    <>
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-gray-800 px-4 py-2 z-40 md:hidden">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            if (item.requireAuth && !isAuthenticated) return null;
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`
                    flex flex-col items-center gap-1 h-auto py-2 px-3
                    ${item.active ? 'text-blue-400' : 'text-gray-400 hover:text-white'}
                  `}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <div className="relative">
                    <item.icon className="h-5 w-5" />
                    {item.label === "Profile" && cartCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
                      >
                        {cartCount > 9 ? '9+' : cartCount}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs">{item.label}</span>
                </Button>
              </Link>
            );
          })}
          
          {/* Menu button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center gap-1 h-auto py-2 px-3 text-gray-400 hover:text-white"
            data-testid="nav-menu"
          >
            <Menu className="h-5 w-5" />
            <span className="text-xs">More</span>
          </Button>
        </div>
      </nav>

      {/* Side Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-gray-900 border-l border-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div>
                <h2 className="text-white font-semibold">Menu</h2>
                {isAuthenticated && user && (
                  <p className="text-gray-400 text-sm">{user.email}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(false)}
                className="p-2 text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Menu Items */}
            <div className="p-4 space-y-2">
              {menuItems.map((item) => {
                if (item.requireAuth && !isAuthenticated) return null;
                
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-3 text-gray-300 hover:text-white hover:bg-gray-800"
                      data-testid={`menu-${item.label.toLowerCase().replace(' ', '-')}`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}

              {/* Auth buttons */}
              <div className="pt-4 border-t border-gray-800">
                {isAuthenticated ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = '/api/logout'}
                    className="w-full"
                    data-testid="button-logout"
                  >
                    Sign Out
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => window.location.href = '/api/login'}
                    className="w-full"
                    data-testid="button-login"
                  >
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}