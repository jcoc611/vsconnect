import * as path from 'path';
import * as vscode from 'vscode';
import { ServiceAction, IServiceCall, IServiceResult } from './interfaces';
import { Services } from './Services';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('catCoding.start', () => {
			CatCodingPanel.createOrShow(context.extensionPath);
		})
	);

	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(CatCodingPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				console.log(`Got state: ${state}`);
				CatCodingPanel.revive(webviewPanel, context.extensionPath);
			}
		});
	}
}

/**
 * Manages cat coding webview panels
 */
class CatCodingPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: CatCodingPanel | undefined;

	public static readonly viewType = 'catCoding';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];
	private services: Services;

	public static createOrShow(extensionPath: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (CatCodingPanel.currentPanel) {
			CatCodingPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			CatCodingPanel.viewType,
			'VSConnect: Client',
			column || vscode.ViewColumn.One,
			{
				// Enable javascript in the webview
				enableScripts: true,

				// And restrict the webview to only loading content from our extension's `media` directory.
				localResourceRoots: [
					vscode.Uri.file(path.join(extensionPath, 'dist-webview')),
					vscode.Uri.file(path.join(extensionPath, 'static'))
				],
			}
		);

		CatCodingPanel.currentPanel = new CatCodingPanel(panel, extensionPath);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
		CatCodingPanel.currentPanel = new CatCodingPanel(panel, extensionPath);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

		// Set the webview's initial html content
		// this._update();
		this._panel.iconPath = vscode.Uri.file(path.join(extensionPath, 'static', 'VSConnectLogo.svg'));
		this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					// this._update();
				}
			},
			null,
			this._disposables
		);

		this.services = new Services();
		this.services.on('message', (action: ServiceAction) => {
			let svcCall: IServiceCall = {
				type: 'call',
				promiseId: 0, // TODO implement result handling if needed
				action
			};
			this._panel.webview.postMessage(svcCall);
		});

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			(message) => {
				let call: IServiceCall = message;
				this.services.process(call.action).then( (result: any) => {
					if (result !== undefined) {
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
	}

	public dispose() {
		CatCodingPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		// const webview = this._panel.webview;

		// Vary the webview's content based on where it is located in the editor.
		switch (this._panel.viewColumn) {
			case vscode.ViewColumn.Two:
				return;

			case vscode.ViewColumn.Three:
				return;

			case vscode.ViewColumn.One:
			default:
				return;
		}
	}

	private _getHtmlForWebview( webview: vscode.Webview ) {
		// Local path to main script run in the webview
		// const uiPathOnDisk = vscode.Uri.file(
		// 	path.join(this._extensionPath, 'static', 'ui.html')
		// );

		// return fs.readFileSync( uiPathOnDisk.fsPath, { encoding: 'utf8' } )


		// And the uri we use to load this script in the webview
		const scriptPathOnDisk = vscode.Uri.file(
			path.join(this._extensionPath, 'dist-webview', 'bundle.js')
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
