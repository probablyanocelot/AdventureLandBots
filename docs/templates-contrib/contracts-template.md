# Contracts Template

Location: `lib/contracts/`

Purpose:

- Define pure data contracts and boundary schemas.
- Keep implementation-free.

When contributing:

- Add a contract only for a new service boundary.
- Keep fields explicit.
- Do not add business logic.

Checklist:

- [ ] File under `lib/contracts/`
- [ ] No implementation logic
- [ ] Input/output fields documented
- [ ] Shared contract names used by producers/consumers
