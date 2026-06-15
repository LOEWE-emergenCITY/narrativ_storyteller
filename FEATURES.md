# Feature List — .yarn File Format Support

Last updated: 2026-06-15

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
| Parse `<<jump …>>`                                                       | Done   |
| Parse `<<detour …>>`                                                     | Done   |
| Parse `<<Mood …>>`                                                       | Done   |
| Parse `<<Scene …>>`                                                      | Done   |
| Parse `<<GatherScienceFact …>>`                                          | Done   |
| Parse `-> choice` lines                                                  | Done   |
| Parse `Speaker: text` chat lines                                         | Done   |
| Parse plain text lines                                                   | Done   |

---

## Runtime Interpretation

| Feature                                                     | Status          |
| ----------------------------------------------------------- | --------------- |
| Condition evaluation (`<<if>>` / `<<elseif>>` / `<<else>>`) | Done            |
| Variable side effects (`<<set>>`)                           | Done            |
| Block navigation (`<<jump>>`)                               | Done            |
| `<<detour>>` — returnable jump with return stack            | Not implemented |
| `<<once>>` / `<<endonce>>` — hide content after first visit | Not implemented |
| `<<GatherScienceFact>>` — trigger variable state change     | Not implemented |
| `<<Scene>>` — trigger scene change                          | Not implemented |

---

## Rendering

| Feature                                   | Status                                                |
| ----------------------------------------- | ----------------------------------------------------- |
| Plain text with `<i>`, `<b>`, `<br>`      | Done                                                  |
| Variable interpolation in text (`{$var}`) | Done                                                  |
| Chat bubbles (`Speaker: text`)            | Done                                                  |
| Choice buttons (`->`)                     | Done                                                  |
| Jump buttons                              | Done                                                  |
| Mood images (`<<Mood …>>`)                | Done                                                  |
| `<<detour>>` button + return navigation   | Not implemented                                       |
| `<<once>>` content gating                 | Not implemented                                       |
| `<<GatherScienceFact>>` component         | Not implemented (TBD — info link placeholder planned) |
| `<<Scene>>` component                     | Not implemented (TBD)                                 |

---

## State Management (`utils/storyStore.ts`)

| Feature              | Status          |
| -------------------- | --------------- |
| Track visited blocks | Done            |
| Live variable state  | Done            |
| Block navigation     | Done            |
| Choice path tracking | Done            |
| Detour return stack  | Not implemented |
