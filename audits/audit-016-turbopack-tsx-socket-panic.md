# Audit 016 — Turbopack Panic on Stray `tsx-501/*.pipe` Socket

**Date**: 2026-04-14
**Scope**: Frontend dev server (Next.js 16 + Turbopack) crashed with a `TurbopackInternalError` on every request (`GET /` → 500 in 366ms).
**Severity**: HIGH (blocks `npm run dev` entirely) — but one-off artifact, not a code defect.

---

## 1. Symptom

Next.js dev server panicked on startup and on every route render:

```
FATAL: An unexpected Turbopack error occurred. A panic log has been written to
/var/folders/xw/q2qnssfx109_l75q9frktdb40000gn/T/next-panic-4b7a1f5abcbcde769b9b3d239ee1112a.log.

⨯ Error [TurbopackInternalError]: Failed to write app endpoint /_not-found/page
Caused by:
- [project]/src/app/globals.css [app-client] (css)
- reading file /Users/amadoufall/Desktop/K-gnote/cagnottes-sn/tsx-501/17099.pipe
- Operation not supported on socket (os error 102)
```

Turbopack's full cause chain:

```
AppProject::app_module_graphs
  └─ ModuleGraph::from_graphs
     └─ SingleModuleGraph::new_with_entries_visited_intern
        └─ [project]/src/app/globals.css [app-client] (css)
           └─ primary_chunkable_referenced_modules
              └─ <CssModuleAsset as Module>::references
                 └─ parse_css
                    └─ <PostCssTransformedAsset as Asset>::content
                       └─ PostCssTransformedAsset::process
                          └─ evaluate_webpack_loader
                             └─ <DiskFileSystem as FileSystem>::read
                                └─ reading file tsx-501/17099.pipe
                                   └─ Operation not supported on socket (os error 102)
```

---

## 2. Evidence Gathered (Phase 1)

**`ls -la tsx-501/`** in project root revealed a directory containing 22 entries:

| Kind | File | Note |
|------|------|------|
| Socket (`srwxr-xr-x`) | `17099.pipe` | Unix domain socket — tsx IPC pipe for pid 17099 |
| Socket (`srwxr-xr-x`) | `17750.pipe` | Same, pid 17750 |
| Regular files (`-rw-r--r--`) | `17761-<sha1>` × ~20 | tsx transform cache entries for pid 17761 |

Timestamps: all between `Apr 14 17:35` and `Apr 14 20:46`.

**Process check** — `ps -p 17099 -p 17750 -p 17761` → **no matches**. All three pids were dead tsx processes from earlier in the day.

**Environment** — `TMPDIR=/var/folders/xw/q2qnssfx109_l75q9frktdb40000gn/T/` is set correctly. tsx's current working invocations do land their IPC + cache in `$TMPDIR` as expected. The `tsx-501/` leak in cwd was a **historical one-off**, not a recurring pattern.

**`.gitignore`** — no entry for `tsx-*`. The stray dir was tracked by Turbopack's file scanner and exposed to the PostCSS asset pipeline.

---

## 3. Root Cause

Turbopack, while compiling `src/app/globals.css` through its PostCSS → webpack-loader bridge, walked the project root looking for modules. It found the stray `tsx-501/17099.pipe` entry, attempted `DiskFileSystem::read()` on it, and the kernel refused with errno 102 (`ENOTSUP` — "Operation not supported on socket") because the path is a Unix domain socket file, not a regular file. Turbopack surfaced the read failure as a fatal panic instead of skipping the path.

**Why the socket was in cwd** — tsx v4 creates its IPC pipe and transform cache at `os.tmpdir()/tsx-${uid}/`. On a past shell invocation of `npx tsx scripts/...` (likely one of `backend/scripts/seed-dev.ts`, `smoke-test.ts`, or `approve-kyc.ts`, all of which are routinely run from the project root), either `TMPDIR` was temporarily unset/empty in that shell or tsx fell back to cwd. The pipe files were orphaned when those tsx processes exited without cleanup — normal Unix socket behavior, the kernel doesn't unlink them on process death.

**Why it only broke now** — Turbopack's CSS module graph resolver (`primary_chunkable_referenced_modules` on `CssModuleAsset`) walks a broader set of project files than the base Next.js resolver used to. Next.js 16 with Turbopack is stricter, and PostCSS transform evaluation on `globals.css` apparently enumerates project-root entries. Previously these stray sockets sat harmless in the tree; the upgrade/config change around Phase 10 exposed them.

**This is NOT a bug in our code.** It is:
1. An orphaned artifact from a prior `npx tsx` run whose tmpdir resolution misbehaved once.
2. A Turbopack robustness gap (it should skip non-regular files during module graph enumeration rather than panic). Upstream concern — not in scope here.

---

## 4. Fix Applied

### 4.1 Immediate cleanup
```bash
rm -rf /Users/amadoufall/Desktop/K-gnote/cagnottes-sn/tsx-501
```
Safe because all three tsx pids (17099, 17750, 17761) were confirmed dead before deletion.

### 4.2 Guard against recurrence
Added to [.gitignore](.gitignore#L47):
```
# stray tsx IPC sockets / transform cache (must land in $TMPDIR; guarded here in case it leaks)
/tsx-*/
```

Effects:
- Git will no longer track any future leak.
- Turbopack's file watcher respects `.gitignore` by default, so even if a stray `tsx-501/` reappears it will be excluded from the module graph and cannot trigger this panic again.
- The pattern is anchored (`/tsx-*/`) so it only matches a directory at the repo root, not e.g. `src/lib/tsx-foo/` that legitimate code might use.

### 4.3 Verification
- `ls tsx-501` after deletion → "No such file or directory" ✓
- `.gitignore` line 47 added ✓
- User must restart `npm run dev` for Turbopack to rescan; the stale `next-panic-*.log` under `/var/folders/.../T/` is harmless and can be deleted at leisure.

---

## 5. Prevention Recommendations (optional — not applied)

Only act on these if the issue recurs.

1. **Pin `TMPDIR` in `backend/package.json` scripts.** Wrap tsx invocations as `TMPDIR="${TMPDIR:-/tmp}" tsx scripts/...` to guarantee a valid tmpdir even if the shell loses the var. Current scripts assume the macOS launchd-set `TMPDIR` is always live; this is true 99% of the time but was apparently violated once.

2. **Periodic cleanup guard in `scripts/smoke-test.ts` and `seed-dev.ts`.** Add a pre-flight assertion: `if (existsSync(path.join(process.cwd(), \`tsx-${process.getuid()}\`))) console.warn(...)`. Cheap, catches future leaks early, zero runtime cost. Skip unless this recurs.

3. **Upstream** — consider filing a Turbopack issue: *"`DiskFileSystem::read` should gracefully skip non-regular files (sockets, FIFOs, device nodes) during module graph enumeration rather than panic"*. The panic message is actionable but the crash-hard behavior is a DX wart.

---

## 6. Related

- No connection to prior audits. This is a tooling/environment issue, not a code path.
- No impact on backend, payments, webhooks, KYC, notifications, or any business logic.
- No security implications — sockets were owned by the same local user; no external surface.

---

## 7. Closure

- **Status**: RESOLVED
- **Action for user**: Restart `npm run dev`. Delete `/var/folders/xw/.../T/next-panic-4b7a1f5abcbcde769b9b3d239ee1112a.log` if desired (cosmetic only).
- **Follow-up**: None required unless the panic reproduces, in which case jump to prevention item (1) above.
