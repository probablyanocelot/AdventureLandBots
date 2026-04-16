# External Tie-ins Template

Location: `local-code-server/`, `telegram/`, `agentic/`, etc.

Purpose:

- Implement external integrations.
- Keep separate from core bot/game logic.

When contributing:

- Isolate external code by folder.
- Consume core services rather than duplicate logic.
- Keep secrets/config outside the repo.

Checklist:

- [ ] Integration code isolated
- [ ] No core duplication
- [ ] Secrets never committed
- [ ] Environment/config documented
