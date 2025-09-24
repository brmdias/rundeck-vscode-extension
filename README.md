# Rundeck VSCode Extension

Integrate Rundeck job management directly into VS Code. This extension lets you connect to a Rundeck cluster, test the connection, and upload job definitions with a streamlined workflow. It allows Rundeck job developers to take full advantage of the VS Code IDE: syntax highlighting, linting, refactoring, AI/code completion, Git diffing, search, and terminal tooling while editing embedded scripts.

## Features

- Connect to a Rundeck cluster and persist credentials securely
- Test Rundeck API connection health
- Edit embedded job scripts in full IDE context (extensions, linting, AI assistance)
- Live sync: saving a temp script immediately patches the YAML
- Upload job YAML files (auto-removes `uuid` and `id`)
- Automatically patches all edited scripts before upload
- Remembers project name for future uploads
- Uses native VS Code UI for prompts and file selection
- Leverages existing workspace tooling (formatters, Git, search, terminals) for Rundeck scripts

## Installation

### Option A: Install Prebuilt VSIX (Recommended)

1. Download `rundeck-vscode-extension-1.1.0.vsix` from the releases page - [link here](https://github.com/brmdias/rundeck-vscode-extension/releases/tag/v1.1.0).
2. In VS Code run the command: `Extensions: Install from VSIX...` and select the file, or use the CLI:
   ```bash
   code --install-extension rundeck-vscode-extension-1.1.0.vsix
   ```
3. Reload VS Code if prompted.

### Option B: Build From Source

1. Clone or download this repository
2. Run `npm install` in the project folder
3. Build with `npm run compile` (or `npm run watch` during development)
4. Press F5 in VS Code to launch a new Extension Development Host
5. (Optional) Package a VSIX with: `vsce package` which produces the `.vsix` file you can distribute.

### Requirements

- VS Code 1.88+ (tested)
- Node.js 18+ for building from source
- A Rundeck API token with permissions to read system info and import jobs


## Usage

### 1. Connect to Rundeck Cluster
Run the command `Connect to Rundeck Cluster` from the command palette. Enter your Rundeck API token, server URL, and optionally a project name. Credentials are stored securely for future use.

### 2. Test Connection
Run `Test Rundeck Connection` to verify your saved API token and cluster health.

### 3. Edit Job Script(s)
Run `Edit Job Script` while a job YAML is active (or select one). The extension parses `sequence.commands` and:

- If only one `script` command exists, it opens it directly in a temp file (`.sh` or `.py` based on `scriptInterpreter`).
- If multiple script commands exist, a Quick Pick appears listing each by its description (or `Script #<index>` when no description). Select one to edit.

When you save the temporary script file, the associated job YAML file is immediately updated in-place with the latest script content. You can open and edit multiple script commands (each gets its own temp file) before uploading.

### 4. Upload Rundeck Job
Run `Upload Rundeck Job`. If a project name is not set, you will be prompted for it. The extension:

1. Loads the selected job YAML (active editor preferred, otherwise file picker)
2. Applies all pending script edits from open temp script files for that job
3. Removes `uuid` and `id` fields
4. Wraps the job definition in an array if needed (Rundeck expects a list)
5. Imports with `uuidOption=remove` and `dupeOption=update`

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

## Configuration

No custom settings required. All connection parameters (API token, server URL, project name) are managed via VS Code's global state.

## Known Issues & Limitations

- Minimal test coverage (expand `test/extension.test.ts` for more reliability)
- Temp script files are not auto-cleaned (stored under your OS temp dir, e.g. `os.tmpdir()`); delete manually if desired
- Only the first job in a multi-job YAML file is currently considered for script editing
- Advanced Rundeck import options (e.g., partial diffs, ACLs) are not exposed yet
- Deprecated helper `extractScriptAndType` retained for compatibility; new development should use multi-script flow

## Release Notes

See also the full [CHANGELOG](./CHANGELOG.md).

### v1.1.0 – [Release Assets](https://github.com/brmdias/rundeck-vscode-extension/releases/tag/v1.1.0)
- Multi-script editing with Quick Pick selection
- Live YAML sync on temp script save
- Upload patches all edited scripts automatically
- Robust array/object root handling for job YAML

### v1.0.0
- Initial release: Connect, test, and upload Rundeck jobs from VS Code

## Contributing

Pull requests and issues are welcome! Please follow standard TypeScript and VS Code extension best practices.

## How to Raise Issues

Use the GitHub Issues page to report bugs or request features:

1. Search existing issues first.
2. For bugs include:
   - Extension version (see Release Notes / packaged VSIX name)
   - VS Code version & OS
   - Reproduction steps (minimal YAML if helpful)
   - Expected vs actual behavior
   - Relevant `DEBUG:` console output (omit secrets)
3. For feature requests describe the workflow problem and desired outcome (avoid only proposing UI elements).
4. Redact tokens, internal URLs, or sensitive job content.

Triage order: critical upload/sync issues > auth problems > usability enhancements > feature ideas.

## License

MIT
