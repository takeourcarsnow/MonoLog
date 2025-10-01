# PublishButton Component

A modern, feature-rich publish button with countdown timer and visual feedback.

## Features

### 🎯 Visual States

1. **Ready to Publish** (Green)
   - Gradient green background (#10b981 → #059669)
   - Pulsing animation with glow effect
   - Upload icon with floating animation
   - "Publish" text with glow effect

2. **On Cooldown** (Purple/Indigo)
   - Gradient purple background (#6366f1 → #4f46e5)
   - Circular progress ring showing remaining time
   - Live countdown display (HH:MM:SS format)
   - Animated progress indicator

3. **Processing** (Disabled)
   - Spinning loader animation
   - "Processing…" text
   - Button disabled during upload

### ⏱️ Countdown Display

The countdown shows:
- **Hours** (if > 0): `00h`
- **Minutes**: `00m`
- **Seconds**: `00s`

All values are displayed with:
- Tabular numbers for consistent width
- Drop shadow for better readability
- Smooth transitions between states

### 🎨 Progress Ring

A circular progress indicator that:
- Wraps around the button perimeter
- Shows remaining time visually (100% → 0%)
- Has a glowing effect with drop shadow
- Animates smoothly with 1s linear transitions

### 💬 User Feedback

When clicking during cooldown:
- Displays "🕒 Already posted today!"
- Message pops in with spring animation
- Auto-dismisses after 2 seconds
- Accessible via `aria-live="polite"`

### ✨ Animations

- **Ready pulse**: Subtle scale + shadow pulse every 2s
- **Icon float**: Upload icon bounces gently
- **Text glow**: Text shadow pulses with ready state
- **Message pop**: Spring animation for cooldown message
- **Progress ring**: Smooth circular countdown

### ♿ Accessibility

- Full keyboard support
- Screen reader announcements
- Descriptive `aria-label` for all states
- Respects `prefers-reduced-motion`
- Color contrast meets WCAG standards

### 📱 Responsive Design

- Adapts to mobile screens (< 640px)
- Touch-friendly sizing (min 52-56px height)
- Flexible width with minimum constraints

## Usage

```tsx
import { PublishButton } from '@/components/PublishButton';

<PublishButton
  canPost={true}
  remaining="23:59:45"
  remainingMs={86385000}
  countdownTotalMs={86400000}
  processing={false}
  disabled={false}
  onPublish={() => handlePublish()}
/>
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `canPost` | `boolean` | Whether user can publish now |
| `remaining` | `string` | Time string in "HH:MM:SS" format |
| `remainingMs` | `number \| null` | Milliseconds remaining |
| `countdownTotalMs` | `number \| null` | Total cooldown duration in ms |
| `processing` | `boolean` | Whether upload is in progress |
| `disabled` | `boolean` | Additional disabled state |
| `onPublish` | `() => void` | Callback when publish is clicked |

## Design Philosophy

The button follows these principles:

1. **Visual Hierarchy**: State is immediately obvious through color, animation, and iconography
2. **Progressive Disclosure**: Information appears when needed (countdown during cooldown, message on click)
3. **Smooth Transitions**: All state changes animate smoothly to maintain context
4. **Accessibility First**: Works perfectly with keyboard, screen readers, and reduced motion
5. **Mobile Optimized**: Touch targets and text sizing appropriate for all devices
