'using strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { ServiceAction, IServiceCall, IServiceResult, OpenTextDocumentOptions, ConsoleViewState, ServiceActionTypes } from '../interfaces';
import { Services, TrackedDocument } from '../Services';

export class ClientView {
	public static readonly viewType = 'vsConnectClient';

	private static clientsCount: number = 1; // != clients.length
	private static clients: ClientView[] = [];

	private readonly panel: vscode.WebviewPanel;
	private readonly extensionPath: string;
	private services: Services;
	private id: number;

	private disposables: vscode.Disposable[] = [];
	private isDisposed: boolean = false;

	private constructor(panel: vscode.WebviewPanel, extensionPath: string, id: number) {
		this.id = id;
		this.panel = panel;
		this.extensionPath = extensionPath;

		// Set the webview's initial html content
		this.panel.iconPath = vscode.Uri.file(path.join(extensionPath, 'static', 'VSConnectLogo.svg'));
		this.panel.webview.html = this._getHtmlForWebview(this.panel.webview);

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

		this.services = Services.GetInstance();

		// Handle messages to the webview
		this.services.on('message', this.sendMessageToWebview);

		// Handle messages from the webview
		this.panel.webview.onDidReceiveMessage(
			(message) => {
				let call: IServiceCall = message;
				this.services.process(call.action, this.id).then( (result: any) => {
					if (!this.isDisposed) {
						let svcResult: IServiceResult = {
							type: 'result',
							promiseId: call.promiseId,
							result
						};
						this.panel.webview.postMessage(svcResult);
					}
				} );
			},
			null,
			this.disposables
		);

		let svcReq: IServiceCall = {
			type: 'call',
			promiseId: -1,
			action: {
				type: ServiceActionTypes.SetWebviewId,
				params: [id]
			}
		}
		this.panel.webview.postMessage(svcReq);
	}

	public static firstVisible(): ClientView | null {
		for (let i = 1; i < ClientView.clientsCount; i++)
			if (ClientView.clients[i] !== undefined && ClientView.clients[i].panel.visible)
				return ClientView.clients[i];

		return null;
	}

	public static withTrackedDocument(trackedDocument: TrackedDocument) : ClientView | null {
		return ClientView.clients[trackedDocument.sourceId];
	}

	public static create(extensionPath: string) {
		const column: vscode.ViewColumn = (vscode.window.activeTextEditor !== undefined)
			? vscode.window.activeTextEditor.viewColumn!
			: vscode.ViewColumn.One;

		// Otherwise, create a new panel.
		let count: number = ClientView.clientsCount++;
		const panel = vscode.window.createWebviewPanel(
			ClientView.viewType,
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

		let editor = new ClientView(panel, extensionPath, count);
		ClientView.clients[count] = editor;
		return editor;
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string, id: number) {
		if (ClientView.clientsCount <= id) {
			ClientView.clientsCount = id + 1;
		}
		let editor = new ClientView(panel, extensionPath, id);
		ClientView.clients[id] = editor;
		panel.webview.html = editor._getHtmlForWebview(panel.webview);
	}

	sendMessageToWebview = (action: ServiceAction, sourceId?: number): void => {
		if (sourceId !== undefined && sourceId !== this.id)
			return;

		let svcCall: IServiceCall = {
			type: 'call',
			promiseId: -1, // TODO implement result handling if needed
			action
		};
		this.panel.webview.postMessage(svcCall);
	}

	/**
	 * Triggers the sending of a request in this client.
	 * @param tId transaction id, -1 for "current"
	 */
	public sendRequest(tId: number): void {
		let svcCallSend: IServiceCall = {
			type: 'call',
			promiseId: -1,
			action: {
				type: ServiceActionTypes.SendRequest,
				params: [tId]
			}
		}
		this.panel.webview.postMessage(svcCallSend);
	}
	public sendCurrentRequest(): void { this.sendRequest(-1); }

	public dispose() {
		delete ClientView.clients[this.id];
		this.isDisposed = true;
		this.services.off('message', this.sendMessageToWebview);
		this.services.deleteSandbox(this.id);

		// Clean up our resources
		this.panel.dispose();

		while (this.disposables.length) {
			const x = this.disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _getHtmlForWebview( webview: vscode.Webview ): string {
		// And the uri we use to load this script in the webview
		const scriptPathOnDisk = vscode.Uri.file(
			path.join(this.extensionPath, 'dist', 'bundle-webview.js')
		);
		const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

		const stylePathOnDisk = vscode.Uri.file(
			path.join(this.extensionPath, 'static', 'style.css')
		);
		const styleUri = webview.asWebviewUri(stylePathOnDisk);

		// Use a nonce to whitelist which scripts can be run
		const nonce = this.getNonce();

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
			<header id="topBar-wrapper"></header>
			<div id="content-wrapper"></div>
			<div id="contextmenu-wrapper" style="display:none"></div>
			<script nonce="${nonce}" src="${scriptUri}"></script>
		</body>
		</html>`;
	}

	private getNonce(): string {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}
}
