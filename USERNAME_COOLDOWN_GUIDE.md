# Username Cooldown Feature

## What This Does

Users can only change their username once every 24 hours. This prevents:
- Username squatting/camping
- Impersonation attempts
- Confusion from rapidly changing identities
- Abuse of the username system

## How It Works

```
User Timeline:
│
├─ Monday 2:00 PM
│  └─ Changes username from "alice" → "alice_smith" ✅
│     (username_changed_at = Monday 2:00 PM)
│
├─ Monday 5:00 PM (3 hours later)
│  └─ Tries to change username → "alice_designs" ❌
│     Error: "Try again in 21 hours"
│     UI shows: "🔒 21h cooldown"
│
├─ Tuesday 2:00 PM (24 hours later)
│  └─ Changes username → "alice_designs" ✅
│     (username_changed_at = Tuesday 2:00 PM)
│
└─ (24 hour cycle repeats)
```

## User Experience

### ✅ What Users CAN Do Anytime:
- Change display name (unlimited)
- Change bio (unlimited)
- Change avatar (unlimited)
- View their profile
- Post photos

### ⏱️ What Has Cooldown:
- Change username (once per 24 hours)

### Visual Feedback:

#### Before Cooldown Expires:
```
Username (used in @handle)    🔒 5h cooldown
┌─────────────────────────────────────────┐
│ alice_smith                             │
└─────────────────────────────────────────┘
```

#### If User Tries Too Soon:
```
❌ You can only change your username once every 24 hours. 
   Try again in 5 hours (Oct 3, 2025, 2:30 PM).
```

#### After Cooldown Expires:
```
Username (used in @handle)
┌─────────────────────────────────────────┐
│ alice_designs                           │
└─────────────────────────────────────────┘
✅ Can change freely!
```

## Technical Details

### Database:
- New column: `users.username_changed_at` (TIMESTAMPTZ)
- Indexed for fast lookups
- NULL = never changed (no cooldown on first change)

### Enforcement:
- Server-side validation in `updateCurrentUser()`
- Cannot be bypassed from client
- Checks actual username change (not just form submission)

### Error Messages:
- Shows exact hours remaining
- Shows next available time
- Friendly and informative

## FAQ

**Q: What if I need to change my username urgently?**
A: Contact support. The database can be manually updated if needed.

**Q: Does this affect my first username change?**
A: No! First change is free. Cooldown only applies to subsequent changes.

**Q: Can I change other profile info?**
A: Yes! Only username has a cooldown. Change your display name, bio, and avatar anytime.

**Q: What if I misspell my username?**
A: Unfortunately, you'll need to wait 24 hours. Choose carefully!

**Q: Is this enforced client-side only?**
A: No, it's enforced in the database. Cannot be bypassed.
