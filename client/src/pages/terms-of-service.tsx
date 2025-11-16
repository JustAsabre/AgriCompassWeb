import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfServicePage() {
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
              <FileText className="h-6 w-6 text-primary" />
              <CardTitle className="text-3xl">Terms of Service</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: November 16, 2025
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using AgriCompass ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the Platform.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              AgriCompass is an online marketplace platform that connects farmers directly with buyers, facilitating the sale and purchase of agricultural products. The Platform also provides verification services through field officers to ensure quality and authenticity.
            </p>

            <h2>3. User Accounts</h2>
            <h3>3.1 Registration</h3>
            <p>
              To use certain features of the Platform, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
            </p>
            <h3>3.2 Account Security</h3>
            <p>
              You are responsible for safeguarding your password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
            <h3>3.3 User Types</h3>
            <ul>
              <li><strong>Farmers:</strong> Agricultural producers listing products for sale</li>
              <li><strong>Buyers:</strong> Businesses or individuals purchasing agricultural products</li>
              <li><strong>Field Officers:</strong> Authorized personnel who verify farmer credentials and product quality</li>
            </ul>

            <h2>4. User Conduct</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Post false, inaccurate, misleading, or defamatory content</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the intellectual property rights of others</li>
              <li>Transmit any viruses, malware, or harmful code</li>
              <li>Engage in price manipulation or fraudulent activities</li>
              <li>Harass, threaten, or abuse other users</li>
            </ul>

            <h2>5. Listings and Transactions</h2>
            <h3>5.1 Product Listings</h3>
            <p>
              Farmers are responsible for the accuracy of their product listings, including descriptions, prices, quantities, and images. All products must comply with applicable agricultural standards and regulations.
            </p>
            <h3>5.2 Pricing and Payment</h3>
            <p>
              Prices are set by farmers and may include bulk pricing tiers. All transactions are subject to the agreed-upon terms between buyers and farmers. AgriCompass facilitates the marketplace but is not a party to the transaction.
            </p>
            <h3>5.3 Order Fulfillment</h3>
            <p>
              Farmers are responsible for fulfilling orders in a timely manner and maintaining product quality as described in listings. Buyers are responsible for providing accurate delivery information and payment.
            </p>

            <h2>6. Verification Process</h2>
            <p>
              Field officers may verify farmers to establish credibility. Verified status does not constitute a guarantee by AgriCompass of product quality or farmer reliability. Buyers should exercise their own due diligence.
            </p>

            <h2>7. Fees and Payments</h2>
            <p>
              AgriCompass may charge service fees for certain transactions or premium features. All applicable fees will be clearly disclosed before you incur any charges. Payment processing is handled through secure third-party payment processors.
            </p>

            <h2>8. Intellectual Property</h2>
            <p>
              The Platform and its original content, features, and functionality are owned by AgriCompass and are protected by international copyright, trademark, and other intellectual property laws.
            </p>

            <h2>9. Dispute Resolution</h2>
            <p>
              In the event of a dispute between users, we encourage good-faith negotiations. AgriCompass may provide a dispute resolution mechanism but is not obligated to mediate disputes. Users agree to attempt to resolve disputes amicably before pursuing legal action.
            </p>

            <h2>10. Limitation of Liability</h2>
            <p>
              AgriCompass provides the Platform "as is" without warranties of any kind. We are not liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Platform.
            </p>

            <h2>11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless AgriCompass and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses arising out of your use of the Platform or violation of these Terms.
            </p>

            <h2>12. Termination</h2>
            <p>
              We may terminate or suspend your account and access to the Platform immediately, without prior notice or liability, for any reason, including breach of these Terms. Upon termination, your right to use the Platform will immediately cease.
            </p>

            <h2>13. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of any material changes via email or through the Platform. Your continued use of the Platform after such modifications constitutes acceptance of the updated Terms.
            </p>

            <h2>14. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
            </p>

            <h2>15. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us at:
              <br />
              Email: legal@agricompass.com
              <br />
              Address: [Your Business Address]
            </p>

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <p className="text-sm">
                By using AgriCompass, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
