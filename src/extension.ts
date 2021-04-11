'use strict';

import * as vscode from 'vscode';
import { ServiceAction, IServiceCall, IServiceResult, OpenTextDocumentOptions, ConsoleViewState, ServiceActionTypes } from './interfaces';
import { Services } from './Services';
import { registerBuiltins } from './registerBuiltins';
import { ClientView } from './views/ClientView';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('vsConnectClient.start', () => {
			ClientView.create(context.extensionPath);
		}),
		vscode.commands.registerCommand('vsConnectClient.sendCurrentRequest', () => {
			let document = vscode.window.activeTextEditor?.document;
			if (document !== undefined)
			{
				let trackedDocument = Services.GetInstance().getTrackedDocument(document);
				if (trackedDocument != null)
				{
					let editor = ClientView.withTrackedDocument(trackedDocument);
					if (editor != null)
					{
						editor.sendRequest(trackedDocument.tId);
						return;
					}
				}
			}
			// else, send the current request of the first visible client view
			
			let editor = ClientView.firstVisible();
			if (editor !== null)
				editor.sendCurrentRequest();
		})
	);

	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(ClientView.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, stateEncoded: any) {
				// TODO: modify state, recompute viz
				// TODO: restore sandbox state here
				let state: ConsoleViewState = JSON.parse(decodeURI(stateEncoded));
				Services.GetInstance().restoreSandbox(state.webviewId, state.history);
				ClientView.revive(webviewPanel, context.extensionPath, state.webviewId);
			}
		});
	}

	setupServices(context);
}

function setupServices(context: vscode.ExtensionContext) {
	let services = Services.GetInstance({
		storesData: context.globalState.get('stores', '{}'),
	});
	let disposables: vscode.Disposable[] = [];

	registerBuiltins(services);

	services.on('change', (nameComponent: string, valueNew: any) => {
		context.globalState.update(nameComponent, valueNew);
	});
	services.on('document:open', (docOptions: OpenTextDocumentOptions, tId: number, sourceId: number) =>
		vscode.workspace.openTextDocument({
			language: docOptions.language,
			content: docOptions.content,
		}).then((textDocument) => {
			if (docOptions.shouldSync) {
				services.trackTextDocument(textDocument, tId, sourceId);
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
	vscode.workspace.onDidOpenTextDocument(
		(docOpened) => services.textDocumentDidOpen(docOpened),
		null,
		disposables
	);
	vscode.workspace.onDidCloseTextDocument(
		(docClosed) => services.textDocumentDidClose(docClosed),
		null,
		disposables
	);
}
