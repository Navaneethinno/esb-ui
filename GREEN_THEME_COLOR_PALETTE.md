# INNOBRIDGE GREEN THEME - COLOR PALETTE

## Primary Green System

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRIMARY GREEN PALETTE                         │
└─────────────────────────────────────────────────────────────────┘

PRIMARY GREEN (#16a34a)
██████████████████████████████████████████████████████████████████
Use: Primary buttons, active states, brand elements
Contrast on white: 4.54:1 (AA Large)

SECONDARY GREEN (#22c55e)  
██████████████████████████████████████████████████████████████████
Use: Accents, hover highlights, secondary actions
Contrast on white: 3.64:1 (AA Large)

LIGHT GREEN (#dcfce7)
██████████████████████████████████████████████████████████████████
Use: Soft backgrounds, badge backgrounds, subtle highlights
Contrast on dark: 13.5:1 (AAA)

DARK GREEN (#14532d)
██████████████████████████████████████████████████████████████████
Use: Dark sidebar, high contrast text, dark theme accents
Contrast on white: 11.82:1 (AAA)

SUCCESS GREEN (#10b981)
██████████████████████████████████████████████████████████████████
Use: Success indicators, positive feedback, checkmarks
Contrast on white: 3.89:1 (AA Large)
```

---

## Supporting Colors

```
WARNING AMBER (#f59e0b)
██████████████████████████████████████████████████████████████████
Use: Warning states, alerts, caution indicators

DANGER RED (#ef4444)
██████████████████████████████████████████████████████████████████
Use: Error states, delete actions, critical alerts
```

---

## Component Color Usage

### Sidebar
```
┌──────────────────┐
│  [LOGO]          │  Background: #14532d (light) / #0f1f15 (dark)
│                  │  Brand mark: #16a34a
│  ○ Dashboard     │  Text: rgba(255,255,255,0.55)
│  ● Adapters      │  Active: #16a34a background
│  ○ Config        │  Hover: rgba(255,255,255,0.08) overlay
└──────────────────┘
```

### Buttons
```
┌──────────────────┐
│   Save Changes   │  Background: #16a34a
└──────────────────┘  Hover: #15803d
     PRIMARY          Color: #fff

┌──────────────────┐
│      Cancel      │  Background: transparent
└──────────────────┘  Border: var(--border)
     SECONDARY        Hover: var(--panel-soft)
```

### Badges
```
[Success]  Background: #dcfce7 | Text: #14532d
[Route]    Background: rgba(34,197,94,0.12) | Text: #22c55e
[Error]    Background: #fee2e2 | Text: #ef4444
[Idle]     Background: var(--panel-soft) | Text: var(--muted)
```

### Cards
```
┌─────────────────────────────────────────────────────────┐
│ │ Card Title                                            │
│ │                                                       │
│ │ Card content here with green left border accent      │
└─────────────────────────────────────────────────────────┘
  └─ Green accent: #16a34a (3px solid)
```

---

## Theme Comparison

### Light Mode

#### Before (Purple)
```
Primary:        #5a4fcf  ████████████
Hover:          #4f46e5  ████████████
Soft:           #eef2ff  ████████████
Sidebar:        #1a1a24  ████████████
```

#### After (Green)
```
Primary:        #16a34a  ████████████
Hover:          #15803d  ████████████
Soft:           #dcfce7  ████████████
Sidebar:        #14532d  ████████████
```

### Dark Mode

#### Before (Purple)
```
Primary:        #5a4fcf  ████████████
Hover:          #6366f1  ████████████
Sidebar:        #15151f  ████████████
```

#### After (Green)
```
Primary:        #22c55e  ████████████
Hover:          #4ade80  ████████████
Sidebar:        #0f1f15  ████████████
```

---

## CSS Variable Reference

### Usage Examples
```css
/* Primary button */
background: var(--primary);           /* #16a34a */
color: #fff;

/* Button hover */
background: var(--primary-hover);     /* #15803d */

/* Soft highlight */
background: var(--primary-soft);      /* #dcfce7 */
color: var(--primary);                /* #16a34a */

/* Success badge */
background: var(--success-soft);      /* #d1fae5 */
color: var(--success);                /* #10b981 */

/* Sidebar */
background: var(--sidebar);           /* #14532d / #0f1f15 */
color: rgba(255,255,255,0.55);
```

---

## Gradients

### Dashboard Banner
```css
background: linear-gradient(
  135deg, 
  #16a34a 0%,    /* Primary green */
  #22c55e 100%   /* Secondary green */
);
```

### Visual:
```
┌─────────────────────────────────────────────────────┐
│ ████████████████████████████████████████████████████│
│ ███████████████████████████████████████████████████ │
│ ██████████████████████████████████████████████████  │
│ █████████████████████████████████████████████████   │
└─────────────────────────────────────────────────────┘
  Green-600 ──────────────────────────► Green-500
  #16a34a                               #22c55e
```

---

## Icon Backgrounds

### Metric Cards
```
┌─────────┐
│  [📊]   │  Background: rgba(22,163,74,0.1)
│         │  Icon color: #16a34a
└─────────┘
```

### Success State
```
┌─────────┐
│  [✓]    │  Background: rgba(16,185,129,0.12)
│         │  Icon color: #10b981
└─────────┘
```

---

## Form States

### Focus Ring
```
┌────────────────────────────────────┐
│ Input text here                    │  ←─ Focus
└────────────────────────────────────┘
         │
         └─ box-shadow: 0 0 0 3px rgba(22,163,74,0.12)
```

### Active Dropdown
```
┌────────────────────────────────────┐
│ Select option ▼                    │  ←─ Open
└────────────────────────────────────┘
         │
         └─ border-color: #16a34a
```

---

## Chart Colors

### Donut Chart
```
     ███████
  ███       ███     Green slice:   #16a34a
 ██           ██    Success slice:  #10b981
██             ██   Orange slice:   #f59e0b
██             ██   Red slice:      #ef4444
 ██           ██
  ███       ███
     ███████
```

### Gauge Chart
```
        ○
       ╱ ╲
      ╱   ╲        Arc color: #16a34a
     ╱     ╲       Track: var(--border)
    ╱───────╲      Needle: var(--heading)
   180°     0°
```

---

## Topology Diagram

### Gateway Node
```
    ╭─────────────╮
    │   ╭─────╮   │  Border: rgba(22,163,74,0.3)
    │   │ 🌐  │   │  Background: radial-gradient(green)
    │   ╰─────╯   │  Shadow: rgba(22,163,74,0.13)
    │   ESB GW    │
    ╰─────────────╯
```

### Connection Line
```
[Inbound] ─────────► [ESB] ─────────► [Outbound]
           Green              Green
          #16a34a           #16a34a
```

---

## Accessibility Notes

### Text on Green Backgrounds
✅ **White text on #16a34a**: 4.54:1 (AA Large)  
✅ **Dark green on #dcfce7**: 11.82:1 (AAA)  
✅ **Primary on white**: 4.54:1 (AA Large)  

### Minimum Sizes
- **AA Large**: 18px+ or 14px+ bold
- **AA Normal**: 4.5:1 contrast (not met by all greens)
- **AAA**: 7:1 contrast (met by dark green)

### Best Practices
- ✅ Use white text on #16a34a buttons
- ✅ Use #14532d for high contrast text
- ⚠️ Use #22c55e only for large text or icons
- ⚠️ Avoid #22c55e for small body text

---

## Print-Ready Palette

### Hex Codes
```
#16a34a  Primary Green
#22c55e  Secondary Green
#dcfce7  Light Green
#14532d  Dark Green
#10b981  Success Green
#f59e0b  Warning Amber
#ef4444  Danger Red
```

### RGB Values
```
rgb(22, 163, 74)    Primary Green
rgb(34, 197, 94)    Secondary Green
rgb(220, 252, 231)  Light Green
rgb(20, 83, 45)     Dark Green
rgb(16, 185, 129)   Success Green
rgb(245, 158, 11)   Warning Amber
rgb(239, 68, 68)    Danger Red
```

### HSL Values
```
hsl(142, 76%, 36%)   Primary Green
hsl(142, 71%, 45%)   Secondary Green
hsl(138, 76%, 93%)   Light Green
hsl(144, 61%, 20%)   Dark Green
hsl(160, 84%, 39%)   Success Green
hsl(38, 92%, 50%)    Warning Amber
hsl(0, 84%, 60%)     Danger Red
```

---

## Brand Usage

### Logo Mark
- Background: #16a34a (Primary Green)
- Icon: #fff (White)
- Size: 34×34px
- Border radius: 7px

### Full Brand Colors
- Primary: #16a34a
- Secondary: #22c55e
- Light: #dcfce7
- Dark: #14532d

---

**Color System**: InnoRecon Green  
**Version**: 1.0  
**Last Updated**: 2024-01-15
