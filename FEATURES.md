# Feature List — .yarn File Format Support

Last updated: 2026-09-02

---

## Progress Snapshot

Scoring:

- Done = 1
- Partial = 0.5
- Not implemented = 0

- Step 1 / MVP progress: 98% done, 2% remaining (60 / 61 points)
- Complete package progress: 86% done, 14% remaining (86.5 / 101 points)

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
| Update variables within buttons / choices (`<<set>>`)       | Done   |
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
| Automatic `<<jump>>` navigation                | Done            |
| Continue after choice into the selected branch | Done            |
| Mood images (`<<Mood …>>`)                     | Done            |
| Dynamic mood suffix (`<<Mood …_{$variable}>>`) | Done            |
| Automatic `<<detour>>` navigation and return   | Done            |
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

| Feature                                    | Status |
| ------------------------------------------ | ------ |
| Track visited blocks                       | Done   |
| Live variable state                        | Done   |
| Block navigation                           | Done   |
| Choice path tracking                       | Done   |
| Random choice tracking                     | Done   |
| Once visibility tracking                   | Done   |
| Block history snapshots                    | Done   |
| Detour return stack                        | Done   |
| Science fact catalog loaded                | Done   |
| Detect saved session and resume on request | Done   |
| Browser session auto-save                  | Done   |
| Restart story and clear saved session      | Done   |

---

## Product UI / Site Shell

| Feature                      | Status  |
| ---------------------------- | ------- |
| Shared header                | Done    |
| Shared footer                | Done    |
| Impressum footer link        | Done    |
| Data security / privacy link | Done    |
| Logos / branding             | Partial |

---

## Testing

| Feature / Area                          | Status                                                              |
| --------------------------------------- | ------------------------------------------------------------------- |
| Test runner available (`deno test`)     | Done                                                                |
| Existing automated tests                | Partial - parser, flow, state, persistence, lifecycle, files, moods |
| Parser test coverage                    | Partial                                                             |
| Condition evaluation tests              | Partial                                                             |
| `<<set>>` evaluation tests              | Partial                                                             |
| `<<jump>>` / choice flow tests          | Done                                                                |
| Choice shortcut tests                   | Done                                                                |
| `<<detour>>` flow tests                 | Done                                                                |
| `=> randomChoice` parsing/runtime tests | Done                                                                |
| Dynamic mood resolution tests           | Done                                                                |
| Session persistence tests               | Done                                                                |
| Story app lifecycle tests               | Done                                                                |
| `<<Scene>>` show image for scene        | Not implemented                                                     |
| Component rendering tests               | Not implemented                                                     |
| End-to-end browser story flow tests     | Not implemented                                                     |

---

## Tooling / Quality Gates

| Feature / Area                           | Status                                   |
| ---------------------------------------- | ---------------------------------------- |
| Format command (`deno fmt --check .`)    | Done                                     |
| Lint command (`deno lint .`)             | Done                                     |
| Type check (`deno check`)                | Done                                     |
| Combined check task (`deno task check`)  | Done                                     |
| Production build (`deno task build`)     | Done                                     |
| Production start (`deno task start`)     | Done                                     |
| CI workflow                              | Done                                     |
| PR validation pipeline                   | Done                                     |
| Coverage reporting                       | Not implemented                          |
| Pre-commit hooks                         | Not implemented                          |
| Deployment documentation                 | Not implemented                          |
| README project setup / ops documentation | Partial - deployment details are missing |

---

## Deployment / CI/CD

| Feature / Area                            | Status          |
| ----------------------------------------- | --------------- |
| App can be built locally                  | Done            |
| App can be started locally                | Done            |
| Hosting target selected                   | Not implemented |
| Validation-only deployment workflow       | Partial         |
| CI on push / pull request                 | Done            |
| CD on merge to main                       | Not implemented |
| Secrets / environment strategy documented | Not implemented |
| Health check / smoke check after deploy   | Not implemented |

---

## Implementation Roadmap

### Step 1: Basic Gameplay

1. Manually verify key story branches to catch broken transitions or dead ends.
2. Manually verify `=> randomChoice` groups in representative story files.

### Step 2: Product UI And Session State Management

1. Finish logos and branding integration.
2. Continue improving reader UI hierarchy and mobile behavior.
3. Add a localization foundation for static UI copy and legal content.

### Step 3: Quality, Testing, CI/CD

1. Add automated tests for remaining gaps: scenes, components, end-to-end
   browser story flows, and broader parser, condition, and `<<set>>` coverage.
2. Add coverage reporting and optional pre-commit hooks.
3. Choose a deployment target and commit provider-specific deployment
   configuration.
4. Extend `README.md` with provider-specific deployment instructions.

---

## Suggested CI Pipeline

1. Install Deno and cache dependencies.
2. Run `deno task check`.
3. Run `deno task test`.
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
