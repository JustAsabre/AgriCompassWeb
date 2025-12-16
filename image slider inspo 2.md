Prompt: Recreate EnspireFX Hero Section
Role: Expert Frontend Developer (React + Tailwind CSS) Task: Create a pixel-perfect recreation of the EnspireFX landing page hero section.

1. Technical Requirements
Framework: React (Functional Components).
Styling: Tailwind CSS.
Icons: react-icons (e.g., FaWhatsapp, FaPlay or similar for "See Packages" icon).
Fonts: IBM Plex Sans (Google Font).
2. Design Specifications (Precise Accuracy)
A. Typography
Font Family: IBM Plex Sans (sans-serif) for all text.
Headings:
Main Title: "Best Web Design Company in Ghana"
Size: Large (~48px-60px).
Weight: Bold (700).
Color: White.
Line Height: Tight (1.2).
Subtitle: "Premium Business Web Development for SMEs | SEO Agency"
Size: ~20px.
Weight: Bold (700).
Color: White (or slightly off-white).
Body Text:
Size: ~17px.
Color: White/Light Gray (#EDF2F7 or similar).
Line Height: 1.7.
B. Color Palette
Backgrounds:
Dark Overlay: rgba(0, 0, 0, 0.73) or a dark blue/black gradient overlaying the image.
Primary Dark: #1A202C (used in other sections, good for context).
Accents (Gradients):
Button Gradient: linear-gradient(135deg, #f9a200 0%, #ff0077 100%) (Orange to Pink/Magenta).
WhatsApp Button: #25D366 (Standard WhatsApp Green).
C. Layout & Structure
Hero Container: Full width, high height (min-height 600px or 80vh).
Background Image: High-quality business/fashion image.
Placeholder: Use a similar high-quality image from Unsplash (e.g., fashion designer or creative professional).
Content Alignment:
Text container aligned to the Left.
Padding: Significant padding on the left (containerized).
Floating Elements:
WhatsApp Button: Fixed in bottom-right corner, pill shape, green.
D. Components
Navbar (Simplified):
Logo (Left).
Links: Home, About, Services, Pricing, Portfolio, Blog.
CTA Button: "Get Quote" (Gradient).
Hero Content:
H1 Title.
H2 Subtitle.
Paragraph Description.
Action Buttons:
"GET STARTED": Rounded pill, Gradient background, White text, Shadow.
"SEE PACKAGES": Transparent background, White text, Icon (e.g., document or play icon), Hover effect.
E. Animations
Entrance: fadeInUp (Fade in and slide up) for text elements, staggered.
Title -> Subtitle -> Description -> Buttons.
Hover Effects: Scale up slightly on buttons.
3. Content Data
Title: "Best Web Design Company in Ghana"
Subtitle: "Premium Business Web Development for SMEs | SEO Agency"
Description: "EnspireFX Websites is reviewed by clients as one of the best web design companies in Ghana. We build professional, custom websites and digital solutions for SMEs and organisations."
Trust Signal: "Excellent 4.7 out of 5 Trustpilot" (Star icons).
4. Implementation Steps
Configure tailwind.config.js to include IBM Plex Sans and custom colors.
Create HeroSection component.
Implement the background image with the dark overlay.
Build the left-aligned content column.
Add the floating WhatsApp button.
5. Example Code Snippet
// tailwind.config.js
theme: {
  extend: {
    fontFamily: {
      sans: ['"IBM Plex Sans"', 'sans-serif'],
    },
    colors: {
      brand: {
        pink: '#c80a62',
        orange: '#f9a200',
        dark: '#1A202C',
      }
    },
    backgroundImage: {
      'hero-gradient': 'linear-gradient(135deg, #f9a200 0%, #ff0077 100%)',
    }
  }
}
Deliverable: A complete React component for the Hero section.