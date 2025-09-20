# Change Log

All notable changes to the "Rundeck VSCode Extension" will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added
- (placeholder)

## [1.1.0] - 2025-09-20

### Added
- Multi-script job editing with Quick Pick selection when multiple script commands exist.
- Live YAML synchronization: saving a temp script file updates the corresponding command in the job definition immediately.
- Support for editing multiple scripts concurrently (each script opened in its own temp file).
- `listScriptCommands` helper to enumerate all script commands with metadata (index, description, interpreter, extension).

### Changed
- Upload workflow now patches all edited script commands back into the YAML before sending to Rundeck.
- Job YAML always wrapped as an array prior to import to satisfy Rundeck format expectations.
- Improved handling of array vs object YAML roots (first job auto-selected when array root).

### Deprecated
- `extractScriptAndType` (retained for backward compatibility; use `listScriptCommands`).

### Documentation
- README updated with multi-script editing workflow, limitations, and new v1.1.0 feature list.

### Internal
- Introduced metadata map linking temp script files to job path and command index.
- Added additional debug logging around script selection and upload patching.

## [1.0.0] - 2025-01-01

### Added
- Initial release: connect to Rundeck, test connection, and upload single job YAML files (automatic removal of `uuid` and `id`).