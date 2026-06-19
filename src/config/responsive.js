/**
 * ═══════════════════════════════════════════════════════════════
 * Responsive Design System - Breakpoints & Utilities
 * ═══════════════════════════════════════════════════════════════
 * Single source of truth for all responsive behavior.
 */

export const BREAKPOINTS = {
  xs: 320,
  sm: 576,
  md: 768,
  lg: 1024,
  xl: 1440,
  xxl: 1920,
};

export const MEDIA_QUERIES = {
  xs: `(min-width: ${BREAKPOINTS.xs}px)`,
  sm: `(min-width: ${BREAKPOINTS.sm}px)`,
  md: `(min-width: ${BREAKPOINTS.md}px)`,
  lg: `(min-width: ${BREAKPOINTS.lg}px)`,
  xl: `(min-width: ${BREAKPOINTS.xl}px)`,
  xxl: `(min-width: ${BREAKPOINTS.xxl}px)`,
  
  // Max width queries
  maxXs: `(max-width: ${BREAKPOINTS.xs - 1}px)`,
  maxSm: `(max-width: ${BREAKPOINTS.sm - 1}px)`,
  maxMd: `(max-width: ${BREAKPOINTS.md - 1}px)`,
  maxLg: `(max-width: ${BREAKPOINTS.lg - 1}px)`,
  maxXl: `(max-width: ${BREAKPOINTS.xl - 1}px)`,
  maxXxl: `(max-width: ${BREAKPOINTS.xxl - 1}px)`,
  
  // Device categories
  mobile: `(max-width: ${BREAKPOINTS.md - 1}px)`,
  tablet: `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  desktop: `(min-width: ${BREAKPOINTS.lg}px)`,
};

/**
 * Responsive Typography Scale
 */
export const TYPOGRAPHY_SCALE = {
  // Mobile-first fluid typography
  heading1: 'clamp(1.75rem, 2vw + 1rem, 2.5rem)',     // 28px -> 40px
  heading2: 'clamp(1.5rem, 1.5vw + 1rem, 2rem)',      // 24px -> 32px
  heading3: 'clamp(1.25rem, 1.25vw + 0.75rem, 1.5rem)', // 20px -> 24px
  heading4: 'clamp(1.125rem, 1vw + 0.75rem, 1.25rem)',  // 18px -> 20px
  
  body: 'clamp(0.875rem, 0.5vw + 0.75rem, 1rem)',    // 14px -> 16px
  bodySmall: 'clamp(0.75rem, 0.5vw + 0.625rem, 0.875rem)', // 12px -> 14px
  caption: 'clamp(0.6875rem, 0.5vw + 0.5rem, 0.75rem)',    // 11px -> 12px
};

/**
 * Responsive Spacing Scale
 */
export const SPACING_SCALE = {
  // Container padding
  containerPadding: {
    mobile: '16px',
    tablet: '24px',
    desktop: '28px',
  },
  
  // Section gaps
  sectionGap: {
    mobile: '16px',
    tablet: '20px',
    desktop: '24px',
  },
  
  // Component gaps
  componentGap: {
    mobile: '12px',
    tablet: '14px',
    desktop: '16px',
  },
};

/**
 * Responsive Layout Configuration
 */
export const LAYOUT_CONFIG = {
  sidebar: {
    width: {
      mobile: 0,        // Hidden
      tablet: 80,       // Icons only
      desktop: 220,     // Full width
    },
    collapsedWidth: 80,
  },
  
  toolbar: {
    height: {
      mobile: 'auto',
      tablet: 64,
      desktop: 64,
    },
  },
  
  table: {
    rowHeight: {
      mobile: 'auto',
      tablet: 88,
      desktop: 88,
    },
    headerHeight: {
      mobile: 48,
      tablet: 56,
      desktop: 56,
    },
  },
};

/**
 * Helper hook for responsive behavior
 */
export function useResponsive() {
  if (typeof window === 'undefined') return { isMobile: false, isTablet: false, isDesktop: true };
  
  const width = window.innerWidth;
  
  return {
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    width,
    breakpoint: 
      width < BREAKPOINTS.sm ? 'xs' :
      width < BREAKPOINTS.md ? 'sm' :
      width < BREAKPOINTS.lg ? 'md' :
      width < BREAKPOINTS.xl ? 'lg' :
      width < BREAKPOINTS.xxl ? 'xl' : 'xxl',
  };
}

/**
 * CSS Custom Properties for Responsive Design
 */
export const RESPONSIVE_CSS_VARS = `
:root {
  /* Breakpoints */
  --bp-xs: ${BREAKPOINTS.xs}px;
  --bp-sm: ${BREAKPOINTS.sm}px;
  --bp-md: ${BREAKPOINTS.md}px;
  --bp-lg: ${BREAKPOINTS.lg}px;
  --bp-xl: ${BREAKPOINTS.xl}px;
  --bp-xxl: ${BREAKPOINTS.xxl}px;
  
  /* Fluid Typography */
  --text-h1: ${TYPOGRAPHY_SCALE.heading1};
  --text-h2: ${TYPOGRAPHY_SCALE.heading2};
  --text-h3: ${TYPOGRAPHY_SCALE.heading3};
  --text-h4: ${TYPOGRAPHY_SCALE.heading4};
  --text-body: ${TYPOGRAPHY_SCALE.body};
  --text-small: ${TYPOGRAPHY_SCALE.bodySmall};
  --text-caption: ${TYPOGRAPHY_SCALE.caption};
  
  /* Responsive Spacing */
  --container-padding: ${SPACING_SCALE.containerPadding.mobile};
  --section-gap: ${SPACING_SCALE.sectionGap.mobile};
  --component-gap: ${SPACING_SCALE.componentGap.mobile};
  
  /* Sidebar Width */
  --sidebar-width: 0px;
}

@media ${MEDIA_QUERIES.md} {
  :root {
    --container-padding: ${SPACING_SCALE.containerPadding.tablet};
    --section-gap: ${SPACING_SCALE.sectionGap.tablet};
    --component-gap: ${SPACING_SCALE.componentGap.tablet};
    --sidebar-width: ${LAYOUT_CONFIG.sidebar.width.tablet}px;
  }
}

@media ${MEDIA_QUERIES.lg} {
  :root {
    --container-padding: ${SPACING_SCALE.containerPadding.desktop};
    --section-gap: ${SPACING_SCALE.sectionGap.desktop};
    --component-gap: ${SPACING_SCALE.componentGap.desktop};
    --sidebar-width: ${LAYOUT_CONFIG.sidebar.width.desktop}px;
  }
}
`;
