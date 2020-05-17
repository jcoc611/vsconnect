'use strict';

import { ITransaction, IServiceMessage, ServiceAction, IServiceCall, ServiceActionTypes, IVisualization, ITransactionState, IVisualizationItem, OpenTextDocumentOptions, UITypes, BytesValue, ConsoleViewState } from "../interfaces";
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

	private webviewId?: number;

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

	private responsePromise?: DelegatedPromise<void>;

	private rerunQueue?: IVisualization[];

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
					this.updateUI(viz, this.currentRequest!, true);
				} else if (message.action.type === ServiceActionTypes.TextDocumentClosed) {
					const [ trackedDocId ] = message.action.params;
					delete this.trackedTextDocuments[trackedDocId];
				} else if (message.action.type === ServiceActionTypes.SetWebviewId) {
					const [ webviewId ] = message.action.params;
					this.webviewId = webviewId;
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
			webviewId,
			history, currentRequest, reqInHistory, resInHistory, reqCount, resCount,
			lastProtocol, protocols,
			trackedTextDocuments
		} = this;

		return encodeURI(JSON.stringify(<ConsoleViewState> {
			webviewId,
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
		vizCurrent: IVisualization,
		fromTextDocument: boolean = false
	): Promise<void> {
		if (this.currentRequest === undefined) {
			throw new Error('Cannot update UI if there is no current request');
		}

		if (vizItemChanged.handlerId === -1) {
			throw new Error('Ups should not do this');
		}

		// Promise
		// Cancels any pending updates to the same vizItem, to prevent staggering
		if (this.uiHandlerPromiseId[vizItemChanged.handlerId] !== undefined) {
			this.promiseStore.cancel(this.uiHandlerPromiseId[vizItemChanged.handlerId]);
		}
		let vizNewPromise = this.remoteCall({
			type: ServiceActionTypes.HandleVisualizationChange,
			params: [vizItemChanged, vizCurrent]
		});
		this.uiHandlerPromiseId[vizItemChanged.handlerId] = vizNewPromise.id;
		let vizNew: IVisualization;
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

	async getFunctionPreview(command: string): Promise<IVisualizationItem<any> | null> {
		return await this.remoteCall({
			type: ServiceActionTypes.PreviewInSandbox,
			params: [command]
		});
	}

	async rerun() {
		// 1) Prepare
		// 	- All outgoing items in history are moved to rerun queue
		let rerunQueueNew: IVisualization[] = [];
		for (let item of this.history) {
			if (item.context === 'outgoing') {
				rerunQueueNew.push(item);
			}
		}
		if (this.rerunQueue !== undefined) {
			rerunQueueNew.concat(this.rerunQueue);
		}
		this.rerunQueue = rerunQueueNew;

		this.history = [];
		this.reqInHistory = new Map();
		this.resInHistory = new Map();
		this.reqCount = 0;
		this.resCount = 0;
		this.triggerChange();

		// 	- Sandbox is cleared
		await this.remoteCall({
			type: ServiceActionTypes.ClearSandbox,
			params: []
		});

		// 2) for every req:
		while (this.rerunQueue!.length > 0) {
			// 	a) reviz & recompute valueFunction_s (vizCur -> tCur -> tNew -> vizNew)
			let item: IVisualization = this.rerunQueue.shift()!; // TODO: replace with more efficient data structure
			item = await this.revisualize(item);
			item = await this.recomputeFunctions(item);
			this.currentRequest = item;

			// 	b) send req, remove req from queue
			this.responsePromise = new DelegatedPromise(0);
			await this.sendCurrentRequest();

			// 	c) await res
			await this.responsePromise;
		}
	}

	getRerunQueue(): IVisualization[] | undefined {
		return this.rerunQueue;
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

		if (this.responsePromise !== undefined) {
			this.responsePromise.fulfill();
		}

		this.triggerChange();

		return this.resCount;
	}

	private async revisualize(viz: IVisualization): Promise<IVisualization> {
		return await this.remoteCall({
			type: ServiceActionTypes.Revisualize,
			params: [viz]
		});
	}

	private async recomputeFunctions(viz: IVisualization): Promise<IVisualization> {
		for (let item of viz.items) {
			if (item.valueFunction !== undefined) {
				// TODO: what happens if recomputeFunction returns wrongly-typed thing?
				item.value = await this.recomputeFunction(item.valueFunction, item.value);
			}
		}
		return viz;
	}

	private async recomputeFunction(valueFunction: unknown, value: any): Promise<any> {
		if (valueFunction === undefined || valueFunction === null)
			return value;

		if (typeof(valueFunction) === 'string') {
			let vizFn = await this.getFunctionPreview(valueFunction);
			if (vizFn === null)
				return null;

			return vizFn.value;
		} else if (typeof(valueFunction) === 'object') {
			if (Array.isArray(valueFunction)) {
				let valuesNew: any[] = [];
				for (let i = 0; i < valueFunction.length; i++) {
					valuesNew.push(await this.recomputeFunction(valueFunction[i], value[i]));
				}
				return valuesNew;
			} else {
				let valuesNew: { [key: string]: any } = {};
				for (let key in valueFunction) {
					//@ts-ignore I mean, here valueFunction has string keys, but TS doesn't know
					valuesNew[key] = await this.recomputeFunction(valueFunction[key], value[key]);
				}
				return valuesNew;
			}
		}

		return null;
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
		let prevStateEncoded = this.vscode.getState();
		if (prevStateEncoded) {
			let prevState: ConsoleViewState = JSON.parse(decodeURI(prevStateEncoded));
			this.webviewId = prevState.webviewId;
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

		// Revisualize old req so there is a chance to update stale visualizations
		this.revisualize(this.currentRequest).then((vizNew) => {
			this.currentRequest = vizNew;
			this.triggerChange();
		})
	}
}
