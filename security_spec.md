# Firestore Security Specification (Alpha Decor & Paints)

## 1. Data Invariants
1. **Default-Deny Catch-All:** Any collection or document not explicitly matched under `/databases/{database}/documents` is rejected for all reads and writes.
2. **Published-Only Public Reads:** Unauthenticated visitors can `get` or `list` `/articles/{articleId}` documents **only** when `resource.data.status == 'published'`. Draft articles are never readable via public Firestore queries.
3. **Write-Only Owner Gate (`adminSessions/gate`):** Owner write proof hashes are never readable (`allow read, delete: if false`). Only the exact SHA-256 preimage of the server-verified owner hash paired with `ts == request.time` is accepted atomically via `getAfter()` inside a batched write.
4. **Tiered Article Updates:** Public visitors on `/articles/{articleId}` can only mutate `likes` (+1) and `updatedAt == request.time` on already-published articles. Full article creation, editing, and deletion require a valid atomic owner gate.
5. **Subcollection Master Gate (`/articles/{articleId}/comments/{commentId}`):** Comments cannot be created on non-existent or draft articles (`exists()` + `get()` parent `status == 'published'`), must enforce `createdAt == request.time`, `isPublic == true`, `articleId == articleId`, `likes == 0`, and cannot be edited or deleted without the owner gate.
6. **Site Public Settings Isolation (`/siteSettings/public`):** Only document ID `'public'` may be fetched (`allow list: if false`), and writes require `hasValidOwnerGate()` plus strict key and type validation.

## 2. The "Dirty Dozen" Attack Payloads (All MUST Return PERMISSION_DENIED)
1. **Shadow Field Injection on Article Create:** Creating an article with valid fields plus an undeclared `isAdminVerified: true` field.
2. **Forged Owner Proof in `adminSessions/gate`:** Writing `{ proof: "<64 random hex chars>", ts: serverTimestamp() }` with a wrong SHA-256 proof.
3. **Reading `adminSessions/gate`:** Calling `getDoc` or `getDocs` on `/adminSessions/gate` to harvest proof state.
4. **Timestamp Replay Attack on `adminSessions/gate`:** Writing valid proof with a client-supplied `ts` instead of `request.time`.
5. **Unfiltered `list` Query on `/articles` (Draft Leak):** Querying `collection(db, 'articles')` without `where('status', '==', 'published')`.
6. **ID Poisoning on `/articles/{articleId}`:** Creating an article with a 200-character or slash-containing document ID (`a/../b` or length > 128).
7. **Unauthorized Article Content Modification by Visitor:** Updating `title` or `content` on a published article without an atomic `adminSessions/gate` write.
8. **Like Count Manipulation (Inflation / Negative):** Updating `likes` on an article by `+500` or `-1` instead of `existing().likes + 1`.
9. **Shadow / Type Poisoning in `likes` Update:** Updating `likes` with a string `"100"` or missing `updatedAt == request.time`.
10. **Orphan / Draft Comment Injection:** Creating a comment under `/articles/nonexistent-id/comments/c1` or under a draft article.
11. **Public Comment Tampering / Deletion:** Updating or deleting an existing comment under `/articles/{id}/comments/{commentId}` without the owner gate.
12. **Resource Exhaustion / Shadow Key on `/siteSettings/public`:** Writing `siteSettings/public` without valid owner gate or with oversized strings (> limit) or arbitrary doc ID `/siteSettings/privateSecrets`.
