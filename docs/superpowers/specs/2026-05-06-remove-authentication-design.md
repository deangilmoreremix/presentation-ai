# Remove Authentication - Design

## Overview
Remove all authentication checks and calls from the presentation-ai codebase while preserving Supabase database functionality. All users will operate as a single anonymous user.

## Current State
- Authentication is implemented via Supabase
- `auth()` function returns user session
- 50+ auth() calls across API routes, server actions, and utilities
- Database operations require userId for ownership

## Proposed Approaches

### Approach 1: Direct Anonymous User Replacement
Replace all `const session = await auth();` with `const session = ANONYMOUS_SESSION;` where ANONYMOUS_SESSION is a constant object.

**Pros:**
- Simplest implementation
- No async calls
- Clear intent

**Cons:**
- Repetitive across many files
- Session object structure must be consistent

### Approach 2: Anonymous Auth Helper
Create `getAnonymousSession()` function that returns the session without async.

**Pros:**
- Centralized logic
- Easy to change session structure later

**Cons:**
- Still requires function calls
- Slight overhead

### Approach 3: Global Anonymous User
Use a global constant for the user object and assign directly where needed.

**Pros:**
- Most direct
- No session object overhead

**Cons:**
- Inconsistent with existing code patterns

## Recommendation: Approach 1
Direct replacement provides the cleanest removal of authentication while maintaining code structure.

## Implementation Details

### Anonymous User Setup
```typescript
const ANONYMOUS_USER = {
  id: "anonymous-user",
  email: null,
  name: "Anonymous User",
  image: null,
  isAdmin: false,
};

const ANONYMOUS_SESSION = {
  user: ANONYMOUS_USER,
  expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
};
```

### Files to Update
- All API routes in `/api/presentation/*`
- All server actions in `/_actions/presentation/*`, `/_actions/image/*`, `/_actions/apps/*`
- UploadThing middleware
- Share authorization
- Any components checking authentication

### Database Considerations
- Anonymous user will be created on first access
- All presentations/images will be owned by anonymous user
- No access control - everything is public

### Testing
- Verify presentations can be created/saved
- Verify images can be generated
- Verify database queries work with anonymous userId
- Verify no auth redirects or UI elements remain