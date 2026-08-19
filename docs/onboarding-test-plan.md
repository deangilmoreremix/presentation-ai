# Smart Presentations — Onboarding End-to-End Test Plan

**Document version:** 1.0  
**Date:** 2026-08-18  
**Status:** Ready for execution  
**Tester:** QA / Engineering  
**Environment:** `main` branch, local dev (`pnpm dev`) or staging  
**Prerequisites:**
- Clerk authentication configured (test user account available)
- Supabase database seeded with test data
- `localStorage` accessible in test browser
- Playwright or equivalent E2E framework installed

---

## 1. Test Scope

This plan validates the **complete onboarding experience** for a new user from first sign-in through their first presentation creation. It covers seven implemented features:

| # | Feature | Entry Point | localStorage Key |
|---|---|---|---|
| 1 | Post-Sign-In Welcome Overlay | Dashboard (`/presentation`) | `smart-presentations-onboarding-welcome-dismissed` |
| 2 | Dashboard Empty State | Dashboard (no presentations) | N/A (always visible when empty) |
| 3 | Editor First-Run Tour | Editor (`/presentation/create` or `/presentation/[id]`) | `smart-presentations-onboarding-editor-tour-dismissed` |
| 4 | Progressive Feature Tips | Various editor/dashboard locations | `smart-presentations-onboarding-tip-{id}` |
| 5 | Success Celebration Toasts | After creation, theme apply, export, share | N/A (ephemeral) |
| 6 | Image Studio Onboarding | `/image-studio` (first visit) | `smart-presentations-onboarding-image-studio-dismissed` |
| 7 | Keyboard Shortcuts Modal | Global `?` key or nav button | `smart-presentations-onboarding-shortcuts-seen` |

---

## 2. Test Environment Setup

### 2.1 Pre-Test Checklist

- [ ] Application runs without console errors on `localhost:3000`
- [ ] Clerk test user credentials available
- [ ] Browser DevTools → Application → Local Storage is accessible
- [ ] `localStorage` is cleared before each test run: `localStorage.clear()`
- [ ] Test browser has no existing onboarding flags set
- [ ] Screen resolution set to 1440×900 (desktop baseline)
- [ ] Mobile viewport tests use 375×667 (iPhone SE)

### 2.2 Test Data Setup

- [ ] Ensure test user has **zero** existing presentations
- [ ] Ensure test user has **zero** existing custom themes
- [ ] Ensure test user has **no** generated images in Image Studio

### 2.3 Fresh State Reset Between Tests

Before each test case, execute:

```javascript
// In browser console
localStorage.clear();
location.reload();
```

---

## 3. Functional Verification Test Cases

### 3.1 Welcome Overlay (Feature #1)

**Test case:** `ONBOARD-WELCOME-001`  
**Title:** Welcome overlay appears on first authenticated visit to dashboard  
**Priority:** P0 — Blocker

| Step | Action | Expected Result |
|---|---|---|
| 1 | Sign in as a fresh test user | Redirected to `/presentation` |
| 2 | Observe the page | Fixed overlay visible with backdrop blur |
| 3 | Check overlay heading | Contains "Welcome to Smart Presentations" |
| 4 | Check greeting personalization | Shows "Hi, {FirstName}!" if Clerk has first name; fallback "Welcome!" |
| 5 | Check bullet points | Three items visible: Sparkles, MessageSquare, Download icons with correct text |
| 6 | Check primary CTA | Button labeled "Create Your First Presentation" |
| 7 | Check secondary CTA | Button labeled "Explore the Dashboard" |
| 8 | Check skip link | "Skip tour" text with X icon in top-right corner |
| 9 | Press `Escape` | Overlay closes |
| 10 | Check localStorage | `smart-presentations-onboarding-welcome-dismissed` = `"true"` |
| 11 | Refresh page | Overlay does NOT reappear |

**Test case:** `ONBOARD-WELCOME-002`  
**Title:** Welcome overlay primary CTA navigates correctly  
**Priority:** P0

| Step | Action | Expected Result |
|---|---|---|
| 1 | Sign in as fresh user (overlay appears) | Overlay visible |
| 2 | Click "Create Your First Presentation" | Navigates to `/presentation/create` |
| 3 | Check URL | `/presentation/create` |
| 4 | Check overlay is gone | No overlay visible on new page |

