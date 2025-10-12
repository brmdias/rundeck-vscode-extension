import * as assert from 'assert';
import * as vscode from 'vscode';

import {
  extractScriptAndType,
  listScriptCommands,
  saveRundeckConnection,
  getRundeckConnection,
  clearRundeckConnection
} from '../extension';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Placeholder sanity test', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
  });

  suite('extractScriptAndType', () => {
    test('Extracts first shell script', () => {
      const y = `
        sequence:
          commands:
            - description: First
              script: |
                echo "hello"
            - description: Second
              script: |
                echo "world"
      `;
      const res = extractScriptAndType(y);
      assert.ok(res);
      assert.strictEqual(res!.type, 'shell');
      assert.strictEqual(res!.fileExtension, '.sh');
      assert.match(res!.script, /hello/);
    });

    test('Detects python via scriptInterpreter', () => {
      const y = `
        sequence:
          commands:
            - scriptInterpreter: python3
              script: |
                print("hi")
      `;
      const res = extractScriptAndType(y);
      assert.ok(res);
      assert.strictEqual(res!.type, 'python');
      assert.strictEqual(res!.fileExtension, '.py');
      assert.match(res!.script, /print/);
    });

    test('Returns null for invalid yaml', () => {
      const res = extractScriptAndType('::: not yaml');
      assert.strictEqual(res, null);
    });

    test('Returns null when no commands', () => {
      const res = extractScriptAndType('sequence:\n  commands: []');
      assert.strictEqual(res, null);
    });
  });

  suite('listScriptCommands', () => {
    test('Lists multiple commands and infers python extensions', () => {
      const y = `
        sequence:
          commands:
            - description: Alpha
              script: echo alpha
            - scriptInterpreter: python
              script: |
                print("beta")
            - description: Third
              scriptInterpreter: /usr/bin/python3
              script: |
                print("gamma")
      `;
      const list = listScriptCommands(y);
      assert.strictEqual(list.length, 3);
      assert.deepStrictEqual(
        list.map(c => c.description),
        ['Alpha', 'Script #1', 'Third']
      );
      // Count python via fileExtension since listScriptCommands does not expose a 'type'
      assert.strictEqual(list.filter(c => c.fileExtension === '.py').length, 2);
    });

    test('Handles array root yaml', () => {
      const y = `
        - sequence:
            commands:
              - script: echo test
      `;
      const list = listScriptCommands(y);
      assert.strictEqual(list.length, 1);
      assert.strictEqual(list[0].script.trim(), 'echo test');
    });

    test('Malformed yaml returns empty', () => {
      const list = listScriptCommands('not: [balanced');
      assert.deepStrictEqual(list, []);
    });

    test('Missing sequence returns empty', () => {
      const list = listScriptCommands('project: demo');
      assert.deepStrictEqual(list, []);
    });
  });

  suite('Persistent connection storage', () => {
    const mockContext: any = {
      globalState: {
        _store: new Map<string, any>(),
        update(key: string, value: any) { this._store.set(key, value); },
        get<T>(key: string) { return this._store.get(key) as T; }
      }
    };

    test('Saves and retrieves connection', () => {
      saveRundeckConnection(mockContext, 'TOK123', 'https://rundeck.example', 'proj1');
      const conn = getRundeckConnection(mockContext as any);
      assert.strictEqual(conn.token, 'TOK123');
      assert.strictEqual(conn.url, 'https://rundeck.example');
      assert.strictEqual(conn.project, 'proj1');
    });

    test('Clears connection', () => {
      saveRundeckConnection(mockContext, 'AAA', 'http://x', 'p');
      clearRundeckConnection(mockContext as any);
      const conn = getRundeckConnection(mockContext as any);
      assert.deepStrictEqual(conn, { token: undefined, url: undefined, project: undefined });
    });

    test('Update without project keeps existing project', () => {
      saveRundeckConnection(mockContext, 'T1', 'http://u1', 'projA');
      saveRundeckConnection(mockContext, 'T2', 'http://u2'); // no new project
      const conn = getRundeckConnection(mockContext as any);
      assert.strictEqual(conn.token, 'T2');
      assert.strictEqual(conn.url, 'http://u2');
      assert.strictEqual(conn.project, 'projA');
    });
  });
});
