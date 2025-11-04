# Agricompass Design Guidelines

## Design Approach

**Hybrid Approach**: Combining Material Design principles for data-rich dashboards with marketplace patterns inspired by Airbnb and Etsy for product browsing. This creates a professional, trustworthy platform that balances visual appeal with functional clarity for farmers, buyers, and field officers.

**Core Philosophy**: Professional agricultural marketplace that builds trust through clear information hierarchy, verification indicators, and accessible design suitable for users with varying technical literacy.

---

## Typography System

**Font Families**:
- Primary: Inter (headings, UI elements, buttons)
- Secondary: System UI stack (body text, forms, data tables)

**Hierarchy**:
- Page Titles: text-4xl md:text-5xl, font-bold
- Section Headers: text-2xl md:text-3xl, font-semibold
- Card Titles: text-xl, font-semibold
- Body Text: text-base, font-normal
- Captions/Labels: text-sm, font-medium
- Data/Numbers: text-lg md:text-xl, font-semibold (for prices, quantities)

---

## Layout & Spacing System

**Spacing Scale**: Use Tailwind units of 3, 4, 6, 8, 12, 16, 20
- Component padding: p-4 to p-6
- Section spacing: py-12 md:py-16 lg:py-20
- Card gaps: gap-6 md:gap-8
- Form field spacing: space-y-4

**Container System**:
- Marketing pages: max-w-7xl
- Dashboard layouts: max-w-screen-2xl
- Form containers: max-w-2xl
- Content sections: max-w-4xl

**Grid Patterns**:
- Product listings: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Feature sections: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

---

## Component Library

### Navigation
**Header**: Sticky top navigation with logo left, role-based menu items center, user profile/notifications right. Height: h-16 md:h-20. Include search bar for marketplace pages.

**Sidebar** (Dashboard pages): Fixed left sidebar, w-64, with role-specific navigation, collapsed to icon-only on mobile (w-16). Active states with indicator bar.

### Cards & Containers
**Product Cards**: Vertical layout with image aspect-square, product name, price prominent, quantity/location, verification badge top-right, subtle border, hover lift effect (translate-y-1).

**Dashboard Cards**: White background, rounded-lg border, p-6, with icon/stat header, metric display, and action footer.

**Listing Detail**: Two-column layout (lg:grid-cols-2), image gallery left (with thumbnails), product info/pricing right, full-width description below.

### Forms
**Input Fields**: Consistent height h-12, rounded-md border, px-4, focus ring. Labels above with text-sm font-medium.

**File Uploads**: Drag-drop zone with dashed border, center icon/text, preview thumbnails in grid below.

**Multi-step Forms**: Progress indicator at top (stepper pattern), numbered circles with connecting lines, sections with clear headings.

### Buttons
**Primary CTA**: px-6 py-3, rounded-lg, font-semibold. Prominent on hero and key actions (List Product, Place Order).

**Secondary**: Outlined variant with border-2, same padding/rounding.

**Icon Buttons**: p-3, rounded-full, for actions like favorite, share, notifications.

### Trust Elements
**Verification Badges**: Small icon-text combo (shield/checkmark icon + "Verified"), displayed consistently on farmer profiles, product cards.

**Rating Display**: Star icons with numerical rating (4.8/5.0), review count in parentheses.

**Status Indicators**: Color-coded pills (rounded-full, px-3, py-1, text-xs) for order status, verification status.

### Data Display
**Tables**: Striped rows, sticky header, sortable columns, action column right-aligned. Mobile: cards instead of table.

**Stats/Metrics**: Large number display (text-3xl font-bold), label below (text-sm), icon accent.

**Charts**: Simple bar/line charts for analytics, avoid overly complex visualizations.

### Marketplace Specific
**Filters Panel**: Left sidebar on desktop (w-72), drawer on mobile, accordion sections for categories/regions/price.

**Search Bar**: Prominent in header, w-full md:max-w-md, with category dropdown and search button.

**Cart Summary**: Sticky on checkout pages, grouped by seller with subtotals, grand total prominent.

---

## Page-Specific Layouts

### Landing Page
**Hero Section**: Full-width, min-h-[600px], two-column layout (text left, image right), with heading, subheading, dual CTAs (Register as Farmer / Browse Marketplace), trust indicators below (user count, transaction volume).

**How It Works**: Three-column process flow with numbered icons, title, description.

**Features Grid**: 2x3 grid showcasing platform benefits (Verified Farmers, Direct Pricing, Quality Assurance, etc.) with icons and descriptions.

**CTA Section**: Centered, with role-specific buttons side-by-side, background treatment.

**Footer**: Four-column layout (About, For Farmers, For Buyers, Legal), newsletter signup, social links.

### Marketplace Browse
**Layout**: Filters sidebar left (collapsible), product grid right (3-4 columns), search/sort bar top.

**Empty States**: Center-aligned icon, message, and action button when no results.

### Dashboards
**Layout**: Sidebar navigation left, main content area with page header (title + primary action button), then grid of cards/sections.

**Farmer Dashboard**: Active listings grid, recent orders table, earnings summary card, quick-create listing button.

**Buyer Dashboard**: Saved suppliers carousel, active orders list, marketplace search shortcut.

**Field Officer**: Assigned farmers list with verification status, pending verifications count card.

### Product Detail
**Gallery**: Main image with thumbnail strip below, lightbox on click.

**Info Panel**: Sticky on scroll (desktop), product name, price (with bulk tiers in table), quantity available, MOQ, harvest date, location, seller profile card, contact/order buttons.

**Tabs**: Description, Seller Info, Reviews, Shipping sections.

### Order Management
**Order Card**: Expandable accordion showing order items, status timeline (horizontal stepper), action buttons (Accept/Reject for farmers, Track/Contact for buyers).

---

## Images

**Hero Image**: Agricultural landscape or farmer-buyer handshake scene, warm tones, authentic photography style, positioned on right side of hero section at 50% width on desktop, full-width on mobile below text.

**Product Listing Images**: Square aspect ratio (1:1), high-quality photos of produce, consistent background treatment (white or neutral).

**Dashboard Icons**: Line-style icons from Heroicons for navigation and feature indicators.

**Empty States**: Friendly illustrations of farm scenes, delivery trucks, or handshake icons for various empty states.

**Trust Badges**: Small icon graphics for verification checkmarks, quality seals.

---

## Accessibility & Usability

- Minimum touch target: 44x44px for mobile interactions
- Form validation with inline error messages below fields
- Loading states with skeleton screens for data-heavy pages
- Breadcrumb navigation on detail/nested pages
- Clear back buttons and cancel actions
- Confirmation modals for destructive actions (reject order, delete listing)
- Consistent iconography with text labels for clarity

---

## Responsive Behavior

**Mobile-First Approach**:
- Stack multi-column layouts to single column
- Sidebar navigation converts to bottom tab bar or hamburger menu
- Tables convert to cards with key info visible
- Reduce spacing scale by ~30% on mobile (py-12 → py-8)
- Hero sections: text stacks above image, min-h-[500px]