**Test case:** `ONBOARD-WELCOME-003`  
**Title:** Welcome overlay respects already-dismissed state  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Set `localStorage.setItem('smart-presentations-onboarding-welcome-dismissed', 'true')` | — |
| 2 | Sign in and navigate to `/presentation` | Overlay does NOT appear |
| 3 | Clear localStorage, set to `"false"` | — |
| 4 | Sign in and navigate to `/presentation` | Overlay DOES appear (treats non-"true" as not dismissed) |

**Test case:** `ONBOARD-WELCOME-004`  
**Title:** Welcome overlay does not show for anonymous users  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Ensure user is not signed in (or anonymous session) | — |
| 2 | Navigate to `/presentation` | Overlay does NOT appear |
| 3 | Check console | No errors from `useUser()` hook |

**Test case:** `ONBOARD-WELCOME-005`  
**Title:** Welcome overlay dark mode compatibility  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Set app theme to dark mode | — |
| 2 | Sign in as fresh user | Overlay appears with dark-mode colors |
| 3 | Check card background | Dark slate background, not white |
| 4 | Check text contrast | Text is light-colored on dark background |
| 5 | Dismiss overlay, switch to light mode | — |
| 6 | Clear localStorage, reload | Overlay appears with light-mode colors |

---

### 3.2 Dashboard Empty State (Feature #2)

**Test case:** `ONBOARD-EMPTY-001`  
**Title:** Empty state shows 3-step guide when no presentations exist  
**Priority:** P0

| Step | Action | Expected Result |
|---|---|---|
| 1 | Sign in as user with zero presentations | Dashboard loads |
| 2 | Check for "No presentations yet" text | NOT present |
| 3 | Check for 3 step cards | "Describe", "Generate", "Present" all visible |
| 4 | Check step 1 icon | `Type` icon present |
| 5 | Check step 2 icon | `WandSparkles` icon present |
| 6 | Check step 3 icon | `Presentation` icon present |
| 7 | Check primary button | "Create Your First Presentation" visible and clickable |
| 8 | Check secondary links | "Browse Templates" and "Try Image Studio" visible |
| 9 | Check hint text | "You can also generate a presentation from the homepage" visible |
| 10 | Click "Create Your First Presentation" | Navigates to `/presentation/create` or triggers creation flow |
| 11 | Click "Browse Templates" | Navigates to `/templates` |
| 12 | Click "Try Image Studio" | Navigates to `/image-studio` |

**Test case:** `ONBOARD-EMPTY-002`  
**Title:** Empty state is hidden when presentations exist  
**Priority:** P0

| Step | Action | Expected Result |
|---|---|---|
| 1 | Sign in as user with 1+ existing presentations | Dashboard loads |
| 2 | Check for "Describe" step card | NOT present |
| 3 | Check for "Create Your First Presentation" button | NOT present |
| 4 | Verify presentation list/thumbnails are visible | Grid or list of presentations shown |

**Test case:** `ONBOARD-EMPTY-003`  
**Title:** Empty state entrance animation plays  
**Priority:** P2

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear localStorage, sign in as fresh user | — |
| 2 | Navigate to `/presentation` | Empty state fades in and slides up smoothly |
| 3 | Check animation timing | Animation completes within ~500ms |
| 4 | Verify no layout shift after animation | Content stays stable |

---

### 3.3 Editor First-Run Tour (Feature #3)

**Test case:** `ONBOARD-TOUR-001`  
**Title:** Editor tour appears on first entry to editor  
**Priority:** P0

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear localStorage | — |
| 2 | Sign in, create a new presentation | Navigated to editor |
| 3 | Observe tour overlay | 3-step tooltip/popover visible |
| 4 | Check Step 1 content | "Browse and reorder your slides here. Drag to rearrange." + GripVertical icon |
| 5 | Check Step 2 content | "Edit and enhance your content" + Bot icon + "Edit themes, add charts..." |
| 6 | Check Step 3 content | "Powerful controls at your fingertips" + Undo2 icon + "Undo/redo, export..." |
| 7 | Click "Next" on Step 1 | Advances to Step 2 |
| 8 | Click "Next" on Step 2 | Advances to Step 3 |
| 9 | Click "Got it" on Step 3 | Tour closes |
| 10 | Check localStorage | `smart-presentations-onboarding-editor-tour-dismissed` = `"true"` |
| 11 | Refresh page | Tour does NOT reappear |

