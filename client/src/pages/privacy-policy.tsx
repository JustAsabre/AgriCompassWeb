import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: November 16, 2025
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h2>1. Introduction</h2>
            <p>
              AgriCompass ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Platform.
            </p>

            <h2>2. Information We Collect</h2>
            <h3>2.1 Personal Information</h3>
            <p>We collect information that you provide directly to us, including:</p>
            <ul>
              <li>Name and contact information (email, phone number)</li>
              <li>Account credentials (username, password)</li>
              <li>Business information (business name, farm size for farmers, buyer company details)</li>
              <li>Location and regional information</li>
              <li>Payment and billing information</li>
              <li>Profile photos and product images</li>
            </ul>

            <h3>2.2 Automatically Collected Information</h3>
            <p>When you use the Platform, we automatically collect:</p>
            <ul>
              <li>Device information (IP address, browser type, operating system)</li>
              <li>Usage data (pages visited, time spent, features used)</li>
              <li>Cookies and similar tracking technologies</li>
              <li>Location data (with your permission)</li>
            </ul>

            <h3>2.3 Transaction Information</h3>
            <ul>
              <li>Order history and details</li>
              <li>Product listings and pricing</li>
              <li>Communication between buyers and farmers</li>
              <li>Reviews and ratings</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>We use collected information for the following purposes:</p>
            <ul>
              <li>To provide, maintain, and improve the Platform</li>
              <li>To process transactions and send confirmations</li>
              <li>To communicate with you about your account and transactions</li>
              <li>To verify farmer credentials through field officers</li>
              <li>To send promotional materials and updates (with your consent)</li>
              <li>To detect and prevent fraud and abuse</li>
              <li>To analyze usage patterns and improve user experience</li>
              <li>To comply with legal obligations</li>
            </ul>

            <h2>4. Information Sharing and Disclosure</h2>
            <h3>4.1 With Other Users</h3>
            <p>
              Certain information is shared publicly or with other users as part of the Platform's functionality:
            </p>
            <ul>
              <li>Farmers' public profiles (name, business details, verification status)</li>
              <li>Product listings and descriptions</li>
              <li>Reviews and ratings</li>
            </ul>

            <h3>4.2 With Service Providers</h3>
            <p>
              We share information with third-party service providers who perform services on our behalf:
            </p>
            <ul>
              <li>Payment processors</li>
              <li>Email and communication services</li>
              <li>Cloud hosting providers</li>
              <li>Analytics services</li>
            </ul>

            <h3>4.3 For Legal Reasons</h3>
            <p>We may disclose information if required by law or in response to:</p>
            <ul>
              <li>Legal processes or government requests</li>
              <li>Enforcing our Terms of Service</li>
              <li>Protecting rights, property, or safety</li>
              <li>Detecting or preventing fraud</li>
            </ul>

            <h2>5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your information:
            </p>
            <ul>
              <li>Encryption of data in transit and at rest</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication</li>
              <li>Employee training on data protection</li>
            </ul>
            <p>
              However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security of your information.
            </p>

            <h2>6. Your Rights and Choices</h2>
            <h3>6.1 Access and Correction</h3>
            <p>
              You can access and update your personal information through your account settings.
            </p>

            <h3>6.2 Data Deletion</h3>
            <p>
              You may request deletion of your account and personal data by contacting us. Some information may be retained for legal or legitimate business purposes.
            </p>

            <h3>6.3 Marketing Communications</h3>
            <p>
              You can opt out of promotional emails by clicking "unsubscribe" in any marketing email or updating your account preferences.
            </p>

            <h3>6.4 Cookies</h3>
            <p>
              You can control cookies through your browser settings. Note that disabling cookies may affect Platform functionality.
            </p>

            <h2>7. Data Retention</h2>
            <p>
              We retain your information for as long as necessary to:
            </p>
            <ul>
              <li>Provide the Platform services</li>
              <li>Comply with legal obligations</li>
              <li>Resolve disputes</li>
              <li>Enforce our agreements</li>
            </ul>
            <p>
              After account deletion, we may retain certain information in anonymized or aggregated form.
            </p>

            <h2>8. Children's Privacy</h2>
            <p>
              The Platform is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us.
            </p>

            <h2>9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
            </p>

            <h2>10. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes via email or through the Platform. Your continued use after such changes constitutes acceptance of the updated policy.
            </p>

            <h2>11. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy, please contact us at:
              <br />
              Email: privacy@agricompass.com
              <br />
              Address: [Your Business Address]
              <br />
              Data Protection Officer: [Contact Information]
            </p>

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <p className="text-sm font-semibold mb-2">Your Data Rights Summary:</p>
              <ul className="text-sm space-y-1">
                <li>✓ Right to access your personal data</li>
                <li>✓ Right to correct inaccurate data</li>
                <li>✓ Right to delete your account and data</li>
                <li>✓ Right to opt out of marketing communications</li>
                <li>✓ Right to data portability</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
