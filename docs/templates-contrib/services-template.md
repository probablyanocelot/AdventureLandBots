# Services Template

Location: `lib/services/<feature>/`

Purpose:

- Own feature behavior.
- Expose public API through `index.js`.

When contributing:

- Keep service focused on one responsibility.
- Use `index.js` as the public port.
- Import only contracts from `lib/contracts/`.

Checklist:

- [ ] Public `setup()` / `teardown()` exported
- [ ] Feature logic owned by service
- [ ] No sibling service internals imported
- [ ] Setup/teardown are symmetric
