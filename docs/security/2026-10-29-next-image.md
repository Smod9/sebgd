# Next.js and native image dependency review — October 29, 2026

## Result and scope

Prepared a local review branch for `Smod9/sebgd`. The affected committed dependency
versions are replaced, with focused source and production HTTP regressions passing.
Application source and authored content are unchanged. This is not a deployment or
a claim that the public site was exploitable or is now patched.

| Package | Main before this change | Review branch |
| --- | --- | --- |
| `next` | `16.3.0` | `16.4.3` |
| `eslint-config-next` | `16.3.0` | `16.4.3` |
| `sharp` (Next optional dependency) | `0.35.3` | `0.35.5` |
| `@img/sharp-*` binaries | `0.35.3` | `0.35.5` |
| `@img/sharp-libvips-*` binaries | `1.3.2` | `1.3.4` |
| `@swc/helpers` (Next dependency) | `0.5.15` | `0.5.23` |

Next's matching `@next/env`, SWC binaries and ESLint plugin move to `16.4.3`.
Official npm metadata and upstream advisory/release pages were refreshed on the
review date. `16.4.3` is the current stable maintained Next 16 release; its
`sharp: ^0.35.5` requirement supplies the fixed native stack without adding a new
direct dependency or override. The lockfile changes only this dependency closure;
unrelated npm-generated changes were removed and `npm ci` succeeded afterward.
The stdio MCP companion and unrelated development tools remain outside scope.

## Advisory qualification

