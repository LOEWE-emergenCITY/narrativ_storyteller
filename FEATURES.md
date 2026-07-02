# Feature List — .yarn File Format Support

Last updated: 2026-06-30

---

## Progress Snapshot

Scoring:

- Done = 1
- Partial = 0.5
- Not implemented = 0

- Step 1 / MVP progress: 81% done, 19% remaining
- Complete package progress: 56% done, 44% remaining

Assumptions:

- Step 1 / MVP progress tracks core gameplay only.
- Complete package progress tracks all sections below, including session state,
  product UI, legal pages, testing, and CI/CD.

---

## Parsing (`utils/storyParser.ts`)

| Feature                                                                  | Status          |
| ------------------------------------------------------------------------ | --------------- |
| Read `.yarn` file from disk                                              | Done            |
| Parse block headers (`title:`, `group:`, `tags:`, `position:`, `color:`) | Done            |
| Parse `<<declare>>` variables                                            | Done            |
| Parse `<<set …>>`                                                        | Done            |
| Parse `<<if>>` / `<<elseif>>` / `<<else>>` / `<<endif>>`                 | Done            |
| Parse `<<once>>` / `<<endonce>>`                                         | Done            |
| Parse inline `<<once>>` suffix                                           | Done            |
| Parse `<<jump …>>`                                                       | Done            |
| Parse `<<detour …>>`                                                     | Done            |
| Parse `<<Mood …>>`                                                       | Done            |
| Parse `<<Scene …>>`                                                      | Done            |
| Parse `<<GatherScienceFact …>>`                                          | Done            |
| Parse `-> choice` lines                                                  | Done            |
| Parse `Speaker: text` chat lines                                         | Done            |
| Parse plain text lines                                                   | Done            |
| Parse inline `<<if>>` inside text                                        | Not implemented |

---

## Runtime Interpretation

| Feature                                                     | Status                         |
| ----------------------------------------------------------- | ------------------------------ |
| Condition evaluation (`<<if>>` / `<<elseif>>` / `<<else>>`) | Done                           |
| Condition evaluation (inline `<<if>>`)                      | Not implemented                |
| Variable side effects (`<<set>>`)                           | Done                           |
| update variables within buttons / choices (`<<set>>`)       | Not implemented                |
| Block navigation (`<<jump>>`)                               | Done                           |
| Pause on choices until explicit user selection              | Partial                        |
| `<<detour>>` — returnable jump with return stack            | Not implemented                |
| `<<once>>` / `<<endonce>>` — hide content after first visit | Done                           |
| Inline `<<once>>` gating                                    | Done                           |
| `<<GatherScienceFact>>` runtime side effect                 | Done - renders badge/link only |
| `<<Scene>>` — trigger scene change                          | Not implemented                |

---

## Rendering

| Feature                                        | Status                           |
| ---------------------------------------------- | -------------------------------- |
| Plain text with `<i>`, `<b>`, `<br>`           | Done                             |
| Variable interpolation in text (`{$var}`)      | Done                             |
| Chat bubbles (`Speaker: text`)                 | Done                             |
| Choice buttons (`->`)                          | Done                             |
| Jump buttons                                   | Done                             |
| Continue after choice into the selected branch | Partial                          |
| Mood images (`<<Mood …>>`)                     | Done                             |
| `<<detour>>` button + return navigation        | Not implemented                  |
| `<<once>>` content gating                      | Done                             |
| `<<GatherScienceFact>>` component              | Done                             |
| `<<Scene>>` component                          | Partial - debug placeholder only |
| Historical block rendering                     | Done                             |
| Selected choice transcript in history          | Done                             |
| Localization                                   | Not implemented                  |
| Dark Mode                                      | Not implemented                  |

---

## State Management (`utils/storyStore.ts`)

| Feature                               | Status          |
| ------------------------------------- | --------------- |
| Track visited blocks                  | Done            |
| Live variable state                   | Done            |
| Block navigation                      | Done            |
| Choice path tracking                  | Done            |
| Once visibility tracking              | Done            |
| Block history snapshots               | Done            |
| Detour return stack                   | Not implemented |
| Active scene state                    | Not implemented |
| Science fact catalog loaded           | Done            |
| Browser session restore on load       | Not implemented |
| Browser session auto-save             | Not implemented |
| Restart story and clear saved session | Not implemented |

