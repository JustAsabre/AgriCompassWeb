import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  MapPin, 
  CheckCircle,
  Sprout,
  ShoppingBag,
  FileCheck
} from "lucide-react";
import { formatCurrency } from '@/lib/currency';

export default function Landing() {
  const features = [
    {
      icon: ShieldCheck,
      title: "Verified Farmers",
      description: "All farmers are verified by field officers to ensure quality and authenticity"
    },
    {
      icon: TrendingUp,
      title: "Direct Pricing",
      description: "Connect directly with farmers for fair, transparent pricing with bulk discounts"
    },
    {
      icon: Users,
      title: "Trusted Community",
      description: "Join thousands of farmers and buyers building lasting partnerships"
    },
    {
      icon: MapPin,
      title: "Local Sourcing",
      description: "Find products from farmers in your region for fresher produce and lower costs"
    },
    {
      icon: CheckCircle,
      title: "Quality Assurance",
      description: "Field-verified products with detailed information and farmer profiles"
    },
    {
      icon: ShoppingBag,
      title: "Easy Ordering",
      description: "Browse, compare, and order agricultural products with just a few clicks"
    }
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Sign Up",
      description: "Register as a Farmer to list products or as a Buyer to source quality produce",
      icon: Users
    },
    {
      step: "2",
      title: "Browse & Connect",
      description: "Farmers list products, Buyers browse verified listings with detailed information",
      icon: Sprout
    },
    {
      step: "3",
      title: "Order & Fulfill",
      description: "Place orders directly, farmers accept and fulfill, building trusted relationships",
      icon: ShoppingBag
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                  Connecting Farmers Directly to Markets
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
                  Agricompass brings farmers and buyers together on a verified platform. 
                  Discover quality agricultural products, fair pricing, and build lasting partnerships.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register?role=farmer">
                  <Button size="lg" className="w-full sm:w-auto px-8 py-6 text-base" data-testid="button-register-farmer">
                    Register as Farmer
                  </Button>
                </Link>
                <Link href="/marketplace">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-6 text-base" data-testid="button-browse-marketplace">
                    Browse Marketplace
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8 border-t">
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-primary">500+</div>
                  <div className="text-sm text-muted-foreground">Verified Farmers</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-primary">1,200+</div>
                  <div className="text-sm text-muted-foreground">Active Buyers</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-primary">{formatCurrency(2500000)}</div>
                  <div className="text-sm text-muted-foreground">Total Transactions</div>
                </div>
              </div>
            </div>

            <div className="relative h-[400px] lg:h-[600px]">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sprout className="h-48 w-48 text-primary/30" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to connect farmers with buyers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((item) => (
              <div key={item.step} className="relative">
                <Card className="h-full hover-elevate">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">{item.step}</span>
                    </div>
                    <item.icon className="mx-auto h-12 w-12 text-primary" />
                    <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Why Choose Agricompass</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for farmers, buyers, and the agricultural community
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="hover-elevate">
                <CardContent className="p-6 space-y-4">
                  <feature.icon className="h-10 w-10 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to Get Started?</h2>
            <p className="text-lg opacity-90">
              Join our growing community of farmers and buyers. Create your account today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/register?role=farmer">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto px-8 py-6 text-base" data-testid="button-cta-farmer">
                  I'm a Farmer
                </Button>
              </Link>
              <Link href="/register?role=buyer">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-6 text-base bg-transparent border-2 text-primary-foreground hover:bg-primary-foreground/10" data-testid="button-cta-buyer">
                  I'm a Buyer
                </Button>
              </Link>
              <Link href="/register?role=field_officer">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-6 text-base bg-transparent border-2 text-primary-foreground hover:bg-primary-foreground/10" data-testid="button-cta-officer">
                  I'm a Field Officer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-foreground mb-4">About</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about"><a className="hover:text-foreground transition-colors">About Us</a></Link></li>
                <li><a href="#" className="hover:text-foreground transition-colors">How It Works</a></li>
                <li><Link href="/contact"><a className="hover:text-foreground transition-colors">Contact</a></Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">For Farmers</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">List Products</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Get Verified</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Farmer Guide</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">For Buyers</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/marketplace"><a className="hover:text-foreground transition-colors">Browse Products</a></Link></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Bulk Orders</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Buyer Guide</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/terms-of-service"><a className="hover:text-foreground transition-colors">Terms of Service</a></Link></li>
                <li><Link href="/privacy-policy"><a className="hover:text-foreground transition-colors">Privacy Policy</a></Link></li>
                <li><Link href="/cookie-policy"><a className="hover:text-foreground transition-colors">Cookie Policy</a></Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; 2025 Agricompass. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
