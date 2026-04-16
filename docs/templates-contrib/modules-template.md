# Modules Template

Location: `lib/modules/`

Purpose:

- Provide thin adapters or integration glue.
- Depend on services, not own feature behavior.

When contributing:

- Delegate logic to services.
- Keep modules small and focused on runtime wiring.

Checklist:

- [ ] Depends only on service public exports
- [ ] No business logic in module
- [ ] Modules stay as bridges
- [ ] Runtime hooks remain centralized here