**Test case:** `ONBOARD-TOUR-002`  
**Title:** Editor tour can be skipped mid-flow  
**Priority:** P0

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear localStorage, enter editor | Tour appears at Step 1 |
| 2 | Click "Skip tour" | Tour closes immediately |
| 3 | Check localStorage | `smart-presentations-onboarding-editor-tour-dismissed` = `"true"` |
| 4 | Refresh page | Tour does NOT reappear |

**Test case:** `ONBOARD-TOUR-003`  
**Title:** Editor tour closes on Escape  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear localStorage, enter editor | Tour appears |
| 2 | Press `Escape` | Tour closes |
| 3 | Check localStorage | Dismissed flag set |

**Test case:** `ONBOARD-TOUR-004`  
**Title:** Editor tour does not show in presentation mode or read-only mode  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear localStorage | — |
| 2 | Open a shared presentation in read-only mode | Tour does NOT appear |
| 3 | Enter presentation mode (Present button) | Tour does NOT appear |
| 4 | Exit presentation mode | Tour does NOT appear (already in edit mode but was dismissed or not applicable) |

---

### 3.4 Progressive Feature Tips (Feature #4)

**Test case:** `ONBOARD-TIPS-001`  
**Title:** Progressive tip appears on first trigger and auto-dismisses  
**Priority:** P0

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear localStorage | — |
| 2 | Navigate to editor | Tip appears at bottom of screen |
| 3 | Check tip content | Message text is readable, dismiss button (×) visible |
| 4 | Wait 8 seconds | Tip auto-dismisses |
| 5 | Check localStorage | `smart-presentations-onboarding-tip-{id}` = `"true"` |
| 6 | Refresh page | Tip does NOT reappear |

**Test case:** `ONBOARD-TIPS-002`  
**Title:** Progressive tip can be manually dismissed  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear localStorage | — |
| 2 | Trigger a tip (e.g., visit a page that calls `showTip`) | Tip appears |
| 3 | Click the × dismiss button | Tip disappears immediately |
| 4 | Check localStorage | Corresponding tip key set to `"true"` |
| 5 | Trigger same tip again | Does NOT reappear |

**Test case:** `ONBOARD-TIPS-003`  
**Title:** Multiple tips can appear simultaneously  
**Priority:** P2

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear localStorage | — |
| 2 | Trigger two different tips simultaneously | Both tips visible in stack at bottom of screen |
| 3 | Dismiss one tip | Other tip remains visible |
| 4 | Dismiss second tip | Both gone |

**Test case:** `ONBOARD-TIPS-004`  
**Title:** Tip does not reappear after dismissal even after clearing other onboarding flags  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Dismiss tip `"editor-sidebar"` | Tip dismissed |
| 2 | Clear only the welcome overlay flag (`smart-presentations-onboarding-welcome-dismissed`) | — |
| 3 | Trigger the same tip | Does NOT reappear (tip flag independent) |

---

### 3.5 Success Celebration Toasts (Feature #5)

**Test case:** `ONBOARD-TOAST-001`  
**Title:** First presentation creation shows celebration toast  
**Priority:** P0

| Step | Action | Expected Result |
|---|---|---|
| 1 | Ensure user has 0 presentations | — |
| 2 | Create first presentation via any method | Toast appears: "🎉 Your first AI presentation is ready!" |
| 3 | Check toast duration | Toast visible for standard sonner duration (~4s) |
| 4 | Create second presentation | Celebration toast does NOT appear (only for first) |
| 5 | Check regular success toast | Standard "Presentation created" toast still appears |

**Test case:** `ONBOARD-TOAST-002`  
**Title:** Theme apply shows success toast  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Open a presentation in editor | Editor loads |
| 2 | Open right panel, select a different theme | Toast: "Theme applied! Explore more in the theme panel." |
| 3 | Verify no error toast | No error toast appears |

**Test case:** `ONBOARD-TOAST-003`  
**Title:** Export shows success toast  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Open a presentation with content | Editor loads |
| 2 | Click Export button, select PPTX or PDF, confirm export | Toast: "📥 Export complete! Your file is downloading." |
| 3 | Verify file download begins | Browser downloads file |

**Test case:** `ONBOARD-TOAST-004`  
**Title:** Share shows success toast  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Open a presentation in editor | Editor loads |
| 2 | Click Share button, toggle public, copy link | Toast: "🔗 Share link copied! Anyone with the link can view." |
| 3 | Verify clipboard contains URL | Paste returns a valid `/share/presentation/[id]` URL |

---

### 3.6 Image Studio Onboarding (Feature #6)

