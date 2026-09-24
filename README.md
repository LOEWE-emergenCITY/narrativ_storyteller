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

Pull requests targeting `main` run the same formatting, linting, type-checking,
test, and production-build checks through the `Validate` workflow. The workflow
does not access deployment secrets or deploy anything.

The deployment workflow runs the same reusable quality gate first. Deployment is
blocked unless all quality checks pass. It then fetches and checks out the exact
commit validated by GitHub Actions. Before checkout, the deployment working tree
is reset and non-ignored untracked files are removed so local VPS changes cannot
prevent or alter deployment; ignored files such as `.env` are preserved. The
workflow verifies the checkout, rebuilds the Docker image without cache,
recreates the container, and waits for its Docker healthcheck to confirm that
the app responds on port `8000`. Checkout, build, and startup failures stop the
remote deployment instead of continuing with the previous version.

Run the built Fresh server:

```sh
deno task start
```

## Dynamic Mood Images

Mood names may use a variable suffix in the form `{$variable}`. Declare and
update the variable in Yarn to select a corresponding image variant:

```yarn
<<declare $mood_time = "morning">>
<<Mood angela_worried_{$mood_time}>>

<<set $mood_time to "evening">>
<<Mood angela_worried_{$mood_time}>>
```

The example loads `eHub_moods_angela_worried_morning.jpg` and then
`eHub_moods_angela_worried_evening.jpg`. If the suffix variable is missing or
not a non-empty string, the base mood name is used. If the requested image
cannot be loaded, the browser displays its alt text. Mood names without a
variable suffix continue to work unchanged.

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
