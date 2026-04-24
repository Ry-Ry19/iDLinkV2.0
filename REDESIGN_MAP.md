# REDESIGN_MAP.md

## Pages Overview

This document maps each page to its current API fetch pattern and explains how to transition it to Supabase.

---

## 1. ApplyForID.tsx

**Current Behavior:** Likely POSTs form data to a local backend endpoint (`/api/apply`).

**Learner's Note:**
- Replace `fetch('/api/apply', { method: 'POST', body: ... })` with Supabase insert
- Example: `await supabase.from('applications').insert({ ...formData })`
- Supabase automatically handles timestamps (`created_at`, `updated_at`)
- Consider adding a type definition for the application row

---

## 2. ContractExpiration.tsx

**Current Behavior:** Likely fetches contract/expiry data from an endpoint like `/api/contracts`.

**Learner's Note:**
- Replace `fetch('/api/contracts')` with `supabase.from('contracts').select('*')`
- Add `.eq('user_id', userId)` to filter for the current user's contracts
- Use `.order('expiry_date')` to sort by expiration

---

## 3. EmployeeDashboard.tsx

**Current Behavior:** Probably fetches employee-specific data and statistics.

**Learner's Note:**
- Dashboard queries often combine multiple tables
- Convert sequential fetches to parallel queries with `Promise.all` or Supabase JOINs
- Example: `supabase.from('employees').select('*, department(*)')`

---

## 4. Index.tsx

**Current Behavior:** Likely redirects based on auth state or shows a loading screen.

**Learner's Note:**
- Auth state is now handled by `supabase.auth.getSession()`
- Replace localstorage token checks with Supabase session management
- Use `supabase.auth.onAuthStateChange()` for reactive auth updates

---

## 5. Landing.tsx

**Current Behavior:** Public page, may fetch featured content or announcements.

**Learner's Note:**
- Convert to `supabase.from('announcements').select('*').eq('active', true)`
- Consider adding `.limit(5)` for performance
- This page likely needs no authentication

---

## 6. Login.tsx

**Current Behavior:** POSTs credentials to `/api/login`, stores token in localStorage.

**Learner's Note:**
- Replace with `supabase.auth.signInWithPassword({ email, password })`
- Supabase handles session storage automatically
- Store user profile info in `supabase.auth.getUser()` after login
- Remove manual token storage - Supabase client handles it

---

## 7. NotFound.tsx

**Current Behavior:** Static 404 page.

**Learner's Note:**
- No API changes needed
- This is a pure UI component

---

## 8. RecordsManagement.tsx

**Current Behavior:** Likely fetches records list with pagination from `/api/records`.

**Learner's Note:**
- Replace with `supabase.from('records').select('*', { count: 'exact' })`
- Use `.range(offset, offset + limit)` for pagination
- Supabase returns `count` in the response for total records
- Add `.eq('archive', false)` to filter active records

---

## 9. Register.tsx

**Current Behavior:** POSTs new user data to `/api/register`.

**Learner's Note:**
- Use `supabase.auth.signUp({ email, password, options: { data: { ...profile } } })`
- Profile data goes in `options.data` - this creates the auth user
- Then insert additional profile data to `profiles` table
- Consider using database triggers to auto-create profile on signup

---

## 10. RevalidateID.tsx

**Current Behavior:** Likely POSTs revalidation request to `/api/revalidate`.

**Learner's Note:**
- Convert to `supabase.from('revalidations').insert({ ... })`
- Link to the original ID record with `.eq('id_link_id', originalId)`
- Use `.select()` to return the new record for confirmation

---

## 11. ReviewApplication.tsx

**Current Behavior:** Staff endpoint to approve/reject applications (`/api/review/:id`).

**Learner's Note:**
- Convert PATCH/PUT to `supabase.from('applications').update({ status: 'approved' }).eq('id', appId)`
- Add `.select()` to return updated record
- Consider adding `reviewed_by` and `reviewed_at` fields
- Use `supabase.rpc('batch_review')` for bulk operations

---

## 12. StaffDashboard.tsx

**Current Behavior:** Staff overview with pending counts, recent activity.

**Learner's Note:**
- Use `supabase.from('applications').select('*', { count: 'exact' }).eq('status', 'pending')` for pending count
- Combine multiple stats with `Promise.all([
  supabase.from('applications').select('*', { count: 'exact' }).eq('status', 'pending'),
  supabase.from('applications').select('*').order('created_at').limit(5)
])`

---

## 13. StudentDashboard.tsx

**Current Behavior:** Student view of their own IDs and applications.

**Learner's Note:**
- Replace with `supabase.from('id_links').select('*').eq('owner_id', currentUserId)`
- Add `.eq('status', 'active')` for currently valid IDs
- Use `.order('created_at', { ascending: false })` for recent first

---

## 14. Team.tsx

**Current Behavior:** Static content displaying team members.

**Learner's Note:**
- Could store team members in Supabase `team_members` table
- Use `supabase.from('team_members').select('*').order('order')`
- Makes updates possible without code changes

---

## 15. TrackStatus.tsx

**Current Behavior:** Public endpoint to track application by ID/token.

**Learner's Note:**
- Replace with `supabase.from('applications').select('*').eq('tracking_code', trackingCode)`
- Add `.single()` since tracking codes should be unique
- Handle not-found case with `.then(({ error }) => ...)` pattern

---

## Migration General Tips

1. **Types:** Create a `types.ts` file in `src/lib/` with interfaces for each table
2. **Auth Wrapper:** Create a `AuthContext` provider that wraps `<SessionContext>` from Supabase
3. **Loading States:** Supabase returns promises - use React Query or `useEffect` with state for loading
4. **Error Handling:** Wrap queries in try/catch and use `error.message` for user feedback
5. **RLS Policies:** Set up Row Level Security in Supabase dashboard - client-side queries respect these