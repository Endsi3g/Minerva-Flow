# Verification report template

## Scope and identity

- Verified at (UTC):
- Branch:
- Working tree:
- Commit:
- Newest deployment URL / deployment id:
- Deployment commit match: PASS / FAIL / BLOCKED
- Session role / locale / viewport:

## Automated gates

| Gate | Command | Result | Evidence |
|---|---|---|---|
| Typecheck | `npx tsc --noEmit` | | |
| Unit/integration | `npm test -- --run` | | |
| Lint | `npm run lint` | | |
| Build | `npm run build` | | |

## Journey matrix

| Journey | Local | Deployment | Persistence/API proof | Screenshot/trace |
|---|---|---|---|---|
| Authentication/onboarding | | | | |
| Changed feature | | | | |
| Primary navigation | | | | |
| Mobile viewport | | | | |

## Visual review

Record the screenshot paths for desktop and mobile for each important route. Note severity for every issue:

- P0: unusable, data loss, security/payment failure;
- P1: critical path blocked or severe responsive/accessibility regression;
- P2: visible polish or secondary-flow issue;
- P3: cosmetic follow-up.

## Blockers and recommendation

- Known baseline failures:
- New regressions:
- Missing credentials/deployment/session:
- Migration/compliance blockers:
- Recommendation: READY / READY WITH CONDITIONS / NOT READY
