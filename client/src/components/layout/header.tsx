import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Music, Search, ShoppingCart, User, LogOut, Upload, BarChart3, Menu, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/lib/utils';

export function Header() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { cartItemCount } = useCart();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/browse?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2" data-testid="link-logo">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Music className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold gradient-text">
              BeatHub
            </span>
          </Link>
          
          {isAuthenticated && (
            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                href="/browse" 
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  location === "/browse" ? "text-primary" : "text-foreground"
                )}
                data-testid="link-browse"
              >
                Browse
              </Link>
              <Link 
                href="/upload-beat" 
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  location === "/upload-beat" ? "text-primary" : "text-muted-foreground"
                )}
                data-testid="link-upload"
              >
                Upload
              </Link>
              <Link 
                href="/producer-dashboard" 
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  location === "/producer-dashboard" ? "text-primary" : "text-muted-foreground"
                )}
                data-testid="link-dashboard"
              >
                Dashboard
              </Link>
            </nav>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {isAuthenticated && (
            <form onSubmit={handleSearch} className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search beats, producers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 w-80 bg-secondary border-border focus:ring-primary focus:border-primary"
                data-testid="input-search"
              />
            </form>
          )}
          
          {!isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                asChild
                data-testid="button-login"
              >
                <a href="/api/login">Sign In</a>
              </Button>
              <Button 
                asChild
                data-testid="button-signup"
              >
                <a href="/api/login">Get Started</a>
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Button 
                size="sm" 
                variant="ghost" 
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              <Link href="/cart">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="relative"
                  data-testid="button-cart"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {cartItemCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      data-testid="badge-cart-count"
                    >
                      {cartItemCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative" data-testid="button-profile-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl} alt={`${user?.firstName} ${user?.lastName}`} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl} alt={`${user?.firstName} ${user?.lastName}`} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium" data-testid="text-user-name">
                        {user?.firstName && user?.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user?.email?.split('@')[0] || 'User'
                        }
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid="text-user-email">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${user?.id}`} className="cursor-pointer" data-testid="link-profile">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/upload-beat" className="cursor-pointer" data-testid="link-upload-dropdown">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Beats
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/producer-dashboard" className="cursor-pointer" data-testid="link-dashboard">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/wishlist" className="cursor-pointer" data-testid="link-wishlist">
                      <Heart className="mr-2 h-4 w-4" />
                      Wishlist
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/api/logout" className="cursor-pointer text-red-600" data-testid="link-logout">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && isAuthenticated && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search beats, producers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 w-full bg-secondary border-border"
                data-testid="input-search-mobile"
              />
            </form>
            
            <nav className="flex flex-col space-y-2">
              <Link 
                href="/browse" 
                className="text-sm font-medium py-2 px-3 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Browse
              </Link>
              <Link 
                href="/upload-beat" 
                className="text-sm font-medium py-2 px-3 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Upload
              </Link>
              <Link 
                href="/producer-dashboard" 
                className="text-sm font-medium py-2 px-3 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
