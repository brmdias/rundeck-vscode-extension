import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
// Temp script file path shared between commands
let tempScriptFilePath: string | undefined;

// Utility: open extracted script in a temporary file for editing
export async function openScriptForEditing(script: string, fileExtension: string): Promise<vscode.TextDocument | undefined> {
  try {
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `rundeck-script-${Date.now()}${fileExtension}`);
    await fs.writeFile(tempFilePath, script, { encoding: 'utf8' });
    const doc = await vscode.workspace.openTextDocument(tempFilePath);
    await vscode.window.showTextDocument(doc, { preview: false });
    tempScriptFilePath = tempFilePath;
    return doc;
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to open script for editing: ${err}`);
    return undefined;
  }
}

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
  // Register the edit job script command
  context.subscriptions.push(vscode.commands.registerCommand('rundeck-vscode-extension.editJobScript', async () => {
    let fileUri: vscode.Uri | undefined;
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.uri.scheme === 'file') {
      fileUri = activeEditor.document.uri;
    } else {
      const picked = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Select a job file to edit script from'
      });
      if (picked && picked.length > 0) {
        fileUri = picked[0];
      }
    }
    if (!fileUri) {
      vscode.window.showErrorMessage('No job file selected for script editing.');
      return;
    }
    let fileData = await vscode.workspace.fs.readFile(fileUri);
    let yamlText = Buffer.from(fileData).toString('utf8');
    // Debug logging: show parsed YAML and commands array, handle array/object root
    try {
      let jobDef = yaml.load(yamlText) as any;
      vscode.window.showInformationMessage('DEBUG: Parsed YAML loaded.');
      console.log('DEBUG: Parsed YAML:', jobDef);
      // If jobDef is an array, use the first job
      if (Array.isArray(jobDef)) {
        console.log('DEBUG: jobDef is array, using first element.');
        jobDef = jobDef[0] as any;
      }
      if (!jobDef || !jobDef.sequence || !Array.isArray(jobDef.sequence.commands)) {
        console.log('DEBUG: sequence.commands not found.');
        vscode.window.showInformationMessage('DEBUG: sequence.commands not found.');
      } else {
        console.log('DEBUG: sequence.commands:', jobDef.sequence.commands);
        vscode.window.showInformationMessage('DEBUG: sequence.commands found, length: ' + jobDef.sequence.commands.length);
        jobDef.sequence.commands.forEach((cmd: any, idx: number) => {
          console.log(`DEBUG: commands[${idx}]:`, cmd);
        });
      }
    } catch (e) {
      vscode.window.showErrorMessage('DEBUG: Error parsing YAML: ' + String(e));
    }
    const extracted = extractScriptAndType(yamlText);
    if (!extracted) {
      vscode.window.showErrorMessage('No script found in job file.');
      return;
    }
    const { script, fileExtension } = extracted;
    await openScriptForEditing(script, fileExtension);
    vscode.window.showInformationMessage(`Script opened for editing.`);
  }));
  // Register the upload job command
  context.subscriptions.push(vscode.commands.registerCommand('rundeck-vscode-extension.uploadJob', async () => {
    console.log('DEBUG: Starting Upload Load command.');
    let { token, url, project } = getRundeckConnection(context);
    if (!token || !url) {
      vscode.window.showErrorMessage('No Rundeck connection found. Please run "Connect to Rundeck cluster" first.');
      return;
    }
    if (!project) {
      project = await vscode.window.showInputBox({
        prompt: 'Enter the Rundeck project name to upload the job file to'
      });
      if (!project) {
        vscode.window.showErrorMessage('Project name is required.');
        return;
      }
      saveRundeckConnection(context, token, url, project);
    }
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
    let fileData = await vscode.workspace.fs.readFile(fileUri);
    let yamlText = Buffer.from(fileData).toString('utf8');
    yamlText = yamlText.replace(/^[ \t]*(uuid|id):.*$/gm, '');
    // Load job YAML and update script if needed
    let jobDef = yaml.load(yamlText) as any;
    if (tempScriptFilePath) {
      console.log('DEBUG: Temp file exists: ', tempScriptFilePath);
      try {
        const latestScript = await fs.readFile(tempScriptFilePath, { encoding: 'utf8' });
        // If jobDef is array, update first job; else update jobDef
        if (Array.isArray(jobDef)) {
          if (jobDef[0]?.sequence?.commands) {
            const cmd = jobDef[0].sequence.commands.find((c: any) => c.script);
            if (cmd) {
              cmd.script = latestScript;
            }
          }
        } else if (jobDef?.sequence?.commands) {
          const cmd = jobDef.sequence.commands.find((c: any) => c.script);
          if (cmd) {
            cmd.script = latestScript;
          }
        }
        console.log('DEBUG: Updated script in YAML.');
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to read latest script for upload: ${err}`);
      }
    } else {
      console.log('DEBUG: No temp file detected on path: ', tempScriptFilePath);
    }
    // Remove uuid/id fields from all jobs
    const jobsArray = Array.isArray(jobDef) ? jobDef : [jobDef];
    jobsArray.forEach((job: any) => {
      delete job.uuid;
      delete job.id;
    });
    const uploadYaml = yaml.dump(jobsArray);
    try {
      console.log('DEBUG: Preparing to upload this job def: ', uploadYaml);
      const uploadResponse = await fetch(`${url}/api/53/project/${project}/jobs/import?uuidOption=remove&dupeOption=update`, {
        method: 'POST',
        headers: {
          'X-Rundeck-Auth-Token': token,
          'Accept': 'application/json',
          'Content-Type': 'application/yaml'
        },
        body: uploadYaml
      });
      if (!uploadResponse.ok) {
        // Get the response body as text for debugging
        const responseBody = await uploadResponse.text();
        // Print details to the VS Code debug console
        console.error(
          `Job upload failed.\n` +
          `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}\n` +
          `Headers: ${JSON.stringify([...uploadResponse.headers])}\n` +
          `Body: ${responseBody}`
        );
        throw new Error(`HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`);
      }
      const uploadResult = await uploadResponse.json();
      vscode.window.showInformationMessage(`✅ Job file uploaded to Rundeck project '${project}'. Result: ${JSON.stringify(uploadResult)}`);
    } catch (uploadError: any) {
      vscode.window.showErrorMessage(`Failed to upload job file: ${uploadError.message}`);
    }
  }));

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

// Extract script and type from Rundeck job YAML
export function extractScriptAndType(yamlText: string): { script: string, type: 'python' | 'shell', fileExtension: string } | null {
  try {
    let jobDef = yaml.load(yamlText) as any;
    // If jobDef is an array, use the first job
    if (Array.isArray(jobDef)) {
      jobDef = jobDef[0] as any;
    }
    const sequence = jobDef?.sequence;
    if (!sequence || !Array.isArray(sequence.commands)) return null;
    // Find the first command with a 'script' field anywhere in commands
    for (const cmd of sequence.commands) {
      if (cmd && typeof cmd.script === 'string') {
        const script = cmd.script;
        const interpreter = cmd.scriptInterpreter?.toLowerCase() || 'shell';
        let type: 'python' | 'shell' = 'shell';
        let fileExtension = '.sh';
        if (interpreter.includes('python')) {
          type = 'python';
          fileExtension = '.py';
        }
        return { script, type, fileExtension };
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}