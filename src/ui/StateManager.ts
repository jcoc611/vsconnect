'use strict';

import { ITransaction, IServiceMessage, ServiceAction, IServiceCall, ServiceActionTypes, IVisualization, ITransactionState, IVisualizationItem, OpenTextDocumentOptions, UITypes, BytesValue } from "../interfaces";
import { DelegatedPromise, PromiseCancelledError } from "../utils/DelegatedPromise";
import { ContextMenuContent, ContextMenuEvent } from "./components/ContextMenu";
import { DelegatedPromiseStore } from "../utils/DelegatedPromiseStore";

export class StateManager {
	private static instance : StateManager | null;
	static GetInstance(): StateManager {
		if ( !StateManager.instance ) {
			StateManager.instance = new StateManager();
		}

		return StateManager.instance;
	}

	changeListeners: Array<(newHistory: IVisualization[]) => void> = new Array();
	private history: IVisualization[] = [];
	private currentRequest?: IVisualization;

	private reqInHistory: Map<number, number> = new Map();
	private resInHistory: Map<number, number> = new Map();
	private reqCount: number = 0;
	private resCount: number = 0;

	private lastProtocol: string = '';
	private protocols?: string[];

	private vscode: any;
	private promiseStore: DelegatedPromiseStore = new DelegatedPromiseStore();
	private uiHandlerPromiseId: { [handlerId: number]: number } = {};

	private historyWalkCurrent: number = -1;

	private trackedTextDocuments: { [key: number]: IVisualizationItem<BytesValue> } = {};

	private contextMenuContent?: ContextMenuContent;
	private contextMenuLocation?: { top: number, left: number };

	private constructor() {
		// @ts-ignore because function does not exist in dev environment
		// eslint-disable-next-line
		this.vscode = acquireVsCodeApi();

		window.addEventListener( 'message', (event) => {
			const message: IServiceMessage = event.data; // The json data that the extension sent
			if (message.type === 'result') {
				if (this.promiseStore.has(message.promiseId)) {
					this.promiseStore.fulfill(message.promiseId, message.result);
				} else {
					console.error(`Dropped response with ID ${message.promiseId}, promise not found.`);
				}
			} else if (message.type === 'call') {
				if (message.action.type === ServiceActionTypes.AppendResponse) {
					this.addResponse(message.action.params[0]);
				} else if (message.action.type === ServiceActionTypes.TextDocumentChanged) {
					const [ trackedDocId, contentNew ] = message.action.params;
					let viz: IVisualizationItem<BytesValue> = this.trackedTextDocuments[trackedDocId];
					viz.value = contentNew;
					this.updateUI(viz, this.currentRequest!.transaction, true);
				} else if (message.action.type === ServiceActionTypes.TextDocumentClosed) {
					const [ trackedDocId ] = message.action.params;
					delete this.trackedTextDocuments[trackedDocId];
				} else {
					throw new Error(`UI received action call of unexpected type ${message.action.type}`);
				}
			} else {
				throw new Error(`Received message of unknown type`);
			}
		} );

		// @ts-ignore custom event support not there yet
		window.addEventListener('vsconnect:contextmenu', (event: ContextMenuEvent) => {
			this.contextMenuLocation = {
				top: event.detail.pageY,
				left: event.detail.pageX
			}
			this.contextMenuContent = event.detail.content;
			this.triggerChange();
		});

		window.addEventListener('vsconnect:contextmenu:close', () => this.closeContextMenu());

		document.addEventListener('keydown', (event) => {
			if (event.key === 'ArrowUp' && this.historyWalkCurrent + 1 < this.reqCount) {
				event.preventDefault();
				this.historyWalkCurrent++;
				this.duplicateFromHistory();
			} else if (event.key === 'ArrowDown' && this.historyWalkCurrent >= 0) {
				event.preventDefault();
				this.historyWalkCurrent--;
				this.duplicateFromHistory();
			} else if (event.key === 'Escape') {
				this.closeContextMenu();
			}
		});

		if (!this.attemptRestore())
			this.addNewRequest();
	}

	toJSON() {
		const {
			history, currentRequest, reqInHistory, resInHistory, reqCount, resCount,
			lastProtocol, protocols,
			trackedTextDocuments
		} = this;

		return encodeURI(JSON.stringify({
			history, currentRequest,
			reqInHistory: Array.from(reqInHistory.entries()),
			resInHistory: Array.from(resInHistory.entries()),
			reqCount, resCount, lastProtocol, protocols,
			trackedTextDocuments
		}));
	}

	getHistory(): IVisualization[] {
		return this.history;
	}

	onChange( callback: (newHistory: IVisualization[]) => void) {
		this.changeListeners.push(callback);
		callback( this.getHistory() );
	}

	async getAllProtocols(): Promise<string[]> {
		if (this.protocols !== undefined) {
			return this.protocols;
		}

		let protocols: string[] = await this.remoteCall({
			type: ServiceActionTypes.GetAllProtocols,
			params: []
		});
		this.protocols = protocols;

		return protocols;
	}