---

## Product UI / Site Shell

| Feature                      | Status          |
| ---------------------------- | --------------- |
| Shared header                | Not implemented |
| Shared footer                | Not implemented |
| Impressum page               | Not implemented |
| Data security / privacy page | Not implemented |
| Logos / branding             | Not implemented |

---

## Testing

| Feature / Area                      | Status                              |
| ----------------------------------- | ----------------------------------- |
| Test runner available (`deno test`) | Done                                |
| Existing automated tests            | Partial - only `utils/once.test.ts` |
| Parser test coverage                | Partial                             |
| Condition evaluation tests          | Not implemented                     |
| `<<set>>` evaluation tests          | Not implemented                     |
| `<<jump>>` / choice flow tests      | Not implemented                     |
| `<<detour>>` flow tests             | Not implemented                     |
| `<<Scene>>` rendering/runtime tests | Not implemented                     |
| Component rendering tests           | Not implemented                     |
| End-to-end story flow tests         | Not implemented                     |

---

## Tooling / Quality Gates

| Feature / Area                           | Status                                   |
| ---------------------------------------- | ---------------------------------------- |
| Format command (`deno fmt --check .`)    | Done via `deno task check`               |
| Lint command (`deno lint .`)             | Done via `deno task check`               |
| Type check (`deno check`)                | Done via `deno task check`               |
| Production build (`deno task build`)     | Done                                     |
| Production start (`deno task start`)     | Done                                     |
| CI workflow                              | Not implemented                          |
| PR validation pipeline                   | Not implemented                          |
| Coverage reporting                       | Not implemented                          |
| Pre-commit hooks                         | Not implemented                          |
| Deployment documentation                 | Not implemented                          |
| README project setup / ops documentation | Partial - still mostly Fresh boilerplate |

---

## Deployment / CI/CD

| Feature / Area                            | Status          |
| ----------------------------------------- | --------------- |
| App can be built locally                  | Done            |
| App can be started locally                | Done            |
| Hosting target selected                   | Not implemented |
| Deployment config committed               | Not implemented |
| CI on push / pull request                 | Not implemented |
| CD on merge to main                       | Not implemented |
| Secrets / environment strategy documented | Not implemented |
| Health check / smoke check after deploy   | Not implemented |

---

## Implementation Roadmap

### Step 1: Basic Gameplay

1. Adjust choice and continue-button flow. When a choice is presented, story
   progression must pause until the user selects one option. After selection,
   continue with the next visible line or action from that branch.
2. Implement `<<detour>>` end-to-end.
3. Implement a minimal `<<Scene>>` behavior beyond the current debug
   placeholder.
4. Manually verify key story branches to catch broken transitions or dead ends.

### Step 2: Product UI And Session State Management

1. Add browser session restore on load.
2. Add browser session auto-save after progress changes.
3. Add restart behavior that clears saved browser state and returns to `Start`.
4. Add a shared header and footer.
5. Add Impressum and data security / privacy pages.
6. Add logos and branding.
7. Improve the reader UI for clearer hierarchy and better mobile behavior.
8. Add a localization foundation for static UI copy and legal content.

### Step 3: Quality, Testing, CI/CD

1. Add automated tests for conditions, `<<set>>`, choices, jumps, once-gating,
   detours, scenes, and session state management.
2. Add CI to run `deno task check`, `deno test -A`, and `deno task build`.
3. Choose a deployment target and commit provider-specific deployment
   configuration.
4. Replace the boilerplate `README.md` with project-specific setup, testing,
   build, and deployment instructions.

---

## Suggested CI Pipeline

1. Install Deno and cache dependencies.
2. Run `deno task check`.
3. Run `deno test -A`.
4. Run `deno task build`.
5. Add optional artifact/log upload for failed builds.

---

## Suggested Deployment Steps

1. Pick the hosting target.
2. Use `deno task start` as the production entrypoint.
3. Add provider-specific deployment configuration.
4. Document required secrets and environment variables.
5. Configure automatic deploys from the main branch.
6. Add a post-deploy smoke test for `/story`.
