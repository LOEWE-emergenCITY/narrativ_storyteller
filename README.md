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

Run the built Fresh server:

```sh
deno task start
```

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
