/**
 * ═══════════════════════════════════════════════════════════════
 * DataTable Design System - Single Source of Truth
 * ═══════════════════════════════════════════════════════════════
 * All table styling tokens for the entire application.
 * Changing values here automatically updates every table.
 */

export const TABLE_THEME = {
  // ── Layout & Spacing ──
  layout: {
    rowHeight: 88,
    headerHeight: 56,
    toolbarHeight: 64,
    borderRadius: 12,
    containerBorderRadius: 8,
    gap: 16,
  },

  // ── Cell Padding ──
  padding: {
    cellX: 16,
    cellY: 0,
    toolbarX: 20,
    toolbarY: 14,
  },

  // ── Typography ──
  typography: {
    headerSize: 11,
    headerWeight: 800,
    headerLetterSpacing: '0.06em',
    cellSize: 13,
    cellWeight: 600,
    labelSize: 14,
    labelWeight: 800,
    sublabelSize: 12,
    sublabelWeight: 500,
  },

  // ── Colors (CSS Variables) ──
  colors: {
    border: 'var(--border)',
    headerBg: '#fbfaf8',
    headerBgDark: 'var(--panel)',
    rowHoverBg: 'rgba(90, 79, 207, 0.035)',
    tableBg: '#fbfaf8',
    tableBgDark: 'var(--panel)',
    headerText: '#5f6875',
    cellText: 'var(--text)',
    headingText: 'var(--heading)',
    mutedText: '#7a7870',
    borderLight: '#e9e0d3',
    borderHeader: '#e7dfd2',
  },

  // ── Icons ──
  icons: {
    size: 46,
    fontSize: 18,
    borderRadius: 8,
  },

  // ── Badges ──
  badges: {
    height: 38,
    minWidth: 138,
    paddingX: 14,
    fontSize: 12,
    fontWeight: 800,
    borderRadius: 999,
    borderWidth: 1,
  },

  // ── Pills ──
  pills: {
    height: 56,
    minWidth: 110,
    paddingX: 16,
    fontSize: 12,
    fontWeight: 800,
    borderRadius: 999,
    labelSize: 10,
    valueSize: 12,
    gap: 4,
  },

  // ── Action Buttons ──
  buttons: {
    height: 38,
    width: 170,
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 7,
    paddingX: 10,
    gap: 5,
  },

  // ── Toolbar Controls ──
  controls: {
    height: 40,
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 7,
    paddingX: 14,
    gap: 12,
    minWidth: 76,
  },

  // ── Scrollbar ──
  scrollbar: {
    width: 8,
    height: 8,
    thumbColor: 'var(--border)',
    thumbHoverColor: 'var(--muted)',
    trackColor: 'transparent',
  },

  // ── Transitions ──
  transitions: {
    hover: '0.12s',
    focus: '0.15s',
  },

  // ── Shadows ──
  shadows: {
    toolbar: 'var(--shadow-sm)',
    table: 'var(--shadow-sm)',
    badge: '0 1px 2px rgba(15, 23, 42, 0.08)',
  },

  // ── Empty State ──
  emptyState: {
    paddingY: 36,
    paddingX: 18,
    fontSize: 14,
    color: 'var(--muted)',
  },

  // ── Loading Skeleton ──
  skeleton: {
    bgStart: '#eceff3',
    bgMid: '#f7f8fa',
    bgEnd: '#eceff3',
    animationDuration: '1.2s',
    borderRadius: 6,
  },
};

/**
 * ═══════════════════════════════════════════════════════════════
 * Grid Column Definitions
 * ═══════════════════════════════════════════════════════════════
 * Predefined responsive column layouts.
 * Use these for consistent table structures.
 */

export const COLUMN_LAYOUTS = {
  // Created Adapters Table
  adapters: {
    columns: '32% 16% 11% 16% 13% 12%',
    minWidth: 1200,
  },

  // Generic 6-column layout
  standard6: {
    columns: '2.5fr 1.5fr 1fr 1.3fr 1.2fr 1.2fr',
    minWidth: 1100,
  },

  // Generic 5-column layout
  standard5: {
    columns: '2fr 1.5fr 1.5fr 1fr 1fr',
    minWidth: 900,
  },

  // Generic 4-column layout
  standard4: {
    columns: '2fr 1.5fr 1.5fr 1fr',
    minWidth: 800,
  },

  // Compact 3-column layout
  compact3: {
    columns: '1.5fr 1fr 1fr',
    minWidth: 600,
  },
};

/**
 * ═══════════════════════════════════════════════════════════════
 * Badge Type Definitions
 * ═══════════════════════════════════════════════════════════════
 */

export const BADGE_TYPES = {
  inbound: {
    borderColor: '#bbf7d0',
    bgColor: '#f0fdf4',
    textColor: '#15803d',
  },
  outbound: {
    borderColor: '#bfdbfe',
    bgColor: '#eff6ff',
    textColor: '#1d4ed8',
  },
  success: {
    borderColor: 'rgba(22, 163, 74, 0.25)',
    bgColor: 'rgba(22, 163, 74, 0.1)',
    textColor: '#15803d',
  },
  warning: {
    borderColor: 'rgba(245, 158, 11, 0.25)',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    textColor: '#d97706',
  },
  error: {
    borderColor: 'rgba(220, 38, 38, 0.25)',
    bgColor: 'rgba(220, 38, 38, 0.1)',
    textColor: '#dc2626',
  },
  idle: {
    borderColor: '#e5dacb',
    bgColor: '#fffdf9',
    textColor: '#77746d',
  },
};

/**
 * ═══════════════════════════════════════════════════════════════
 * Icon Status Colors
 * ═══════════════════════════════════════════════════════════════
 */

export const ICON_STATUS = {
  success: {
    bgColor: '#dcfce7',
    iconColor: '#16a34a',
  },
  danger: {
    bgColor: '#fee2e2',
    iconColor: '#ef4444',
  },
  idle: {
    bgColor: '#eeeeec',
    iconColor: '#8a8a84',
  },
};

/**
 * ═══════════════════════════════════════════════════════════════
 * Helper Functions
 * ═══════════════════════════════════════════════════════════════
 */

export function getColumnLayout(layoutName) {
  return COLUMN_LAYOUTS[layoutName] || COLUMN_LAYOUTS.standard6;
}

export function getBadgeStyle(type) {
  return BADGE_TYPES[type] || BADGE_TYPES.idle;
}

export function getIconStatus(status) {
  return ICON_STATUS[status] || ICON_STATUS.idle;
}