	getCurrentRequest(): IVisualization {
		if (this.currentRequest === undefined) {
			throw new Error('Unexpected: No current request');
		}

		return this.currentRequest;
	}

	// For React

	async sendCurrentRequest() {
		const currentRequest: IVisualization = this.getCurrentRequest();

		this.lastProtocol = currentRequest.transaction.protocolId;
		this.historyWalkCurrent = -1;
		this.addRequest(currentRequest);
		this.currentRequest = undefined;
		await this.addNewRequest();
		await this.remoteCall({
			type: ServiceActionTypes.DoTransaction,
			params: [ currentRequest.transaction ]
		});
	}

	async setProtocol(protocolId: string) {
		if (this.currentRequest === undefined) {
			throw new Error('Cannot set protocol if there is no current request');
		}

		this.currentRequest = await this.getNewRequest(protocolId);
		this.triggerChange();
	}

	async updateUI(
		vizItemChanged: IVisualizationItem<any>,
		currentTransaction: ITransaction,
		fromTextDocument: boolean = false
	): Promise<void> {
		if ( this.currentRequest === undefined ) {
			throw new Error('Cannot update UI if there is no current request');
		}

		if (vizItemChanged.handlerId === -1) {
			throw new Error('Ups should not do this');
		}

		// Promise
		if (this.uiHandlerPromiseId[vizItemChanged.handlerId] !== undefined) {
			this.promiseStore.cancel(this.uiHandlerPromiseId[vizItemChanged.handlerId]);
		}
		let vizNewPromise = this.remoteCall({
			type: ServiceActionTypes.HandleVisualizationChange,
			params: [vizItemChanged, currentTransaction]
		});
		this.uiHandlerPromiseId[vizItemChanged.handlerId] = vizNewPromise.id;
		let vizNew;
		try {
			vizNew = await vizNewPromise;
		} catch (e) {
			if (e instanceof PromiseCancelledError) {
				return;
			} else {
				throw e;
			}
		}
		delete this.uiHandlerPromiseId[vizItemChanged.handlerId];
		// Promise end

		this.currentRequest = vizNew;
		// TODO: Scripting
		// this.currentRequest = this.mergeVizChange(this.currentRequest, vizNew, vizItemChanged);
		this.triggerChange();

		if (vizItemChanged.ui.type === UITypes.BytesString && !fromTextDocument) {
			let docId = this.isTrackingDoc(vizItemChanged);
			if (docId >= 0) {
				this.remoteCall(<ServiceAction> {
					type: ServiceActionTypes.TextDocumentChanged,
					params: [docId, vizItemChanged.value]
				});
			}
		}
	}

	async openTextDocument(textDoc: OpenTextDocumentOptions, viz: IVisualizationItem<BytesValue>) {
		let textDocId: number = await this.remoteCall({
			type: ServiceActionTypes.OpenTextDocument,
			params: [textDoc]
		});
		this.trackedTextDocuments[textDocId] = viz;
	}

	async getCommandPreview(command: string): Promise<IVisualizationItem<any> | null> {
		return await this.remoteCall({
			type: ServiceActionTypes.PreviewInSandbox,
			params: [command]
		});
	}

	// context menus
	hasContextMenu() : boolean {
		return (this.contextMenuContent !== undefined && this.contextMenuContent.items.length > 0);
	}

	getContextMenuContent(): ContextMenuContent | undefined {
		return this.contextMenuContent;
	}

	getContextMenuLocation(): { top: number, left: number } {
		return this.contextMenuLocation!;
	}

	closeContextMenu(): void {
		if (this.hasContextMenu()) {
			this.contextMenuContent = undefined;
			this.contextMenuLocation = undefined;
			this.triggerChange();
		}
	}

	private async addNewRequest(): Promise<void> {
		this.currentRequest = {
			context: 'outgoing',
			transaction: {
				protocolId: '',
				state: ITransactionState.Dummy,
				shortStatus: '',
				components: {},
			},
			items: [],
		};

		let protocols: string[] = await this.getAllProtocols();
		let defaultProtocol: string;

		if (protocols.length === 0) {
			throw new Error("No protocols!");
		}

		if (protocols.indexOf(this.lastProtocol) >= 0) {
			defaultProtocol = this.lastProtocol;
		} else {
			defaultProtocol = protocols[0];
		}

		await this.setProtocol(defaultProtocol);
	}

	private getNewRequest(protocolId: string): Promise<IVisualization> {
		return this.remoteCall({
			type: ServiceActionTypes.GetNewRequest,
			params: [protocolId]
		});
	}

	private addRequest(v: IVisualization): number {
		this.reqInHistory.set(this.reqCount, this.history.length);
		this.history.push(v);
		this.reqCount++;

		// this.triggerChange();

		return this.reqCount;
	}

