# Narrativ Storyteller

Narrativ Storyteller is an interactive story player built with Deno, Fresh,
Vite, Preact, and Tailwind CSS. It parses Yarn Spinner-style `.yarn` story files
and renders branching narrative content with choices, variables, conditions,
scenes, mood images, science fact badges, and session persistence.

Feature details and implementation status are tracked in
[`FEATURES.md`](./FEATURES.md).

## Requirements

Install Deno:

https://docs.deno.com/runtime/getting_started/installation

## Setup

Install and cache dependencies:

```sh
deno install
```

## Development

Start the Fresh development server:

```sh
deno task dev
```

This runs Vite in development mode and watches for changes.

Use `deno task dev` while editing source files. It reloads changes such as
updates to `components/Footer.tsx` automatically.

## Quality Checks

Run formatting checks, linting, and type checking:

```sh
deno task check
```

Run the test suite:

```sh
deno task test
```

## Build And Run

Create a production build:

```sh
deno task build
```

Build and serve the current source in one step:

```sh
deno task preview
```

Use `deno task preview` when checking production output locally. The `start`
task only serves the existing `_fresh` build and does not rebuild source files.

The deployment workflow first runs formatting, linting, type-checking, tests,
and a production build. Deployment is blocked unless all quality checks pass. It
then checks out the exact commit validated by GitHub Actions, rebuilds the
Docker image without cache, recreates the container, and waits for its Docker
healthcheck to confirm that the app responds on port `8000`.

Run the built Fresh server:

```sh
deno task start
```

## Dynamic Mood Images

Mood names may use the special `{$state}` suffix. Declare and update `$state` in
Yarn to select a corresponding image variant:

```yarn
<<declare $state = "morning">>
<<Mood angela_worried_{$state}>>

<<set $state to "evening">>
<<Mood angela_worried_{$state}>>
```

The example loads `eHub_moods_angela_worried_morning_72dpi.jpg` and then
`eHub_moods_angela_worried_evening_72dpi.jpg`. If `$state` is missing or not a
non-empty string, or if a variant cannot be loaded, the player falls back to
`eHub_moods_angela_worried_72dpi.jpg`. Mood names without `{$state}` continue to
work unchanged.

## Updating Fresh

Update Fresh dependencies and project files:

```sh
deno task update
```

## Project Structure

- `routes/`: Fresh routes and pages
- `islands/`: Interactive Preact islands
- `components/`: Shared UI components
- `utils/`: Story parsing, rendering, state, and runtime helpers
- `test/`: Deno test suite
- `data/`: Runtime data such as science facts
