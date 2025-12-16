Prompt: Recreate Kava Ghana Hero Section
Role: Expert Frontend Developer (React + Tailwind CSS) Task: Create a pixel-perfect recreation of the Kava Ghana landing page hero section with its specific slider animations.

1. Technical Requirements
Framework: React (Functional Components).
Styling: Tailwind CSS.
Slider Library: react-slick (Slick Slider) + slick-carousel (CSS).
Icons: react-icons (e.g., FaPhone, FaBars for nav).
Fonts: Montserrat (Google Font alternative to Proxima Nova).
2. Design Specifications (Precise Accuracy)
A. Typography
Font Family: Montserrat (sans-serif) as a close free alternative to Proxima Nova.
Headings:
Main Headline: Large, Bold (700/900), White. Size ~48px-60px.
Subheadline: Uppercase, Light/Regular (300/400), Secondary Color (Orange). Size ~20px.
Tagline: Light (300), White. Size ~24px.
Body Text: White/Light Gray.
B. Color Palette
Primary Blue: #00a9ce
Secondary Orange: #f47820
Tertiary Green: #76bc1d
Dark Background: #081622 (Slider background).
Text: White (#ffffff) for slider content.
C. Layout & Structure
Navbar:
Logo (Left).
Links (Right): Our Work, Services, About Us, Contact.
"Call Us" Button (Green text/icon).
"Work With Us" Button (Green background).
Hamburger Menu (Rightmost).
Hero Slider:
Full Height: 100vh or min-h-[800px].
Slide Content:
Left Column: Text content (Subheadline, Headline, Tagline, Buttons).
Right Column: Hero Image (Laptop/Device mockup) positioned absolutely or floating.
Background: Full-cover background image with a dark overlay or specific color treatment.
D. Animations (Crucial)
Slider Transition: Fade effect (fade: true in Slick settings).
Text Entrance:
Staggered fade-in + slide-up for: Subheadline -> Headline -> Tagline -> Buttons.
Use a library like framer-motion or custom CSS keyframes triggered on slide change.
Image Entrance:
Background: Subtle zoom (Ken Burns effect).
Foreground Image: Slide in from right or fade in with slight scale up.
3. Content Data (Sample Slide)
Subheadline: "WEBSITE DESIGN, WEB HOSTING"
Headline: "Tailored to fit your brand"
Tagline: "A beautiful corporate website development for an international prestige brand"
Buttons:
"VIEW CASE STUDY" (Green background, rectangular).
"WORK WITH US" (Transparent/Bordered).
4. Implementation Steps
Setup: Install react-slick, slick-carousel, react-icons. Configure Tailwind for colors and fonts.
Navbar Component: Fixed header with transparent-to-solid transition on scroll (optional, but stick to fixed for now).
HeroSlider Component:
Implement Slider with settings: dots: true, infinite: true, speed: 500, fade: true, autoplay: true.
Custom Dots: Numbered dots (01, 02, 03) on the right side or bottom.
SlideItem Component:
Accepts props: bgImage, fgImage, subTitle, title, desc.
Implement internal animations (e.g., using framer-motion AnimatePresence or CSS classes that reset on active slide).
5. Example Code Snippet (Slider Settings)
const settings = {
  dots: true,
  fade: true,
  infinite: true,
  speed: 1000,
  autoplay: true,
  autoplaySpeed: 6000,
  slidesToShow: 1,
  slidesToScroll: 1,
  // Custom paging for numbers if needed
  customPaging: (i) => (
    <div className="text-white text-xs opacity-50 hover:opacity-100">
      0{i + 1}
    </div>
  ),
};
Deliverable: A complete React component for the Navbar and Hero Slider.