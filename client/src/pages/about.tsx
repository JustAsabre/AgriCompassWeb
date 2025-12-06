import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Heart, Target, Users, Award } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-subtle py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <div className="space-y-8">
          {/* Hero Section */}
          <Card>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Heart className="h-8 w-8 text-primary" />
                <CardTitle className="text-4xl">About AgriCompass</CardTitle>
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Connecting farmers and buyers to build a sustainable agricultural ecosystem
              </p>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                AgriCompass is a digital marketplace platform designed to revolutionize agricultural commerce
                by connecting verified farmers directly with buyers, ensuring fair pricing, quality assurance,
                and sustainable farming practices.
              </p>
            </CardContent>
          </Card>

          {/* Mission & Vision */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-6 w-6 text-primary" />
                  <CardTitle>Our Mission</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To empower farmers with digital tools and direct market access while providing buyers
                  with access to fresh, locally-sourced agricultural products at fair prices.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Award className="h-6 w-6 text-primary" />
                  <CardTitle>Our Vision</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  A world where every farmer has access to fair markets and every consumer has access
                  to fresh, sustainable food through transparent and efficient agricultural commerce.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* What We Do */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">What We Do</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Connect Communities</h3>
                  <p className="text-sm text-muted-foreground">
                    Bridge the gap between farmers and buyers through our verified marketplace platform
                  </p>
                </div>
                <div className="text-center">
                  <Award className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Ensure Quality</h3>
                  <p className="text-sm text-muted-foreground">
                    Field officer verification system ensures product quality and farmer credibility
                  </p>
                </div>
                <div className="text-center">
                  <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Promote Sustainability</h3>
                  <p className="text-sm text-muted-foreground">
                    Support sustainable farming practices and local food systems
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Our Values */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Our Values</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Transparency</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    We believe in open and honest communication between all stakeholders in the agricultural supply chain.
                  </p>

                  <h3 className="font-semibold mb-3">Fairness</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ensuring fair prices for farmers and quality products for buyers through direct market access.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Quality</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Commitment to product quality and farmer verification to build trust in our marketplace.
                  </p>

                  <h3 className="font-semibold mb-3">Sustainability</h3>
                  <p className="text-sm text-muted-foreground">
                    Supporting environmentally sustainable farming practices and local food systems.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Our Team</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                AgriCompass is built by a dedicated team of agricultural technology experts,
                farmers, and software engineers committed to transforming agricultural commerce.
              </p>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  We're a growing team passionate about connecting farmers with markets and
                  consumers with fresh, sustainable food.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact CTA */}
          <Card>
            <CardContent className="text-center py-8">
              <h3 className="text-xl font-semibold mb-4">Get In Touch</h3>
              <p className="text-muted-foreground mb-6">
                Have questions about AgriCompass? We'd love to hear from you.
              </p>
              <Button asChild>
                <Link href="/contact">
                  Contact Us
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}