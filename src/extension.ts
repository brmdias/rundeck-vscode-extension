import * as vscode from 'vscode';

// Persistent storage keys
const RUNDECK_TOKEN_KEY = 'rundeckApiToken';
const RUNDECK_URL_KEY = 'rundeckUrl';
const RUNDECK_PROJECT_KEY = 'rundeckProject';

// Utility functions for persistent storage
export function saveRundeckConnection(
  context: vscode.ExtensionContext,
  token: string,
  url: string,
  project?: string
) {
  context.globalState.update(RUNDECK_TOKEN_KEY, token);
  context.globalState.update(RUNDECK_URL_KEY, url);
  if (project !== undefined) {
    context.globalState.update(RUNDECK_PROJECT_KEY, project);
  }
}

export function getRundeckConnection(context: vscode.ExtensionContext): { token?: string, url?: string, project?: string } {
  return {
    token: context.globalState.get<string>(RUNDECK_TOKEN_KEY),
    url: context.globalState.get<string>(RUNDECK_URL_KEY),
    project: context.globalState.get<string>(RUNDECK_PROJECT_KEY)
  };
}

export function clearRundeckConnection(context: vscode.ExtensionContext) {
  context.globalState.update(RUNDECK_TOKEN_KEY, undefined);
  context.globalState.update(RUNDECK_URL_KEY, undefined);
  context.globalState.update(RUNDECK_PROJECT_KEY, undefined);
}

export function activate(context: vscode.ExtensionContext) {
  // Register the test connection command
  let testConnectionDisposable = vscode.commands.registerCommand('rundeck-vscode-extension.testConnection', async () => {
    const { token, url } = getRundeckConnection(context);
    if (!token || !url) {
      vscode.window.showErrorMessage('No Rundeck connection found. Please run "Connect to Rundeck cluster" first.');
      return;
    }
    try {
      const response = await fetch(`${url}/api/40/system/info`, {
        method: 'GET',
        headers: {
          'X-Rundeck-Auth-Token': token,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json() as any;
  vscode.window.showInformationMessage(`✅ Rundeck connection OK: ${data.system?.rundeck?.version || 'Unknown version'} at ${url}`);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Rundeck connection failed: ${error.message}`);
    }
  });
  context.subscriptions.push(testConnectionDisposable);
  // Register the upload job command
  let uploadDisposable = vscode.commands.registerCommand('rundeck-vscode-extension.uploadJob', async () => {
    // Use saved connection parameters
    let { token, url, project } = getRundeckConnection(context);
    if (!token || !url) {
      vscode.window.showErrorMessage('No Rundeck connection found. Please run "Connect to Rundeck cluster" first.');
      return;
    }

    // If project name is missing, prompt for it and save
    if (!project) {
      project = await vscode.window.showInputBox({
        prompt: 'Enter the Rundeck project name to upload the job file to'
      });
      if (!project) {
        vscode.window.showErrorMessage('Project name is required.');
        return;
      }
      // Save project name for future use
      saveRundeckConnection(context, token, url, project);
    }

    // Prefer active tab file, else prompt for file
    let fileUri: vscode.Uri | undefined;
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.uri.scheme === 'file') {
      fileUri = activeEditor.document.uri;
    } else {
      const picked = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Select a job file to upload to Rundeck'
      });
      if (picked && picked.length > 0) {
        fileUri = picked[0];
      }
    }
    if (!fileUri) {
      vscode.window.showErrorMessage('No file selected for upload.');
      return;
    }

    // Read file contents
    let fileData = await vscode.workspace.fs.readFile(fileUri);
    let yamlText = Buffer.from(fileData).toString('utf8');
    // Remove 'uuid' and 'id' fields from YAML
    yamlText = yamlText.replace(/^\s*(uuid|id):.*$/gm, '');
    // Upload file to Rundeck
    try {
      const uploadResponse = await fetch(`${url}/api/53/project/${project}/jobs/import?uuidOption=remove&dupeOption=update`, {
        method: 'POST',
        headers: {
          'X-Rundeck-Auth-Token': token,
          'Accept': 'application/json',
          'Content-Type': 'application/yaml' // assuming job file is YAML
        },
        body: yamlText
      });
      if (!uploadResponse.ok) {
        throw new Error(`HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`);
      }
      const uploadResult = await uploadResponse.json();
  vscode.window.showInformationMessage(`✅ Job file uploaded to Rundeck project '${project}'. Result: ${JSON.stringify(uploadResult)}`);
    } catch (uploadError: any) {
      vscode.window.showErrorMessage(`Failed to upload job file: ${uploadError.message}`);
    }
  });
  context.subscriptions.push(uploadDisposable);

  // Register the connect to Rundeck cluster command
  let connectDisposable = vscode.commands.registerCommand('rundeck-vscode-extension.connectCluster', async () => {
    // Prompt for Rundeck API token (hidden input)
    const apiToken = await vscode.window.showInputBox({
      prompt: 'Enter your Rundeck API Token',
      password: true
    });
    // Prompt for Rundeck server URL
    const serverUrl = await vscode.window.showInputBox({
      prompt: 'Enter your Rundeck server URL (e.g. https://rundeck.example.com)'
    });
    // Prompt for Rundeck project name (optional)
    const project = await vscode.window.showInputBox({
      prompt: 'Enter your Rundeck project name (optional)',
      placeHolder: 'Leave empty to set later'
    });
    if (!apiToken || !serverUrl) {
      vscode.window.showErrorMessage('API token and server URL are required.');
      return;
    }
    // Test connection health
    try {
      const response = await fetch(`${serverUrl}/api/40/system/info`, {
        method: 'GET',
        headers: {
          'X-Rundeck-Auth-Token': apiToken,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json() as any;
      saveRundeckConnection(context, apiToken, serverUrl, project);
  vscode.window.showInformationMessage(`🔗 Connected to Rundeck: ${data.system?.rundeck?.version || 'Unknown version'} at ${serverUrl}` + (project ? ` (Project: ${project})` : ''));
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to connect to Rundeck: ${error.message}`);
    }
  });
  context.subscriptions.push(connectDisposable);

  // Register the clear connection command
  let clearConnectionDisposable = vscode.commands.registerCommand('rundeck-vscode-extension.clearConnection', async () => {
    clearRundeckConnection(context);
  vscode.window.showInformationMessage('🧹 Rundeck connection details have been cleared.');
  });
  context.subscriptions.push(clearConnectionDisposable);
}

export function deactivate() {}