**Test case:** `ONBOARD-IMAGE-001`  
**Title:** Image Studio onboarding overlay appears on first visit  
**Priority:** P0

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear localStorage | — |
| 2 | Navigate to `/image-studio` | Overlay/panel visible at top of page |
| 3 | Check heading | "Welcome to Image Studio" |
| 4 | Check descriptive text | Mentions Generate and Edit tabs |
| 5 | Check "Try it" button | Visible and clickable |
| 6 | Check "Dismiss" button | Visible and clickable |
| 7 | Click "Dismiss" | Overlay disappears |
| 8 | Check localStorage | `smart-presentations-onboarding-image-studio-dismissed` = `"true"` |
| 9 | Refresh `/image-studio` | Overlay does NOT reappear |

**Test case:** `ONBOARD-IMAGE-002`  
**Title:** Image Studio empty gallery state shows when no images  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Ensure user has no generated images | — |
| 2 | Navigate to `/image-studio` | Empty gallery state visible |
| 3 | Check icon | `ImagePlus` icon present |
| 4 | Check text | "Your generated images will appear here. Start by entering a prompt above." |
| 5 | Generate an image | Gallery updates, empty state disappears |

**Test case:** `ONBOARD-IMAGE-003`  
**Title:** "Try it" button focuses the prompt input  
**Priority:** P2

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear localStorage, navigate to `/image-studio` | Overlay visible |
| 2 | Click "Try it" | Prompt textarea receives focus |
| 3 | Verify cursor is in prompt field | Cursor blinking in textarea |

---

### 3.7 Keyboard Shortcuts Modal (Feature #7)

**Test case:** `ONBOARD-KB-001`  
**Title:** Shortcuts modal opens on `?` key press  
**Priority:** P0

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear localStorage | — |
| 2 | Navigate to any page in the app | Page loads |
| 3 | Press `?` key (outside input/textarea) | Shortcuts modal opens |
| 4 | Check modal title | "Keyboard shortcuts" with Keyboard icon |
| 5 | Check shortcuts listed | Ctrl+K, Ctrl+S, Ctrl+Z, Ctrl+Shift+Z, Ctrl+E, ? |
| 6 | Check localStorage | `smart-presentations-onboarding-shortcuts-seen` = `"true"` |
| 7 | Press `Escape` | Modal closes |
| 8 | Press `?` again | Modal opens (key still works, flag only affects tip) |

**Test case:** `ONBOARD-KB-002`  
**Title:** Shortcuts modal opens from nav `?` button  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to any page with nav bar visible | Nav shows `?` button |
| 2 | Click `?` button in nav | Modal opens |
| 3 | Check localStorage | `smart-presentations-onboarding-shortcuts-seen` = `"true"` |

**Test case:** `ONBOARD-KB-003`  
**Title:** First-visit tip appears near `?` button  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear localStorage | — |
| 2 | Navigate to any page with nav bar | Tip appears near `?` button |
| 3 | Check tip text | "Press ? for keyboard shortcuts" |
| 4 | Wait 8 seconds or click × | Tip dismisses |
| 5 | Check localStorage | `smart-presentations-onboarding-shortcuts-seen` = `"true"` |
| 6 | Reload page | Tip does NOT reappear |

**Test case:** `ONBOARD-KB-004`  
**Title:** `?` key is ignored inside text inputs  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Focus a text input (e.g., presentation title field) | Input is focused |
| 2 | Press `?` | Modal does NOT open |
| 3 | Check input value | "?" character inserted into input |
| 4 | Blur input, press `?` | Modal opens |

---

## 4. Workflow Continuity Test Cases

These tests verify that onboarding flows connect properly and don't break the core user journey.

### 4.1 New User End-to-End Flow

**Test case:** `ONBOARD-FLOW-001`  
**Title:** Complete new user journey — sign-in → welcome → first presentation  
**Priority:** P0 — Blocker

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear localStorage, sign up as new user | Redirected to `/presentation` |
| 2 | Verify Welcome Overlay appears | Overlay visible with correct user name |
| 3 | Click "Create Your First Presentation" | Navigates to `/presentation/create` |
| 4 | Verify overlay is gone | No overlay on creation page |
| 5 | Enter prompt, generate presentation | Generation flow completes |
| 6 | Verify success toast | "🎉 Your first AI presentation is ready!" appears |
| 7 | Enter editor | Editor Tour appears (Step 1) |
| 8 | Complete or skip tour | Tour dismissed, localStorage flag set |
| 9 | Verify no tour on refresh | Tour does not reappear |
| 10 | Navigate to `/presentation` | Dashboard shows the new presentation |
| 11 | Verify empty state is gone | 3-step guide not visible, presentation card visible |