| Advisory | Upstream fix | Applicability to this repository |
| --- | --- | --- |
| [GHSA-vcvr-r3jv-pc5j](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j), upstream [GHSA-wx4j-mvgx-mqwp](https://github.com/vercel/satori/security/advisories/GHSA-wx4j-mvgx-mqwp) | Next `16.3.6` | Affected Next version and Node `ImageResponse` usage confirmed. Attacker-controlled SVG content, attributes or styles were not found in either handler. |
| [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) / CVE-2026-96889 | Next `16.4.1`, sharp `0.35.5` | Affected lock versions confirmed. Image optimization is used; exploitation depends on untrusted image input and glibc/Linux runtime conditions that were not established for the live site. |
| [GHSA-wq5f-xc86-pv6w](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w) / CVE-2026-96889 | sharp `0.35.5`, librsvg `2.63.2` | Affected sharp version confirmed; fixed binary closure is locked. Live native libraries and platform were not inspected. |
| [GHSA-rgj7-g3m4-5g8c](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c), upstream CVE-2026-84383 and GHSA-2jg2-4ch7-h545 | sharp `0.35.4`, libheif `1.23.2` | Affected sharp version confirmed. The update includes the later fixed native stack; untrusted AVIF access and live runtime conditions remain unproven. |

### Input provenance and rendering

- `src/app/api/social-card/[slug]/route.tsx:10` uses the URL slug to select a
  stored project. The request object and its query parameters do not supply
  rendered content. `getShowcaseWork` (`src/lib/project-showcase.ts:32`) checks
  type, deletion and publication status. Design previews are development-only.
- `src/components/ProjectSocialCard.tsx:6` renders tags, title and description as
  text children outside the SVG. Styles are fixed except for a bounded font-size
  choice based on title length. The title can select one of two predefined SVG
  designs (`:2`, `:13`); shape coordinates, colors, paths and attributes come from
  fixed literals and arrays. Stored content does not become SVG markup or styles.
- `src/app/api/thought-social-card/[slug]/route.tsx:7` selects a stored thought
  and places its bounded body in a text `div`. Styles and branding are fixed,
  with three predefined font sizes chosen by text length. There is no supplied
  SVG tree or raw HTML. `src/lib/shared-thought.ts:4` checks type, deletion and
  publication; preview flags cannot reveal drafts in production.
- Content writes use the existing `assertAdmin` boundary in the admin post
  handlers. No anonymous content-write route was identified in this scoped trace.
  `next.config.ts` has no remote image allowlist or custom SVG enablement. The
  production regression verifies that an arbitrary remote SVG URL is rejected.

Confidence is high for affected versions on verified main and fixed versions in
this branch. The reviewed social-card data flow does not meet the advisory's
attacker-controlled SVG condition. This is a bounded source assessment, not proof
against every possible input or a review of the production hosting configuration.

## Validation

Environment: local macOS arm64, Node `22.22.0`, npm `10.9.4`. No verified cloud
executor was available, so tests ran locally without Docker. Database and Blob
configuration were cleared for application tests. HTTP servers bound only to
`127.0.0.1`; the new HTTP suite uses synthetic posts in a temporary content root.

| Check | Result |
| --- | --- |
| `npm ci --no-audit --no-fund` | Pass; reviewed lockfile installs reproducibly |
| `npm run lint` | Pass; changed tests also linted after adding HTTP coverage |
| `npx tsc --noEmit` | Pass |
| `DATABASE_URL='' NEXT_TELEMETRY_DISABLED=1 npm run build` | Blocked by Turbopack worker port creation: `Operation not permitted (os error 1)`, including permission retry |
| `DATABASE_URL='' NEXT_TELEMETRY_DISABLED=1 npm run build -- --webpack` | Pass; optimized production build, TypeScript and route generation complete |
| `node --test tests/work-page.test.mjs tests/static-storage.test.mjs tests/static-domain-routing.test.mjs` | 38/38 pass |
| `node --test tests/static-hosting.test.mjs` | 7/7 pass against the production build |
| `node --test tests/social-card-http.test.mjs` | 3/3 pass against the production build |
| `git diff --check` | Pass |

New source tests produce and decode 20 real 1200 × 630 PNGs across both handlers,
both fixed project SVG designs, quoted text, accents, line breaks, markup,
attribute-like values and CSS-like strings. They prohibit network requests from
rendered content and check that the SVG remains fixed. A local bundled WASM data
URL is allowed. Native regressions check SVG colors/dimensions and AVIF decoding.
These are harmless markup probes, not an RCE exploit demonstration.

New production HTTP tests verify four synthetic valid/hostile cards, byte-identical
output despite formatting query parameters, eight missing/type/privacy cases,
PNG-to-WebP resizing and arbitrary remote-image rejection. Existing route,
content/privacy and static-hosting regressions remain passing. Authored files are
not used as writable test fixtures.

Installed macOS binaries report sharp `0.35.5`, libvips `8.18.7`, librsvg `2.63.2`
and libheif `1.23.5`. Linux optional packages are present in the reviewed lockfile,
but glibc/Linux execution and native exploit conditions were not tested. Default
Turbopack validation still needs an environment that permits its worker port;
Webpack success does not establish a passing Turbopack build.

## Review handoff

- Repository: `git@github-smod9:Smod9/sebgd.git`.
- Worktree: `/Users/sebastiengouin-davis/.codex/worktrees/81d9/com.sebgd`.
- Branch: `codex/security-next-image-20261029`.
- Base: freshly fetched and remotely verified main
  `5d393305b742c5753a80c3efce6cfa649f45b1b0`.
- Existing work checked before edits: all local worktrees and branches, active
  chat inventory, GitHub open PRs, all remote branch heads and pull-request refs.
  GitHub exposed only `main`, no open PRs and no pull-request refs. Older local
  branches were checked for overlapping dependency changes; none contained this
  fix. Shared main was left untouched.
- GitHub API and strict-host-key SSH both resolved to `Smod9`. Effective local
  author/committer identity is Sebastien Gouin-Davis `<sebgd@icloud.com>`.
- Baseline finding: `SEBGD-FRAMEWORK`. Source chat:
  `01a18963-19e0-75af-9e56-0fdf39e0b02e`. No separate tracker issue or PR created.
- The requested software engineering skill was unavailable in the exposed
  catalog and local skill search. Repository Next.js guides, the available
  security-best-practices skill and upstream security records were used.
- Changes are committed locally for review. No merge, remote push, deployment,
  PR approval, credential/account change or live-deployment verification occurred.
  GitHub commit attribution remains unverified because no commit was published.

Upstream releases: [Next 16.4.3](https://github.com/vercel/next.js/releases/tag/v16.4.3),
[sharp 0.35.5](https://github.com/lovell/sharp/releases/tag/v0.35.5).
