import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/lib/auth";
import { ShoppingCart, User as UserIcon, Sprout, LogOut, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  // Fetch cart count for buyers
  const { data: cartItems } = useQuery<any[]>({
    queryKey: ["/api/cart", user?.id],
    enabled: user?.role === "buyer",
  });

  // Fetch unread message count
  const { data: messageData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread/count", user?.id],
    enabled: !!user,
  });

  const cartCount = cartItems?.length || 0;
  const messageCount = messageData?.count || 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 backdrop-blur-md bg-gradient-to-b from-background/80 to-background/60 supports-[backdrop-filter]:bg-background/40 print:hidden">
      <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4">
        <Link href="/">
          <div className="flex items-center gap-2 hover-elevate rounded-md px-3 py-2 cursor-pointer" data-testid="link-home">
            <Sprout className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            <span className="text-xl md:text-2xl font-bold text-foreground">Agricompass</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/marketplace">
            <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-marketplace">
              Marketplace
            </span>
          </Link>
          {user?.role === "farmer" && (
            <>
              <Link href="/farmer/dashboard">
                <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-farmer-dashboard">
                  My Dashboard
                </span>
              </Link>
              <Link href="/farmer/wallet">
                <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-farmer-wallet">
                  Wallet
                </span>
              </Link>
            </>
          )}
          {user?.role === "buyer" && (
            <Link href="/buyer/dashboard">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-buyer-dashboard">
                My Dashboard
              </span>
            </Link>
          )}
          {user?.role === "field_officer" && (
            <Link href="/officer/dashboard">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-officer-dashboard">
                Verifications
              </span>
            </Link>
          )}
          {user?.role === "admin" && (
            <Link href="/admin/dashboard">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-admin-dashboard">
                Admin Dashboard
              </span>
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          {user ? (
            <>
              {user.role === "buyer" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLocation("/buyer/cart")}
                  className="relative"
                  data-testid="button-cart"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-lg ring-2 ring-background">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/messages")}
                className="relative"
                data-testid="button-messages"
              >
                <MessageSquare className="h-5 w-5" />
                {messageCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-lg ring-2 ring-background animate-pulse">
                    {messageCount > 9 ? '9+' : messageCount}
                  </span>
                )}
              </Button>

              <NotificationBell />

              <ThemeToggle />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="button-user-menu">
                    <UserIcon className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-2">
                    <p className="text-sm font-medium">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {user.role.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/profile")} data-testid="menu-profile">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <ThemeToggle />
              <Button variant="ghost" onClick={() => setLocation("/login")} data-testid="button-login">
                Login
              </Button>
              <Button onClick={() => setLocation("/register")} data-testid="button-register">
                Sign Up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