**Test case:** `ONBOARD-FLOW-002`  
**Title:** Returning user sees no onboarding elements  
**Priority:** P0 — Blocker

| Step | Action | Expected Result |
|---|---|---|
| 1 | Set all onboarding localStorage flags to `"true"` | — |
| 2 | Sign in, navigate to `/presentation` | No Welcome Overlay, no empty state |
| 3 | Open a presentation | No Editor Tour |
| 4 | Navigate to `/image-studio` | No Image Studio onboarding overlay |
| 5 | Press `?` anywhere | No shortcuts tip near nav button |
| 6 | Verify existing presentations load normally | Dashboard functional |

### 4.2 Cross-Feature State Isolation

**Test case:** `ONBOARD-FLOW-003`  
**Title:** Dismissing Welcome Overlay does not affect Editor Tour  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear all localStorage | — |
| 2 | Sign in, dismiss Welcome Overlay only | `welcome-dismissed` = `"true"`, others unset |
| 3 | Create a presentation, enter editor | Editor Tour appears |
| 4 | Dismiss Editor Tour | `editor-tour-dismissed` = `"true"` |
| 5 | Verify both flags are independently set | Both keys = `"true"` in localStorage |

**Test case:** `ONBOARD-FLOW-004`  
**Title:** Tips are independent of overlay/tour dismissal  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear all localStorage | — |
| 2 | Dismiss Welcome Overlay only | — |
| 3 | Trigger a tip in the dashboard | Tip appears (independent of welcome flag) |
| 4 | Dismiss tip | Tip flag set, welcome flag still `"true"` |

### 4.3 Navigation and Routing Continuity

**Test case:** `ONBOARD-FLOW-005`  
**Title:** Onboarding state preserved across navigation  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear localStorage | — |
| 2 | Sign in (Welcome Overlay appears), dismiss it | Flag set |
| 3 | Navigate to `/image-studio` | No Image Studio overlay (welcome already dismissed, image-studio flag unset → image-studio overlay should appear if unset) |
| 4 | Verify correct overlay behavior | Image Studio onboarding appears (its own flag is unset) |

**Test case:** `ONBOARD-FLOW-006`  
**Title:** Onboarding survives page refresh  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear localStorage, sign in | Welcome Overlay appears |
| 2 | Do NOT dismiss, refresh page | Welcome Overlay still appears (localStorage unset) |
| 3 | Dismiss overlay, refresh | Overlay does NOT reappear |

---

## 5. Edge Cases and Negative Tests

**Test case:** `ONBOARD-EDGE-001`  
**Title:** Welcome Overlay handles missing Clerk user name gracefully  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Sign in with user that has no `firstName` in Clerk | Overlay shows "Welcome!" (not "Hi, undefined!") |

**Test case:** `ONBOARD-EDGE-002`  
**Title:** localStorage disabled or unavailable does not crash app  
**Priority:** P1

| Step | Action | Expected Result |
|---|---|---|
| 1 | Simulate `localStorage` unavailable (e.g., private browsing with quota exceeded, or mock in test) | App loads without crashing, onboarding features degrade gracefully (always show or always hide, but no runtime errors) |

**Test case:** `ONBOARD-EDGE-003`  
**Title:** Rapid double-click on CTA buttons does not cause double navigation  
**Priority:** P2

| Step | Action | Expected Result |
|---|---|---|
| 1 | Sign in, Welcome Overlay appears | — |
| 2 | Double-click "Create Your First Presentation" rapidly | Only one navigation occurs, no duplicate presentations created |

**Test case:** `ONBOARD-EDGE-004`  
**Title:** Tour does not break layout when target element is not found  
**Priority:** P2

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear localStorage | — |
| 2 | Manually manipulate DOM to hide tour target element | Tour still renders without crashing, fallback position used |

---

## 6. Formal Sign-Off Checklist

### 6.1 Functional Completeness

- [ ] All 7 onboarding features are implemented and present in the codebase
- [ ] All localStorage keys follow the `smart-presentations-onboarding-*` naming convention
- [ ] All user-facing text is branded "Smart Presentations" with no ALLWEONE or open-source references
- [ ] All overlays/modals/tips support Escape key dismissal
- [ ] All first-visit logic correctly checks localStorage before showing
- [ ] All dismiss/close actions persist state to localStorage
- [ ] All animations use framer-motion or CSS transitions (no jarring jumps)
- [ ] All components are dark-mode compatible

