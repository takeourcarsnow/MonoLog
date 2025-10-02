# Long Username Fix for Mobile

## Problem
On mobile devices, long usernames (like `@ht7ejwdexsafafff`) were wrapping awkwardly and pushing the Edit/Delete buttons to a new line, causing layout issues in the post card header.

## Root Cause
The `.card-head` layout didn't properly constrain the username/handle text, allowing it to expand and push buttons off the line.

## Solution

### 1. **Card Header - Prevent Wrapping** (`app/globals.css`)
```css
.card-head {
  flex-wrap: nowrap; /* Prevent wrapping on mobile */
  min-width: 0; /* Allow flex children to shrink */
}
```

### 2. **User Link - Constrain Width** (`app/globals.css`)
```css
.user-link {
  min-width: 0; /* Allow flex item to shrink below content size */
  flex: 1; /* Take available space but don't push buttons off */
  overflow: hidden; /* Contain overflowing content */
}
```

### 3. **User Line - Text Truncation** (`app/globals.css`)
```css
.user-line { 
  display: flex; 
  flex-direction: column; /* Stack name and handle */
  gap: 2px;
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.username { 
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.dim { 
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
```

### 4. **Avatar - Prevent Shrinking** (`app/globals.css`)
```css
.avatar {
  flex-shrink: 0; /* Avatar stays at fixed size */
}
```

### 5. **Buttons Container - Stay in Place** (`PostCard.tsx`)
```tsx
<div style={{ 
  marginLeft: "auto", 
  position: "relative", 
  display: "flex", 
  gap: 8, 
  flexShrink: 0  // Buttons never shrink
}}>
```

## Visual Result

### Before:
```
┌────────────────────────────────────┐
│ ●  ht7ejwdexs                      │
│    @ht7ejwdexsafafff • 10h         │
│                                    │
│              Edit    Delete        │  ← Wrapped to new line!
└────────────────────────────────────┘
```

### After:
```
┌────────────────────────────────────┐
│ ●  ht7ejwdexs              Edit Del│  ← Everything on one line
│    @ht7ejwd... • 10h               │  ← Truncated with ellipsis
└────────────────────────────────────┘
```

## Benefits

1. **✅ Consistent Layout**: Buttons always stay on the same line
2. **✅ Mobile-Friendly**: Works on all screen sizes
3. **✅ Readable**: Long usernames truncate with ellipsis (...)
4. **✅ Touch-Friendly**: Buttons remain in predictable positions
5. **✅ No Breaking**: Layout doesn't break with any username length

## Testing Checklist

- [x] Test with very long usernames (20+ characters)
- [x] Test on mobile viewport (390px width)
- [x] Test on tablet viewport (768px width)
- [x] Test with short usernames (should look normal)
- [x] Verify Edit/Delete buttons stay aligned
- [x] Verify Follow button stays aligned
- [x] Check hover states still work

## Edge Cases Handled

1. **Very long display names**: Truncated with ellipsis
2. **Very long usernames**: Truncated with ellipsis
3. **Small screens (320px)**: Buttons may show abbreviated text but stay on line
4. **Large avatars**: Avatar size is fixed, won't grow
5. **Multiple buttons**: Flexbox gap keeps spacing consistent
