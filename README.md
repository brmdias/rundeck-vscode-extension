
# Rundeck VSCode Extension

Integrate Rundeck job management directly into VS Code. This extension lets you connect to a Rundeck cluster, test the connection, and upload job definitions with a streamlined workflow.

## Features

- Connect to a Rundeck cluster and persist credentials securely
- Test Rundeck API connection health
- Upload job YAML files to a Rundeck project (removes `uuid` and `id` fields automatically)
- Remembers project name for future uploads
- Uses VS Code UI for all prompts and file selection

## Installation

1. Clone or download this repository
2. Run `npm install` in the project folder
3. Build with `npm run compile`
4. Press F5 in VS Code to launch a new Extension Development Host

## Usage

### 1. Connect to Rundeck Cluster
Run the command `Connect to Rundeck Cluster` from the command palette. Enter your Rundeck API token, server URL, and optionally a project name. Credentials are stored securely for future use.

### 2. Test Connection
Run `Test Rundeck Connection` to verify your saved API token and cluster health.

### 3. Upload Rundeck Job
Run `Upload Rundeck Job`. If a project name is not set, you will be prompted for it. Select a job YAML file (active editor preferred, or file picker). The extension removes `uuid` and `id` fields before uploading to Rundeck.

## Developer Workflow

- **Build:** `npm run compile`
- **Watch:** `npm run watch`
- **Lint:** `npm run lint`
- **Test:** `npm test`
- **Debug:** Use the "Run Extension" launch configuration

## Project Structure

- `src/extension.ts`: Main extension logic and command registration
- `package.json`: Extension manifest and command contributions
- `test/extension.test.ts`: Example test file (expand for more coverage)
- `.github/copilot-instructions.md`: AI agent instructions

## Configuration

No custom settings required. All connection parameters (API token, server URL, project name) are managed via VS Code's global state.

## Known Issues

- Minimal test coverage (expand `test/extension.test.ts` for more reliability)
- No support for advanced Rundeck job import options (contributions welcome)

## Release Notes

### v1.0.0
- Initial release: Connect, test, and upload Rundeck jobs from VS Code

## Contributing

Pull requests and issues are welcome! Please follow standard TypeScript and VS Code extension best practices.

## License

MIT
