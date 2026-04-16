# Runtime Template

Location: `lib/bootstrap/index.js`, `lib/al_main.js`, root startup files

Purpose:

- Bootstrap the application.
- Wire services and modules.
- Keep runtime thin.

When contributing:

- Add behavior only when bootstrap-specific.
- Do not implement feature logic here.
- Instantiate services and pass config.

Checklist:

- [ ] Startup only wires components
- [ ] No feature logic
- [ ] `main()` remains exported
- [ ] Loader-safe initialization
