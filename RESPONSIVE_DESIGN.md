# Responsive Design System Documentation

## Overview

This application uses a **mobile-first responsive design system** that works flawlessly across all device sizes and zoom levels.

## Supported Devices

✅ **Mobile Phones** (320px–767px)  
✅ **Tablets** (768px–1023px)  
✅ **Laptops** (1024px–1439px)  
✅ **Desktop Monitors** (1440px+)  
✅ **Ultrawide Monitors** (1920px+)  
✅ **Browser Zoom** (80%, 100%, 125%, 150%)  
✅ **Minimized Windows** (All sizes)

## Architecture

### Centralized Breakpoints

All responsive breakpoints are defined in `/src/config/responsive.js`:

```javascript
export const BREAKPOINTS = {
  xs: 320,   // Extra small devices
  sm: 576,   // Small devices
  md: 768,   // Medium devices (tablets)
  lg: 1024,  // Large devices (desktops)
  xl: 1440,  // Extra large desktops
  xxl: 1920, // Ultrawide monitors
};
```

### Responsive Components

Every shared component is built mobile-first:

- **DataTable** - Converts to card layout on mobile
- **DataTableToolbar** - Stacks vertically on mobile
- **Sidebar** - Drawer navigation on mobile
- **Layout Shell** - Adaptive grid system

## Key Features

### 1. Mobile Table Transformation

Desktop:
- Traditional table layout
- All columns visible
- Horizontal scroll if needed

Mobile (<768px):
- Converts to card layout
- Stacked content
- No horizontal scroll
- Labels automatically added via `data-label` attributes

### 2. Responsive Typography

Fluid typography using `clamp()`:

```css
font-size: clamp(12px, 1vw, 14px);
```

Automatically scales between min and max values based on viewport.

### 3. Adaptive Spacing

Spacing scales with screen size:

```css
padding: clamp(16px, 3vw, 28px);
gap: clamp(12px, 2vw, 20px);
```

### 4. Sidebar Behavior

**Desktop (≥1024px):**
- Always visible
- 220px width
- Sticky positioning

**Tablet/Mobile (<1024px):**
- Hidden by default
- Drawer overlay
- Hamburger menu
- Backdrop blur

### 5. Toolbar Responsiveness

**Desktop:**
```
[New Adapter] [All | Inbound | Outbound] [Format ▼] [Search...] [Refresh]
```

**Mobile:**
```
[New Adapter]
[All | Inbound | Outbound]
[Format ▼]
[Search...]
[Refresh]
```

All controls stack vertically and expand to full width.

## Usage Guidelines

### Creating New Responsive Components

1. **Import breakpoints:**
```javascript
import { BREAKPOINTS, MEDIA_QUERIES } from '@/config/responsive';
```

2. **Use fluid values:**
```css
font-size: clamp(12px, 1vw, 14px);
padding: clamp(16px, 2vw, 24px);
gap: clamp(8px, 1.5vw, 12px);
```

3. **Add mobile breakpoints:**
```css
@media (max-width: 767px) {
  /* Mobile styles */
}
```

4. **Test across devices:**
- iPhone SE (375px)
- iPad Mini (768px)
- Desktop (1440px)
- Zoom 125%, 150%

### Best Practices

✅ **DO:**
- Use flexbox/grid
- Use relative units (%, rem, vw)
- Use clamp() for fluid sizing
- Stack elements vertically on mobile
- Test at multiple zoom levels

❌ **DON'T:**
- Use fixed widths
- Use fixed heights (except for specific cases)
- Assume desktop-first
- Create horizontal scroll on mobile
- Hardcode pixel values

## Testing Checklist

Test every page on:

- [ ] iPhone SE (375px width)
- [ ] iPhone 14/15 (390px width)
- [ ] Android phones (360px-400px)
- [ ] iPad Mini (768px width)
- [ ] iPad Pro (1024px width)
- [ ] 13-inch laptop (1280px-1366px)
- [ ] 15-inch laptop (1440px-1920px)
- [ ] 24-inch monitor (1920px-2560px)
- [ ] Ultrawide (2560px+)

Zoom levels:
- [ ] 80%
- [ ] 100%
- [ ] 125%
- [ ] 150%

Browser resize:
- [ ] Drag resize from 320px to 2560px
- [ ] Split screen mode
- [ ] Minimized browser window

## Component-Specific Behavior

### DataTable

**Desktop:**
- Traditional table
- Fixed column widths
- Horizontal scroll if needed

**Mobile:**
- Card layout
- Labels above values
- No horizontal scroll

### Toolbar

**Desktop:**
- Single row
- Horizontal layout

**Mobile:**
- Stacked layout
- Full-width controls
- Vertical spacing

### Sidebar

**Desktop:**
- Always visible
- 220px fixed width

**Mobile:**
- Drawer overlay
- Hamburger button
- Backdrop

## CSS Variables

Responsive CSS custom properties:

```css
:root {
  --sidebar-width: 0px; /* Mobile default */
  --container-padding: 16px;
  --section-gap: 16px;
  --component-gap: 12px;
}

@media (min-width: 768px) {
  :root {
    --sidebar-width: 80px;
    --container-padding: 24px;
  }
}

@media (min-width: 1024px) {
  :root {
    --sidebar-width: 220px;
    --container-padding: 28px;
  }
}
```

## Maintenance

### Adding New Breakpoints

1. Update `/src/config/responsive.js`
2. Add media queries to component CSS
3. Update this documentation
4. Test across all devices

### Modifying Responsive Behavior

1. Change values in `responsive.js`
2. Update component CSS if needed
3. Test all affected components
4. Verify no layout breaks

## Support

For issues or questions about responsive behavior:

1. Check browser console for layout warnings
2. Test at multiple breakpoints
3. Verify CSS custom properties
4. Check for overriding styles
5. Review component-specific responsive CSS

---

**Last Updated:** 2024
**System Version:** 1.0.0
