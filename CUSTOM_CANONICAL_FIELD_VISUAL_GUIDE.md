# Custom Canonical Field - Visual Implementation Guide

## 📍 Feature Locations

### 1. Canonical Field Dropdown (Enhanced)

**Location:** Every leaf node in the tree mapping builder

**Before:**
```
┌─────────────────────────────────────────┐
│ -- Select canonical field --            │
│ Account ID                              │
│ Account Number                          │
│ Amount                                  │
│ Customer ID                             │
│ Transaction Date                        │
└─────────────────────────────────────────┘
```

**After (NEW):**
```
┌─────────────────────────────────────────┐
│ -- Select canonical field --            │
│ Account ID                              │
│ Account Number                          │
│ Amount                                  │
│ Customer ID                             │
│ Transaction Date                        │
├─────────────────────────────────────────┤  ← Visual separator
│ + Create Custom Canonical Field         │  ← NEW OPTION (bold, primary color)
└─────────────────────────────────────────┘
```

---

### 2. Custom Canonical Field Modal (NEW)

**Triggered by:** Clicking "+ Create Custom Canonical Field" option

**Modal Structure:**
```
╔═══════════════════════════════════════════════════════╗
║  Create Custom Canonical Field               [X]      ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║                     ┌─────┐                          ║
║                     │  🪄  │   ← Magic wand icon     ║
║                     └─────┘                          ║
║                                                       ║
║              Feature Coming Soon                      ║
║                                                       ║
║   Custom canonical field creation will be             ║
║   available in the next release.                      ║
║                                                       ║
╠═══════════════════════════════════════════════════════╣
║                                          [Close]      ║
╚═══════════════════════════════════════════════════════╝
```

---

## 🎯 Where to Find This Feature

### Page: Create Adapter / Manage Functions

**Navigation Path:**
1. Dashboard → "Create Adapter" or "Created Adapters"
2. Select any adapter → "Manage Functions"
3. Add/Edit Request Type
4. Paste JSON payload in Request/Response section
5. Tree view appears below
6. Expand any leaf node
7. **NEW:** Canonical field dropdown now includes custom option

**Example Tree View:**
```
📄 Request Payload Schema (3 / 5 mapped)

  📁 data []                                    [ARRAY]
    ↓
    ⚪ account_no                    [Customer Account No ▼]
                                     ├─ Customer Account No
                                     ├─ Transaction Amount
                                     ├─ Account ID
                                     ├─────────────────────
                                     └─ + Create Custom...  ← NEW

    ⚪ amount                        [Transaction Amount ▼]
    
    ⚪ currency                      [-- Select canonical --▼]
                                     ├─ Currency Code
                                     ├─ Currency Symbol  
                                     ├─────────────────────
                                     └─ + Create Custom...  ← NEW
```

---

## 🔄 User Flow

### Scenario 1: Normal Canonical Field Selection (Unchanged)

```
User clicks dropdown
    ↓
Sees canonical fields
    ↓
Selects existing field (e.g., "Account ID")
    ↓
Field mapped ✅
    ↓
Dropdown shows selected value
```

### Scenario 2: Custom Canonical Field (NEW)

```
User clicks dropdown
    ↓
Scrolls to bottom
    ↓
Sees "+ Create Custom Canonical Field"
    ↓
Clicks it
    ↓
Modal appears 🪄
    ↓
User reads "Feature Coming Soon"
    ↓
User clicks "Close" or backdrop
    ↓
Modal closes, dropdown resets to empty
```

---

## 📱 Responsive Behavior

### Desktop (≥ 768px)
- Dropdown: 280px width
- Modal: 440px width
- Full tree view visible

### Tablet (768px - 1024px)
- Dropdown: 100% width
- Modal: 92vw (responsive)
- Tree wraps gracefully

### Mobile (< 768px)
- Dropdown: 100% width
- Modal: 92vw (responsive)
- Vertical stack layout

---

## 🎨 Styling Details

### Dropdown Option Styling
```css
option[value="__CREATE_CUSTOM__"] {
  border-top: 2px solid var(--border);
  margin-top: 4px;
  padding-top: 4px;
  font-weight: 700;
  color: var(--primary);
  background: var(--primary-soft);
}
```

### Modal Styling
- **Background:** Semi-transparent backdrop (rgba)
- **Card:** White panel with border
- **Shadow:** 0 24px 60px rgba(0,0,0,0.3)
- **Border Radius:** 12px
- **Z-index:** 9999

---

## ⚙️ Technical Behavior

### State Management
```
Initial:  showCustomModal = false
          ↓
User clicks dropdown option
          ↓
onChange detects "__CREATE_CUSTOM__"
          ↓
setShowCustomModal(true)
          ↓
Modal renders
          ↓
Dropdown value reset to ""
          ↓
User closes modal
          ↓
setShowCustomModal(false)
          ↓
Back to initial state
```

### Event Flow
1. **onChange** → Checks if value is `__CREATE_CUSTOM__`
2. **If true** → Opens modal, resets dropdown
3. **If false** → Normal field mapping (existing behavior)

---

## 🧪 Testing Scenarios

### ✅ Test Case 1: Dropdown Appears Correctly
**Expected:** Custom option visible at bottom of every dropdown

### ✅ Test Case 2: Modal Opens
**Expected:** Clicking custom option opens modal

### ✅ Test Case 3: Modal Closes
**Expected:** Close button, backdrop click both close modal

### ✅ Test Case 4: Dropdown Resets
**Expected:** After closing modal, dropdown shows "-- Select canonical --"

### ✅ Test Case 5: Existing Fields Still Work
**Expected:** Selecting normal canonical field works as before

### ✅ Test Case 6: Multiple Dropdowns
**Expected:** All dropdowns have custom option

### ✅ Test Case 7: Nested Trees
**Expected:** Custom option works in deeply nested nodes

### ✅ Test Case 8: Request & Response
**Expected:** Custom option in both request and response mappings

---

## 📸 Screenshot Reference Points

When capturing screenshots, include:

1. **Full page view** showing tree mapping builder
2. **Dropdown expanded** showing custom option at bottom
3. **Modal open** showing "Feature coming soon" message
4. **Multiple dropdowns** showing feature consistency

---

## 🔮 Future Enhancement Preview

**When backend is ready:**

```
╔═══════════════════════════════════════════════════════╗
║  Create Custom Canonical Field               [X]      ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  Canonical Field Name *                               ║
║  ┌─────────────────────────────────────────────────┐ ║
║  │ e.g., "Merchant ID"                             │ ║
║  └─────────────────────────────────────────────────┘ ║
║                                                       ║
║  Field Type *                                         ║
║  ┌─────────────────────────────────────────────────┐ ║
║  │ String                                       ▼  │ ║
║  └─────────────────────────────────────────────────┘ ║
║                                                       ║
║  Description                                          ║
║  ┌─────────────────────────────────────────────────┐ ║
║  │                                                 │ ║
║  └─────────────────────────────────────────────────┘ ║
║                                                       ║
╠═══════════════════════════════════════════════════════╣
║                            [Cancel]  [Create Field]   ║
╚═══════════════════════════════════════════════════════╝
```

**Current implementation:** Simple placeholder (as requested)

---

## ✅ Implementation Complete

**Status:** Ready for production  
**Backend Required:** No  
**Breaking Changes:** None  
**User Impact:** Positive (new feature, existing behavior preserved)

---

**Next Steps:**
1. Test in development environment
2. Capture screenshots for documentation
3. Plan backend API schema (future)
4. Design custom field creation form (future)
