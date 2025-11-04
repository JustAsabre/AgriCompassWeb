import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { ShoppingCart, User as UserIcon, Sprout, LogOut } from "lucide-react";
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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
            <Link href="/farmer/dashboard">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-farmer-dashboard">
                My Dashboard
              </span>
            </Link>
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
                </Button>
              )}

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
