Prompt: Recreate Hero Slider
Role: Expert Frontend Developer (React + Tailwind CSS) Task: Create a pixel-perfect recreation of the AfriRoyal Hotel landing page hero slider.

1. Technical Requirements
Framework: React (Functional Components, Hooks).
Styling: Tailwind CSS.
Slider Library: Swiper.js (React version) - chosen for best performance and parity with the original owl-carousel/swiper implementation.
Icons: react-icons (or inline SVGs).
Fonts: Google Fonts via next/font or standard import.
1. Design Specifications (Precise Accuracy)
A. Typography
Headings: Font Family Oswald (sans-serif).
Style: Uppercase, Font Weight 400/500.
Size: Large (~60px on desktop).
Letter Spacing: -1px or 0px.
Body Text: Font Family Jost (sans-serif).
Style: Font Weight 400.
Size: ~18px.
Line Height: 1.8.
Colors:
Primary Text: #ffffff (White) on slider.
Accent/Active: #b03d02 (Burnt Orange/Red) - used for active states/highlights.
Dark Background: #0f172b (Navy Blue) - used for UI elements/buttons.
B. Layout & Structure
Full Screen: The slider should take up the full viewport height (h-screen) or significant portion (h-[700px]).
Overlay: Dark overlay on images to ensure text readability (e.g., bg-black/30).
Content Alignment: Center-aligned text container.
C. Animations (Crucial)
Slide Transition: Smooth fade or slide effect.
Text Entrance:
Effect: fadeInUp (Translate Y from 10% to 0%, Opacity 0 to 1).
Timing: Staggered.
Title: Delay 0.2s.
Subtitle/Text: Delay 0.4s.
Button: Delay 0.6s.
Keyframes:
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
Image Effect: Optional subtle "Ken Burns" zoom effect (scale 1.0 to 1.1 over 5-7s).
D. Navigation Controls
Arrows:
Custom thin SVG arrows.
Position: Absolute, vertically centered, left/right edges (or bottom right container).
Style: White stroke, transparent fill, hover effect.
Pagination:
Style: Numbered (e.g., 1, 2) inside a box or circle.
Active State: Highlighted with Accent Color (#b03d02) or White box.
1. Content Data
Slide 1:

Image: https://afriroyalhotel.com/storage/2025/07/s2.jpg
Title: "UNIQUE HOSPITALITY"
Text: "We understand that travelers have unique preferences and needs. Our hotel offers a truly enchanting experience that caters to your stay peaceful at Afri-Royal."
Slide 2:

Image: https://afriroyalhotel.com/storage/2025/07/s1.jpg
Title: "CULINARY EXCELLENCE"
Text: "Our talented chefs meticulously prepare each dish, using the finest locally sourced ingredients to create culinary masterpieces that delight the palate."
4. Implementation Steps
Setup Swiper with EffectFade, Autoplay, Navigation, Pagination.
Create a HeroSlider component.
Define custom Tailwind animations in tailwind.config.js for fadeInUp.
Implement the custom navigation buttons (hide default Swiper arrows, use swiper.slideNext() ref).
Ensure responsive typography (smaller text on mobile).
5. Example Code Structure
// tailwind.config.js extension
theme: {
  extend: {
    fontFamily: {
      oswald: ['Oswald', 'sans-serif'],
      jost: ['Jost', 'sans-serif'],
    },
    colors: {
      primary: '#0f172b',
      accent: '#b03d02',
    },
    animation: {
      fadeInUp: 'fadeInUp 0.8s ease-out forwards',
    },
    keyframes: {
      fadeInUp: {
        '0%': { opacity: '0', transform: 'translateY(20px)' },
        '100%': { opacity: '1', transform: 'translateY(0)' },
      }
    }
  }
}
Deliverable: A complete, single-file (or modular) React component code that renders this slider.