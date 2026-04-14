# Maintainability TODO (April 2026)

## Priority 0 (High Impact, Low-Medium Effort)

- [ ] Make lint pass on core runtime/services first
  - Focus on `lib/services/**` and `lib/runtime/**`.
  - Defer legacy/UI (`lib/gui`, `lib/unused`) behind explicit ignore or a scoped cleanup plan.
- [ ] Add minimal CI
  - On PR: install → lint → requires check.
- [ ] Add smoke tests
  - Even 5–10 boundary tests for module install/disposal and core service contracts.

## Priority 1 (Medium Effort)

- [ ] Split top hotspot files
  - Break up `lib/services/combat/hunt_runner.js` (strategy selection, movement, safety, engage phases).
  - Treat `lib/gui/46BankOverview.46.js` as legacy bundle candidate; isolate source and build artifact.
- [ ] Standardize service surface
  - Ensure every service has both `index.js` and `README.md`.

## Priority 2 (Process Hardening)

- [ ] Add contributor ergonomics
  - `CONTRIBUTING.md`, `.editorconfig`, `.env.example`, optional pre-commit lint hook.
- [ ] Track maintainability KPI trend
  - Lint issues, max file LOC, and service coverage in CI summary.

---

## Evidence & Context

- Strong architecture, service-first boundaries, and documentation.
- Lint debt: 57 issues (mainly in `lib/gui`, `lib/services`, `lib/unused`).
- No tests or CI detected.
- Large files: `46BankOverview.46.js` (3119 LOC, 21 lint issues), `hunt_runner.js` (1375 LOC).
- Some service dirs missing `README.md` or `index.js`.
- No contributor/formatting configs found.

See full audit for rationale and details.
