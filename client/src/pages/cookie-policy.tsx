import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Cookie } from "lucide-react";

export default function CookiePolicyPage() {
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
              <Cookie className="h-6 w-6 text-primary" />
              <CardTitle className="text-3xl">Cookie Policy</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: November 16, 2025
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h2>1. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners.
            </p>

            <h2>2. How We Use Cookies</h2>
            <p>
              AgriCompass uses cookies and similar tracking technologies to improve your experience, analyze usage, and deliver personalized content. We use both first-party cookies (set by us) and third-party cookies (set by our service providers).
            </p>

            <h2>3. Types of Cookies We Use</h2>
            
            <h3>3.1 Essential Cookies</h3>
            <p>
              These cookies are necessary for the Platform to function properly and cannot be disabled.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Cookie Name</th>
                  <th className="text-left p-2">Purpose</th>
                  <th className="text-left p-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2"><code>connect.sid</code></td>
                  <td className="p-2">Session management and authentication</td>
                  <td className="p-2">Session</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2"><code>csrf_token</code></td>
                  <td className="p-2">Security and CSRF protection</td>
                  <td className="p-2">Session</td>
                </tr>
              </tbody>
            </table>

            <h3>3.2 Performance Cookies</h3>
            <p>
              These cookies help us understand how visitors interact with the Platform by collecting anonymous information.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Cookie Name</th>
                  <th className="text-left p-2">Purpose</th>
                  <th className="text-left p-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2"><code>_ga</code></td>
                  <td className="p-2">Google Analytics - distinguishes users</td>
                  <td className="p-2">2 years</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2"><code>_gid</code></td>
                  <td className="p-2">Google Analytics - distinguishes users</td>
                  <td className="p-2">24 hours</td>
                </tr>
              </tbody>
            </table>

            <h3>3.3 Functional Cookies</h3>
            <p>
              These cookies enable enhanced functionality and personalization.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Cookie Name</th>
                  <th className="text-left p-2">Purpose</th>
                  <th className="text-left p-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2"><code>theme_preference</code></td>
                  <td className="p-2">Remembers your theme choice (light/dark)</td>
                  <td className="p-2">1 year</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2"><code>language</code></td>
                  <td className="p-2">Stores language preference</td>
                  <td className="p-2">1 year</td>
                </tr>
              </tbody>
            </table>

            <h3>3.4 Advertising Cookies</h3>
            <p>
              These cookies may be used by our advertising partners to build a profile of your interests and show relevant ads.
            </p>
            <p className="text-sm italic">
              Note: We currently do not use advertising cookies. This section is for future reference.
            </p>

            <h2>4. Third-Party Cookies</h2>
            <p>
              Some cookies are placed by third-party services that appear on our pages:
            </p>
            <ul>
              <li><strong>Google Analytics:</strong> Helps us understand user behavior and improve the Platform</li>
              <li><strong>Payment Processors:</strong> Secure payment processing (Stripe, PayPal)</li>
              <li><strong>Email Services:</strong> Email delivery and tracking (Resend)</li>
            </ul>

            <h2>5. How to Control Cookies</h2>
            
            <h3>5.1 Browser Settings</h3>
            <p>
              Most web browsers allow you to control cookies through their settings:
            </p>
            <ul>
              <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
              <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</li>
              <li><strong>Edge:</strong> Settings → Privacy, search, and services → Cookies</li>
            </ul>

            <h3>5.2 Platform Cookie Preferences</h3>
            <p>
              You can manage your cookie preferences through our cookie consent banner, which appears when you first visit the Platform. Your choices are stored in a cookie (ironically) so we can remember your preferences.
            </p>

            <h3>5.3 Do Not Track</h3>
            <p>
              We respect the "Do Not Track" (DNT) browser setting. When DNT is enabled, we will not use tracking cookies for analytics or advertising purposes. Essential cookies will still be used for Platform functionality.
            </p>

            <h2>6. Impact of Disabling Cookies</h2>
            <p>
              If you disable cookies, some features of the Platform may not function properly:
            </p>
            <ul>
              <li>You may not be able to stay logged in</li>
              <li>Your preferences (theme, language) will not be saved</li>
              <li>Some interactive features may not work</li>
              <li>We may not be able to provide personalized content</li>
            </ul>

            <h2>7. Cookie Consent</h2>
            <p>
              By using the Platform, you consent to the use of cookies as described in this policy. For essential cookies, consent is implied as they are necessary for the Platform to function. For non-essential cookies, we will ask for your explicit consent through our cookie banner.
            </p>

            <h2>8. Updates to This Cookie Policy</h2>
            <p>
              We may update this Cookie Policy from time to time to reflect changes in technology, law, or our business practices. We will notify you of material changes through the Platform or via email.
            </p>

            <h2>9. Contact Us</h2>
            <p>
              If you have questions about our use of cookies, please contact us at:
              <br />
              Email: privacy@agricompass.com
              <br />
              Address: [Your Business Address]
            </p>

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <p className="text-sm font-semibold mb-2">Quick Cookie Reference:</p>
              <ul className="text-sm space-y-1">
                <li>🔒 <strong>Essential Cookies:</strong> Cannot be disabled, required for login and security</li>
                <li>📊 <strong>Analytics Cookies:</strong> Optional, help us improve the Platform</li>
                <li>✨ <strong>Preference Cookies:</strong> Optional, remember your settings</li>
                <li>🎯 <strong>Advertising Cookies:</strong> Not currently used</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
