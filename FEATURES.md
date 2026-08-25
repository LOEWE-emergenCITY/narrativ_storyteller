# Feature List — .yarn File Format Support

Last updated: 2026-07-15

---

## Progress Snapshot

Scoring:

- Done = 1
- Partial = 0.5
- Not implemented = 0

- Step 1 / MVP progress: 98% done, 2% remaining
- Complete package progress: 77% done, 23% remaining

Assumptions:

- Step 1 / MVP progress tracks core gameplay only.
- Complete package progress tracks all sections below, including session state,
  product UI, legal pages, testing, and CI/CD.

---

## Parsing (`utils/storyParser.ts`)

| Feature                                                                  | Status |
| ------------------------------------------------------------------------ | ------ |
| Read `.yarn` file from disk                                              | Done   |
| Parse block headers (`title:`, `group:`, `tags:`, `position:`, `color:`) | Done   |
| Parse `<<declare>>` variables                                            | Done   |
| Parse `<<set …>>`                                                        | Done   |
| Parse `<<if>>` / `<<elseif>>` / `<<else>>` / `<<endif>>`                 | Done   |
| Parse `<<once>>` / `<<endonce>>`                                         | Done   |
| Parse inline `<<once>>` suffix                                           | Done   |
| Parse `<<jump …>>`                                                       | Done   |
| Parse `<<detour …>>`                                                     | Done   |
| Parse `<<Mood …>>`                                                       | Done   |
| Parse `<<Scene …>>`                                                      | Done   |
| Parse `<<GatherScienceFact …>>`                                          | Done   |
| Parse `-> choice` lines                                                  | Done   |
| Parse `=> randomChoice` line groups                                      | Done   |
| Parse `Speaker: text` chat lines                                         | Done   |
| Parse plain text lines                                                   | Done   |
| Parse inline `<<if>>` inside text                                        | Done   |

---

## Runtime Interpretation

| Feature                                                     | Status |
| ----------------------------------------------------------- | ------ |
| Condition evaluation (`<<if>>` / `<<elseif>>` / `<<else>>`) | Done   |
| Condition evaluation (inline choice `<<if>>`)               | Done   |
| Variable side effects (`<<set>>`)                           | Done   |
| update variables within buttons / choices (`<<set>>`)       | Done   |
| Block navigation (`<<jump>>`)                               | Done   |
| Pause on choices until explicit user selection              | Done   |
| `<<detour>>` — returnable jump with return stack            | Done   |
| `<<once>>` / `<<endonce>>` — hide content after first visit | Done   |
| Inline `<<once>>` gating                                    | Done   |
| `<<GatherScienceFact>>` - show external link badge          | Done   |
| `<<Scene>>` — show scene image                              | Done   |
| `=> randomChoice` — pick one line per group                 | Done   |
| Persist random choices within active/history snapshots      | Done   |

---

## Rendering

| Feature                                        | Status          |
| ---------------------------------------------- | --------------- |
| Plain text with `<i>`, `<b>`, `<br>`           | Done            |
| Variable interpolation in text (`{$var}`)      | Done            |
| Chat bubbles (`Speaker: text`)                 | Done            |
| Choice buttons (`->`)                          | Done            |
| Jump buttons                                   | Done            |
| Continue after choice into the selected branch | Done            |
| Mood images (`<<Mood …>>`)                     | Done            |
| `<<detour>>` button + return navigation        | Done            |
| `<<once>>` content gating                      | Done            |
| `<<GatherScienceFact>>` component              | Done            |
| `<<Scene>>` component                          | Done            |
| `=> randomChoice` selected line rendering      | Done            |
| Historical block rendering                     | Done            |
| Selected choice transcript in history          | Done            |
| New blocks append without forced auto-scroll   | Done            |
| No visual separator between story blocks       | Done            |
| Localization                                   | Not implemented |
| Dark Mode                                      | Done            |

---

## State Management (`utils/storyStore.ts`)

| Feature                               | Status |
| ------------------------------------- | ------ |
| Track visited blocks                  | Done   |
| Live variable state                   | Done   |
| Block navigation                      | Done   |
| Choice path tracking                  | Done   |
| Random choice tracking                | Done   |
| Once visibility tracking              | Done   |
| Block history snapshots               | Done   |
| Detour return stack                   | Done   |
| Science fact catalog loaded           | Done   |
| Browser session restore on load       | Done   |
| Browser session auto-save             | Done   |
| Restart story and clear saved session | Done   |

---

## Product UI / Site Shell

| Feature                      | Status          |
| ---------------------------- | --------------- |
| Shared header                | Done            |
| Shared footer                | Not implemented |
| Impressum page               | Not implemented |
| Data security / privacy page | Not implemented |
| Logos / branding             | Partial         |

---

## Testing

| Feature / Area                          | Status                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| Test runner available (`deno test`)     | Done                                                                           |
| Existing automated tests                | Partial - parser, once, choice flow, choice regressions, session, randomChoice |
| Parser test coverage                    | Partial                                                                        |
| Condition evaluation tests              | Partial                                                                        |
| `<<set>>` evaluation tests              | Partial                                                                        |
| `<<jump>>` / choice flow tests          | Done                                                                           |
| Choice shortcut tests                   | Done                                                                           |
| `<<detour>>` flow tests                 | Not implemented                                                                |
| `=> randomChoice` parsing/runtime tests | Done                                                                           |
| Session persistence tests               | Done                                                                           |
| Story app lifecycle tests               | Done                                                                           |
| `<<Scene>>` show image for scene        | Not implemented                                                                |
| Component rendering tests               | Not implemented                                                                |
| End-to-end story flow tests             | Not implemented                                                                |

---

## Tooling / Quality Gates

| Feature / Area                           | Status                                           |
| ---------------------------------------- | ------------------------------------------------ |
| Format command (`deno fmt --check .`)    | Done                                             |
| Lint command (`deno lint .`)             | Partial - currently blocked by `react-no-danger` |
| Type check (`deno check`)                | Done                                             |
| Combined check task (`deno task check`)  | Partial - stops on existing lint issue           |
| Production build (`deno task build`)     | Done                                             |
| Production start (`deno task start`)     | Done                                             |
| CI workflow                              | Not implemented                                  |
| PR validation pipeline                   | Not implemented                                  |
| Coverage reporting                       | Not implemented                                  |
| Pre-commit hooks                         | Not implemented                                  |
| Deployment documentation                 | Not implemented                                  |
| README project setup / ops documentation | Partial - still mostly Fresh boilerplate         |

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

1. Add dedicated automated `<<detour>>` flow tests.
2. Manually verify key story branches to catch broken transitions or dead ends.
3. Manually verify `=> randomChoice` groups in representative story files.

### Step 2: Product UI And Session State Management

1. Add a shared footer.
2. Add Impressum and data security / privacy pages.
3. Finish logos and branding integration.
4. Continue improving reader UI hierarchy and mobile behavior.
5. Add a localization foundation for static UI copy and legal content.

### Step 3: Quality, Testing, CI/CD

1. Add automated tests for remaining gaps: detours, scenes, components,
   end-to-end story flows, and broader condition / `<<set>>` coverage.
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
6. Add a post-deploy smoke test for `/`.