	private addResponse(v: IVisualization): number {
		this.resInHistory.set(this.resCount, this.history.length);
		this.history.push(v);
		this.resCount++;

		this.triggerChange();

		return this.resCount;
	}

	// TODO: response always immutable?
	// private updateResponse( resIndex: number, newViz: IVisualization ) {
	// 	...
	// }

	private remoteCall(action: ServiceAction): DelegatedPromise<any> {
		let newPromise = this.promiseStore.create();

		let serviceCall: IServiceCall = {
			type: 'call',
			action,
			promiseId: newPromise.id,
		};
		this.vscode.postMessage( serviceCall );

		return newPromise;
	}

	private triggerChange() {
		this.vscode.setState(this.toJSON());
		const h = this.getHistory();
		for ( let callback of this.changeListeners ) {
			callback(h);
		}
	}

	private isTrackingDoc(viz: IVisualizationItem<any>): number {
		for (let docId of Object.keys(this.trackedTextDocuments)) {
			let vizTracked = this.trackedTextDocuments[Number(docId)];
			if (vizTracked.handlerId == viz.handlerId && vizTracked.ui.name === viz.ui.name)
				return Number(docId);
		}

		return -1;
	}

	private attemptRestore(): boolean {
		let prevState = this.vscode.getState();
		if (prevState) {
			prevState = JSON.parse(decodeURI(prevState));
			this.history = prevState.history;
			this.currentRequest = prevState.currentRequest;
			this.reqInHistory = new Map(prevState.reqInHistory);
			this.resInHistory = new Map(prevState.resInHistory);
			this.reqCount = prevState.reqCount;
			this.resCount = prevState.resCount;
			this.lastProtocol = prevState.lastProtocol;
			this.protocols = prevState.protocols;
			this.trackedTextDocuments = prevState.trackedTextDocuments;

			this.triggerChange();
			return true;
		}
		return false;
	}

	private duplicateFromHistory(): void {
		if (this.historyWalkCurrent < 0) {
			this.addNewRequest();
			return;
		}

		let reqIndex = this.reqCount - this.historyWalkCurrent - 1;
		this.currentRequest = Object.assign(
			{}, this.history[this.reqInHistory.get(reqIndex)!]
		);
		this.triggerChange();
	}

	private mergeVizChange(
		vizOld: IVisualization,
		vizNew: IVisualization,
		vizItem: IVisualizationItem<any>
	): IVisualization {
		let vizItemsMerged = this.mergeVizItemsChange(vizOld.items, vizNew.items, vizItem);
		vizNew.items = vizItemsMerged;
		return vizNew;
	}

	private mergeVizItemsChange(
		vizOld: IVisualizationItem<any>[],
		vizNew: IVisualizationItem<any>[],
		vizItemChanged: IVisualizationItem<any>
	): IVisualizationItem<any>[] {
		// in place for vizNew
		// The issue is that the vizOld goes through a roundtrip of [vizItem, t] -> tNew -> vizNew
		// on the services side (node), and in the process loses the valueFunction data, because it
		// isn't stored on the transaction.
		// Kind of a hack, but is the easiest way to preserve valueFunction data since it's not
		// desirable to put it on the transaction.
		let iOld = 0, iNew = 0;
		while (iOld < vizOld.length && iNew < vizNew.length) {
			let itemOld = vizOld[iOld];
			let itemNew = vizNew[iNew];
			if (itemOld.handlerId == itemNew.handlerId) {
				if (itemNew.handlerId == vizItemChanged.handlerId) {
					itemNew.valueFunction = vizItemChanged.valueFunction;
				} else if (itemNew.ui.type === UITypes.OneOfMany) {
					// OneOfMany item has value of type IVisualizationItem[]
					itemNew.value = this.mergeVizItemsChange(itemOld.value, itemNew.value, vizItemChanged);
				} else if (itemOld.valueFunction !== undefined && this.isEqualDeep(itemOld.value, itemNew.value)) {
					itemNew.valueFunction = itemOld.valueFunction;
				}
				iOld++;
				iNew++;
			} else if (itemOld.handlerId < itemNew.handlerId) {
				iOld++;
			} else {
				iNew++;
			}
		}

		return vizNew;
	}

	private isEqualDeep(a: unknown, b: unknown): boolean {
		if (typeof(a) === 'object' && typeof(b) === 'object') {
			if (Array.isArray(a) && Array.isArray(b)) {
				if (a.length !== b.length)
					return false;

				for (let i = 0; i < a.length; i++) {
					if (!this.isEqualDeep(a[i], b[i])) {
						return false;
					}
				}

				return true;
			} else if (a === null || b === null) {
				return (a === b);
			} else {
				for (let key in a) {
					if (!(key in b)) {
						return false;
					// @ts-ignore not sure why type checking is failing here
					} else if (!this.isEqualDeep(a[key], b[key])) {
						return false;
					}
				}

				return true;
			}
		} else {
			return (a === b);
		}
	}
}
