'use strict';

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ServiceAction, IServiceCall, IServiceResult, OpenTextDocumentOptions, ConsoleViewState, ServiceActionTypes } from './interfaces';
import { Services } from './Services';
import { registerBuiltins } from './registerBuiltins';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('vsConnectClient.start', () => {
			VSConnectPanel.create(context.extensionPath);
		})
	);

	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(VSConnectPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, stateEncoded: any) {
				// TODO: modify state, recompute viz
				// TODO: restore sandbox state here
				let state: ConsoleViewState = JSON.parse(decodeURI(stateEncoded));
				Services.GetInstance().restoreSandbox(state.webviewId, state.history);
				VSConnectPanel.revive(webviewPanel, context.extensionPath, state.webviewId);
			}
		});
	}

	setupServices();
}

function setupServices() {
	let services = Services.GetInstance();
	let disposables: vscode.Disposable[] = [];

	registerBuiltins(services);
	services.on('document:open', (docOptions: OpenTextDocumentOptions) =>
		vscode.workspace.openTextDocument({
			language: docOptions.language,
			content: docOptions.content,
		}).then((textDocument) => {
			if (docOptions.shouldSync) {
				services.trackTextDocument(textDocument);
			}
			vscode.window.showTextDocument(textDocument, vscode.ViewColumn.Beside, true);
		})
	);
	services.on('document:change', (textDocument: vscode.TextDocument, valueNew: string) => {
		for (let editor of vscode.window.visibleTextEditors) {
			if (editor.document === textDocument) {
				let firstLine = textDocument.lineAt(0);
				let lastLine = textDocument.lineAt(textDocument.lineCount - 1);
				let textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
				editor.edit((editBuilder) => editBuilder.replace(textRange, valueNew));
				break;
			}
		}
	});
	vscode.workspace.onDidChangeTextDocument(
		(e) => services.textDocumentDidChange(e.document),
		null,
		disposables
	);
	vscode.workspace.onDidCloseTextDocument(
		(docClosed) => services.textDocumentDidClose(docClosed),
		null,
		disposables
	);
}

class VSConnectPanel {
	public static readonly viewType = 'vsConnectClient';

	private static editorCount: number = 1;

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];
	private services: Services;
	private isDisposed: boolean = false;
	private id: number;

	// private scriptSrc: string;
	// private stylesSrc: string;

	public static create(extensionPath: string) {
		const column: vscode.ViewColumn = (vscode.window.activeTextEditor !== undefined)
			? vscode.window.activeTextEditor.viewColumn!
			: vscode.ViewColumn.One;

		// Otherwise, create a new panel.
		let count: number = VSConnectPanel.editorCount++;
		const panel = vscode.window.createWebviewPanel(
			VSConnectPanel.viewType,
			`VSConnect: Client ${count}`,
			column,
			{
				// Enable javascript in the webview
				enableScripts: true,

				// And restrict the webview local fs paths
				localResourceRoots: [
					vscode.Uri.file(path.join(extensionPath, 'dist')),
					vscode.Uri.file(path.join(extensionPath, 'static'))
				],
			}
		);

		return new VSConnectPanel(panel, extensionPath, count);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string, id: number) {
		let panelHandler = new VSConnectPanel(panel, extensionPath, id);
		panel.webview.html = panelHandler._getHtmlForWebview(panel.webview);
	}

	sendMessageToWebview = (action: ServiceAction, sourceId?: number): void => {
		if (sourceId !== undefined && sourceId !== this.id)
			return;

		let svcCall: IServiceCall = {
			type: 'call',
			promiseId: -1, // TODO implement result handling if needed
			action
		};
		this._panel.webview.postMessage(svcCall);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string, id: number) {
		this.id = id;
		this._panel = panel;
		this._extensionPath = extensionPath;

		// Set the webview's initial html content
		this._panel.iconPath = vscode.Uri.file(path.join(extensionPath, 'static', 'VSConnectLogo.svg'));
		this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		// this._panel.onDidChangeViewState(
		// 	e => {
		// 		if (this._panel.visible) {
		// 			// this._update();
		// 		}
		// 	},
		// 	null,
		// 	this._disposables
		// );

		this.services = Services.GetInstance();

		// Handle messages to the webview
		this.services.on('message', this.sendMessageToWebview);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			(message) => {
				let call: IServiceCall = message;
				this.services.process(call.action, this.id).then( (result: any) => {
					if (!this.isDisposed) {
						let svcResult: IServiceResult = {
							type: 'result',
							promiseId: call.promiseId,
							result
						};
						this._panel.webview.postMessage(svcResult);
					}
				} );
			},
			null,
			this._disposables
		);

		let svcReq: IServiceCall = {
			type: 'call',
			promiseId: -1,
			action: {
				type: ServiceActionTypes.SetWebviewId,
				params: [id]
			}
		}
		this._panel.webview.postMessage(svcReq);
	}

	public dispose() {
		this.isDisposed = true;
		this.services.off('message', this.sendMessageToWebview);
		this.services.deleteSandbox(this.id);

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _getHtmlForWebview( webview: vscode.Webview ) {
		// And the uri we use to load this script in the webview
		const scriptPathOnDisk = vscode.Uri.file(
			path.join(this._extensionPath, 'dist', 'bundle-webview.js')
		);
		const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

		const stylePathOnDisk = vscode.Uri.file(
			path.join(this._extensionPath, 'static', 'style.css')
		);
		const styleUri = webview.asWebviewUri(stylePathOnDisk);

		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();

		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<meta http-equiv="X-UA-Compatible" content="ie=edge">
			<!--
			Use a content security policy to only allow loading images from https or from our extension directory,
			and only allow scripts that have a specific nonce.

			meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
			-->
			<title>Document</title>
			<link rel="stylesheet" href="${styleUri}" />
		</head>
		<body>
			<header></header>
			<div id="content-wrapper"></div>
			<div id="contextmenu-wrapper" style="display:none"></div>
			<script nonce="${nonce}" src="${scriptUri}"></script>
		</body>
		</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
