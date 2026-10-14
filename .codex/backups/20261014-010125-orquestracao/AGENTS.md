# Repository Guidelines

## Project Structure & Module Organization

This directory currently contains no application code, tests, assets, or package configuration. Establish the project structure when adding the first implementation and update this guide accordingly.

Group files by responsibility. Suggested directories are `src/` for application code, `tests/` for automated tests, `assets/` for static resources, and `docs/` for supporting documentation. Create only directories the project needs.

## Build, Test, and Development Commands

No build, test, or local development commands are currently configured. When selecting a toolchain, document its prerequisites, installation steps, and exact commands in `README.md`.

Use the package manager and lockfile adopted by the project consistently. Do not document commands such as `npm test` until the corresponding scripts exist and have been verified.

## Coding Style & Naming Conventions

Follow the conventions of the selected language and existing neighboring files. Use descriptive names, consistent indentation, and small modules with clear responsibilities. Avoid mixing naming styles within a module.

When introducing a formatter or linter, commit its configuration and document how contributors run it. Keep formatting changes separate from unrelated functional changes.

## Testing Guidelines

No testing framework or coverage threshold is configured. Add meaningful tests alongside new behavior, including relevant failure cases. Use descriptive test names that explain the expected behavior, and follow the chosen framework's file naming conventions.

Document the test command before asking contributors to run it. Report any checks that could not be performed.

## Commit & Pull Request Guidelines

No Git repository or commit history is present, so no established message convention can be inferred. Once version control is initialized, use concise, imperative commit subjects, such as `Add initial project configuration`.

Pull requests should explain the purpose, summarize changes, list validation performed, and link relevant issues. Include screenshots for visible interface changes.

## Security & Configuration

Never commit credentials, tokens, or private configuration. Document required environment variables using an example configuration containing placeholders.