### 6.2 Test Execution Evidence

For each test case above, the following evidence must be collected:

| Evidence Type | Format | Required For |
|---|---|---|
| Pass/Fail status | ✅ / ❌ per test case | All P0 and P1 tests |
| Screenshot | PNG/JPEG | Every onboarding overlay, modal, tip, and toast |
| Console log | Text file | Zero errors during each test flow |
| localStorage state | JSON export | After each dismissal action |
| Video recording | MP4/WebM | Full new-user E2E flow (`ONBOARD-FLOW-001`) |

### 6.3 Closure Criteria (All Must Pass)

The onboarding implementation is considered **complete and ready for production** when:

1. **All P0 tests pass** (no exceptions, no workarounds)
2. **≥90% of P1 tests pass** (remaining P1 failures documented with acceptable risk assessment)
3. **Zero console errors** during any test flow
4. **localStorage state verified** — every flag correctly persists and survives refresh
5. **Dark mode verified** — all onboarding elements render correctly in both themes
6. **Mobile responsive** — all overlays and tips usable at 375×667 viewport
7. **Accessibility baseline** — all interactive elements have `aria-label` or visible text, Escape key works on every dismissible element
8. **No open-source references** — grep of `src/` returns zero results for `ALLWEONE`, `allweone`, `open-source`, `self-hostable`, `MIT License`
9. **Performance** — no onboarding component adds >100ms to initial page load (measured via Lighthouse or React DevTools Profiler)
10. **Code review completed** — all onboarding files reviewed by at least one engineer

### 6.4 Sign-Off Signatories

| Role | Name | Signature | Date |
|---|---|---|---|
| Engineering Lead | | | |
| QA Lead | | | |
| Product Owner | | | |

---

## 7. Appendix: localStorage Key Registry

| Key | Set By | Read By | Purpose |
|---|---|---|---|
| `smart-presentations-onboarding-welcome-dismissed` | `useWelcomeOverlay` | `useWelcomeOverlay` | Suppress Welcome Overlay after dismissal |
| `smart-presentations-onboarding-editor-tour-dismissed` | `useEditorTour` | `useEditorTour` | Suppress Editor Tour after dismissal |
| `smart-presentations-onboarding-tip-{id}` | `useProgressiveTips` / `ProgressiveTip` | `useProgressiveTips` / `ProgressiveTip` | Suppress individual tip after dismissal |
| `smart-presentations-onboarding-image-studio-dismissed` | `image-studio/page.tsx` | `image-studio/page.tsx` | Suppress Image Studio onboarding |
| `smart-presentations-onboarding-shortcuts-seen` | `Navigation.tsx` | `Navigation.tsx` | Suppress shortcuts tip, mark modal as visited |

**Note:** Tip IDs are arbitrary strings defined by the consuming component (e.g., `"editor-sidebar"`, `"keyboard-shortcuts"`, `"theme-favorite"`).

---

## 8. Appendix: Onboarding File Inventory

| File | Purpose |
|---|---|
| `src/components/onboarding/WelcomeOverlay.tsx` | Post-sign-in welcome modal |
| `src/components/onboarding/EditorTour.tsx` | 3-step editor spotlight tour |
| `src/components/onboarding/ProgressiveTip.tsx` | Dismissible pill-shaped tip |
| `src/components/onboarding/TipProvider.tsx` | Context provider for tip registry |
| `src/components/onboarding/KeyboardShortcutsModal.tsx` | Keyboard shortcuts dialog |
| `src/hooks/onboarding/useWelcomeOverlay.ts` | Welcome overlay visibility hook |
| `src/hooks/onboarding/useEditorTour.ts` | Editor tour state hook |
| `src/hooks/onboarding/useProgressiveTips.ts` | Progressive tip visibility hook |
| `src/app/presentation/page.tsx` | Dashboard page with WelcomeOverlay integration |
| `src/components/notebook/presentation/components/PresentationDashboard.tsx` | Dashboard with empty state redesign |
| `src/components/presentation/core/PresentationPage.tsx` | Editor shell with EditorTour integration |
| `src/app/image-studio/page.tsx` | Image Studio with first-visit onboarding |
| `src/components/navigation/Navigation.tsx` | Nav bar with shortcuts button + ProgressiveTip |
