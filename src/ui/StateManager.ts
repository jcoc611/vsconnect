'use strict';

import { ITransaction, IServiceMessage, ServiceAction, IServiceCall, ServiceActionTypes, IVisualization, ITransactionState, IVisualizationItem, OpenTextDocumentOptions, UITypes, BytesValue, ConsoleViewState, ProtocolShortMetadata } from "../interfaces";
import { DelegatedPromise, PromiseCancelledError } from "../utils/DelegatedPromise";
import { ContextMenuContent, ContextMenuEvent } from "./components/ContextMenu";
import { DelegatedPromiseStore } from "../utils/DelegatedPromiseStore";
import { LinkedList, LLNode } from "../utils/LinkedList";
import { DOMUtils } from "./DOMUtils";

interface ITrackedDocument {
	vizItem: IVisualizationItem<BytesValue>;
	tId: number;
}

export class StateManager {
	private static instance : StateManager | null;
	static GetInstance(): StateManager {
		if ( !StateManager.instance ) {
			StateManager.instance = new StateManager();
		}

		return StateManager.instance;
	}

	private webviewId?: number;

	private changeListeners: Array<(newHistory: IVisualization[]) => void> = new Array();
	private history: LinkedList<IVisualization> = new LinkedList();
	private tIdInHistory: { [key: number]: LLNode<IVisualization> } = {}; // TODO: { key: WeakRef }
	private currentRequest?: IVisualization;

	private lastProtocol: string = '';
	private protocols?: ProtocolShortMetadata[];

	private vscode: any;
	private promiseStore: DelegatedPromiseStore = new DelegatedPromiseStore();
	private visualizerPromiseId: { [visualizerId: number]: number } = {};

	private historyWalkCurrent?: LLNode<IVisualization>;

	private trackedTextDocuments: { [key: number]: ITrackedDocument } = {};

	private contextMenuContent?: ContextMenuContent;
	private contextMenuLocation?: { top: number, left: number };

	private responsePromise?: DelegatedPromise<void>;

	private rerunQueue?: LinkedList<IVisualization>;

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
				switch (message.action.type)
				{
					case ServiceActionTypes.AppendResponse:
						this.addResponse(message.action.params[0]);
						break;
				
					case ServiceActionTypes.TextDocumentChanged:
						const [ trackedDocIdChange, contentNew ] = message.action.params;
						let doc: ITrackedDocument = this.trackedTextDocuments[trackedDocIdChange];
						// Viz is undefined if update was meant for different panel
						if (doc !== undefined) {
							doc.vizItem.value = contentNew;
							this.updateUI(doc.vizItem, doc.tId, true);
						}
						break;

					case ServiceActionTypes.TextDocumentClosed:
						const [ trackedDocIdClosed ] = message.action.params;
						delete this.trackedTextDocuments[trackedDocIdClosed];
						break;
				
					case ServiceActionTypes.SetWebviewId:
						const [ webviewId ] = message.action.params;
						this.webviewId = webviewId;
						break;

					case ServiceActionTypes.SendRequest:
						const [ tId ] = message.action.params;
						if (tId === -1)
							this.sendRequest(this.currentRequest!.transaction.id!);
						else
							this.sendRequest(tId);
						break;

					case ServiceActionTypes.AddConnection:
						const [ protocolIdNew, connectionIdNew ] = message.action.params;
						this.addProtocolConnection(protocolIdNew, connectionIdNew);
						if (this.currentRequest !== undefined
							&& this.currentRequest.transaction.protocolId === protocolIdNew
							&& !this.currentRequest.transaction.connectionId) {
								this.setProtocol(protocolIdNew); // refreshes current request
						}
						this.triggerChange();
							
						break;

					case ServiceActionTypes.RemoveConnection:
						const [ protocolIdRemove, connectionIdRemove ] = message.action.params;
						this.removeProtocolConnection(protocolIdRemove, connectionIdRemove);

						if (this.currentRequest !== undefined
							&& this.currentRequest.transaction.protocolId === protocolIdRemove
							&& this.currentRequest.transaction.connectionId === connectionIdRemove) {
								this.setProtocol(protocolIdRemove); // refreshes current request
						}
						break;

					default:
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
			if (
				event.key === 'ArrowUp'
				&& (
					event.target === document
					|| DOMUtils.hasParentWithClass(<HTMLElement> event.target, 'consoleLine')
				)
			) {
				event.preventDefault();
				this.historyWalk('up');
			} else if (
				event.key === 'ArrowDown'
				&& (
					event.target === document
					|| DOMUtils.hasParentWithClass(<HTMLElement> event.target, 'consoleLine')
				)
			) {
				event.preventDefault();
				this.historyWalk('down');
			} else if (event.key === 'Escape') {
				this.closeContextMenu();
			} else if (event.key === 'Enter' && event.ctrlKey && !event.shiftKey) {
				let reqNode = DOMUtils.getParentWithClass(<HTMLElement> event.target, 'request');
				let tId: number;
				if (reqNode === null) {
					tId = this.currentRequest!.transaction.id!;
				} else {
					tId = Number(reqNode.dataset.tid);
				}
				this.sendRequest(tId);
			} else if (event.key === 'Enter' && event.ctrlKey && event.shiftKey) {
				this.rerun();
				event.preventDefault();
			}
		});

		if (!this.attemptRestore())
			this.addNewRequest();
	}

	toJSON() {
		const {
			webviewId,
			history, currentRequest,
			lastProtocol, protocols,
			trackedTextDocuments
		} = this;

		return encodeURI(JSON.stringify(<ConsoleViewState> {
			webviewId,
			history: history.toArray(),
			currentRequest,
			lastProtocol,
		}));
	}

	getHistory(): IVisualization[] {
		return this.history.toArray();
	}

	onChange( callback: (newHistory: IVisualization[]) => void) {
		this.changeListeners.push(callback);
		callback( this.getHistory() );
	}

	async getAllProtocols(): Promise<ProtocolShortMetadata[]> {
		if (this.protocols !== undefined) {
			return this.protocols;
		}

		let protocols: ProtocolShortMetadata[] = await this.remoteCall({
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

	async sendRequest(tId: number) {
		let isCurrent: boolean = false;
		let vizReq: IVisualization;
		if (this.currentRequest !== undefined && this.currentRequest.transaction.id === tId) {
			isCurrent = true;
			vizReq = this.currentRequest;
			this.addRequest(this.currentRequest);
			this.currentRequest = undefined;
		} else if (this.tIdInHistory[tId] !== undefined) {
			// Resend old request - delete all responses for it
			vizReq = this.tIdInHistory[tId].value;
			let nodeCur = this.tIdInHistory[tId].next;
			while (nodeCur !== undefined && nodeCur.value.transaction.responseTo === tId) {
				this.history.remove(nodeCur);
				delete this.tIdInHistory[nodeCur.value.transaction.id!];
				nodeCur = nodeCur.next;
			}
		} else {
			return;
		}

		this.lastProtocol = vizReq.transaction.protocolId;
		this.historyWalkCurrent = undefined;

		await this.remoteCall({
			type: ServiceActionTypes.DoTransaction,
			params: [ vizReq.transaction ]
		});

		if (isCurrent) {
			await this.addNewRequest();
		} else {
			// Recompute fn of all after
			this.recomputeAllAfter(this.tIdInHistory[tId]);
		}

		this.triggerChange();
	}

	async setProtocol(protocolId: string) {
		if (this.currentRequest === undefined) {
			throw new Error('Cannot set protocol if there is no current request');
		}

		let connectionId = this.getFirstProtocolConnection(protocolId);
		this.currentRequest = await this.getNewRequest(protocolId, connectionId);
		this.triggerChange();
		window.scrollTo(0,document.body.scrollHeight);
	}

	hasProtocol(protocolId: string): boolean {
		if (this.protocols === undefined)
			throw new Error('Must getAllProtocols first!');

		for (let protocolMeta of this.protocols) {
			if (protocolMeta.id === protocolId)
				return true;
		}

		return false;
	}

	getProtocolMeta(protocolId: string): ProtocolShortMetadata | null {
		if (this.protocols === undefined)
			throw new Error('Must getAllProtocols first!');

		for (let protocolMeta of this.protocols) {
			if (protocolMeta.id === protocolId)
				return protocolMeta;
		}

		return null;
	}

	async setConnection(connectionId?: number) {
		if (this.currentRequest === undefined) {
			throw new Error('Cannot set protocol if there is no current request');
		}

		this.currentRequest = await this.getNewRequest(this.currentRequest.transaction.protocolId, connectionId);
		this.triggerChange();
		window.scrollTo(0, document.body.scrollHeight);
	}

	async updateUI(
		vizItemChanged: IVisualizationItem<any>,
		tId: number,
		fromTextDocument: boolean = false
	): Promise<void> {
		if (this.currentRequest === undefined) {
			throw new Error('Cannot update UI if there is no current request');
		}

		if (vizItemChanged.visualizerId === -1) {
			throw new Error('Virtual UI has no visualizer id, cannot process change for it.');
		}

		let isCurrent = (tId === this.currentRequest.transaction.id);
		let vizCur: IVisualization = (isCurrent)? this.currentRequest : this.tIdInHistory[tId].value;

		let vizNew: IVisualization | undefined = await this.handleUIChange(vizItemChanged, vizCur);
		if (vizNew === undefined) {
			return;
		}

		if (isCurrent) {
			this.currentRequest = vizNew;
		} else {
			this.tIdInHistory[tId].value = vizNew;
		}
		this.triggerChange();

		if (vizItemChanged.ui.type === UITypes.BytesString && !fromTextDocument) {
			let docId = this.getTrackingDocId(vizNew.transaction.id!, vizItemChanged);
			if (docId >= 0) {
				this.remoteCall(<ServiceAction> {
					type: ServiceActionTypes.TextDocumentChanged,
					params: [docId, vizItemChanged.value]
				});
			}
		}
	}

	private async handleUIChange(
		vizItemChanged: IVisualizationItem<any>,
		vizCur: IVisualization
	): Promise<IVisualization | undefined> {
		// Promise
		// Cancels any pending updates to the same vizItem, to prevent staggering
		if (this.visualizerPromiseId[vizItemChanged.visualizerId] !== undefined) {
			this.promiseStore.cancel(this.visualizerPromiseId[vizItemChanged.visualizerId]);
		}
		let vizNewPromise = this.remoteCall({
			type: ServiceActionTypes.HandleVisualizationChange,
			params: [vizItemChanged, vizCur]
		});
		this.visualizerPromiseId[vizItemChanged.visualizerId] = vizNewPromise.id;
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
		delete this.visualizerPromiseId[vizItemChanged.visualizerId];
		// Promise end

		return vizNew;
	}

	async openTextDocument(textDoc: OpenTextDocumentOptions, tId: number, vizItem: IVisualizationItem<BytesValue>) {
		let textDocId: number = await this.remoteCall({
			type: ServiceActionTypes.OpenTextDocument,
			params: [textDoc, tId]
		});
		this.trackedTextDocuments[textDocId] = { vizItem, tId };
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
		if (this.rerunQueue === undefined) {
			this.rerunQueue = new LinkedList<IVisualization>();
		}

		for (let node of this.history.nodesReversed()) {
			if (node.value.context === 'outgoing') {
				this.rerunQueue.prependN(node);
			}
		}

		this.tIdInHistory = {};
		this.historyWalkCurrent = undefined;
		this.history.clear();
		this.triggerChange();

		await this.clearSandbox();

		// 2) for every req:
		while (!this.rerunQueue!.isEmpty()) {
			// 	a) reviz & recompute valueFunction_s (vizCur -> tCur -> tNew -> vizNew)
			let item: IVisualization = this.rerunQueue.popFirst()!;
			item = await this.revisualize(item);
			item = await this.recomputeFunctions(item);
			this.currentRequest = item;

			// 	b) send req, remove req from queue
			this.responsePromise = new DelegatedPromise(0);
			await this.sendRequest(item.transaction.id!);

			// 	c) await res
			await this.responsePromise;
		}

		this.rerunQueue = undefined;
		this.triggerChange();
	}

	clear(): void {
		this.history.clear();
		this.tIdInHistory = {};
		this.historyWalkCurrent = undefined;
		this.currentRequest = undefined;
		this.rerunQueue = undefined;
		this.addNewRequest();
		this.clearSandbox();
	}

	getRerunQueue(): IVisualization[] | undefined {
		if (this.rerunQueue === undefined)
			return;

		return this.rerunQueue.toArray();
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
				id: -1,
				protocolId: '',
				state: ITransactionState.Dummy,
				shortStatus: '',
				components: {},
			},
			items: [],
		};

		let protocols: ProtocolShortMetadata[] = await this.getAllProtocols();
		let defaultProtocol: string;

		if (protocols.length === 0) {
			throw new Error("No protocols!");
		}

		if (this.hasProtocol(this.lastProtocol)) {
			defaultProtocol = this.lastProtocol;
		} else {
			defaultProtocol = protocols[0].id;
		}

		await this.setProtocol(defaultProtocol);
	}

	private getNewRequest(protocolId: string, connectionId?: number): Promise<IVisualization> {
		return this.remoteCall({
			type: ServiceActionTypes.GetNewRequest,
			params: [protocolId, connectionId]
		});
	}

	private addRequest(v: IVisualization): void {
		this.history.append(v);
		this.tIdInHistory[v.transaction.id!] = this.history.getLastN()!;
	}

	private addResponse(v: IVisualization): void {
		let tResponseTo = v.transaction.responseTo;
		if (tResponseTo !== undefined && this.tIdInHistory[tResponseTo]) {
			// Starting with the request, place new response after all existing responses for that
			// request.
			let nodeCur = this.tIdInHistory[tResponseTo];
			while (nodeCur.next !== undefined && nodeCur.next!.value.context === 'incoming') {
				nodeCur = nodeCur.next;
			}
			this.history.insertAfter(nodeCur, v);
			this.tIdInHistory[v.transaction.id!] = nodeCur.next!;
			this.recomputeAllAfter(nodeCur.next!);
		} else {
			this.history.append(v);
			this.tIdInHistory[v.transaction.id!] = this.history.getLastN()!;
		}

		if (this.responsePromise !== undefined) {
			this.responsePromise.fulfill();
		}

		this.triggerChange();
	}

	private getFirstProtocolConnection(protocolId: string): number | undefined {
		let protocolMeta = this.getProtocolMeta(protocolId);
		if (protocolMeta === null || protocolMeta.isConnectionOriented === false || protocolMeta.connections.length === 0)
			return undefined;

		return protocolMeta.connections[0];
	}


	private addProtocolConnection(protocolId: string, connectionId: number): void {
		let protocolMeta = this.getProtocolMeta(protocolId);
		if (protocolMeta === null || protocolMeta.isConnectionOriented === false)
			return;

		if (protocolMeta.connections.indexOf(connectionId) >= 0)
			return;

		protocolMeta.connections.push(connectionId);
	}

	private removeProtocolConnection(protocolId: string, connectionId: number): void {
		let protocolMeta = this.getProtocolMeta(protocolId);
		if (protocolMeta === null || protocolMeta.isConnectionOriented === false)
			return;

		protocolMeta.connections = protocolMeta.connections.filter((id) => id !== connectionId);
	}

	private async revisualize(viz: IVisualization): Promise<IVisualization> {
		return await this.remoteCall({
			type: ServiceActionTypes.Revisualize,
			params: [viz]
		});
	}

	private recomputeAllAfter(node: LLNode<IVisualization>): void {
		if (node === undefined) {
			return;
		}

		let nodeCur = node.next;
		while (nodeCur !== undefined) {
			if (nodeCur.value.context === 'outgoing') {
				this.recomputeInHistory(nodeCur);
			}
			nodeCur = nodeCur.next;
		}

		this.recomputeCurrentRequest();
	}

	private recomputeInHistory(node: LLNode<IVisualization>): void {
		this.recomputeFunctions(node.value).then((valueNew) => {
			node.value = valueNew;
			this.triggerChange();
		});
	}

	private recomputeCurrentRequest(): void {
		if (this.currentRequest === undefined)
			return;
		this.recomputeFunctions(this.currentRequest).then((valueNew) => {
			this.currentRequest = valueNew;
			this.triggerChange();
		});
	}

	private async recomputeFunctions(viz: IVisualization): Promise<IVisualization> {
		for (let item of viz.items) {
			if (item.valueFunction !== undefined) {
				// TODO: what happens if recomputeFunction returns wrongly-typed thing?
				item.value = await this.recomputeFunction(item.valueFunction, item.value);

				// Treat recompute as a UI change so the right thing happens for other visualizations
				viz = (await this.handleUIChange(item, viz))!;
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

	private async clearSandbox(): Promise<void> {
		await this.remoteCall({
			type: ServiceActionTypes.ClearSandbox,
			params: []
		});
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

	private getTrackingDocId(tId: number, vizItem: IVisualizationItem<any>): number {
		for (let docId of Object.keys(this.trackedTextDocuments)) {
			let doc = this.trackedTextDocuments[Number(docId)];
			if (doc.tId === tId && doc.vizItem.visualizerId == vizItem.visualizerId) {
				return Number(docId);
			}
		}

		return -1;
	}

	private attemptRestore(): boolean {
		let prevStateEncoded = this.vscode.getState();
		if (prevStateEncoded) {
			let prevState: ConsoleViewState = JSON.parse(decodeURI(prevStateEncoded));
			this.webviewId = prevState.webviewId;
			this.history = LinkedList.fromCollection(prevState.history);
			this.currentRequest = prevState.currentRequest;
			this.lastProtocol = prevState.lastProtocol;
			
			this.populateTIdInHistory();
			this.getAllProtocols().then((protocols) => {
				this.protocols = protocols;
				this.triggerChange();
			});
			return true;
		}
		return false;
	}

	private populateTIdInHistory(): void {
		this.tIdInHistory = {}
		for (let n of this.history.nodes()) {
			this.tIdInHistory[n.value.transaction.id!] = n;
		}
	}

	private historyWalk(direction: 'up' | 'down'): void {
		if (this.historyWalkCurrent === undefined) {
			if (direction == 'down') {
				return;
			} else {
				this.historyWalkCurrent = this.history.getLastN();
				while (this.historyWalkCurrent !== undefined && this.historyWalkCurrent.value.context === 'incoming') {
					this.historyWalkCurrent = this.historyWalkCurrent.prev;
				}

				// Sanity check here
				if (this.historyWalkCurrent === undefined) {
					return;
				}
			}
		} else if (direction == 'down') {
			this.historyWalkCurrent = this.historyWalkCurrent.next;
			while (this.historyWalkCurrent !== undefined && this.historyWalkCurrent.value.context === 'incoming') {
				this.historyWalkCurrent = this.historyWalkCurrent.next;
			}
		} else {
			this.historyWalkCurrent = this.historyWalkCurrent.prev;
			while (this.historyWalkCurrent !== undefined && this.historyWalkCurrent.value.context === 'incoming') {
				this.historyWalkCurrent = this.historyWalkCurrent.prev;
			}
		}

		if (this.historyWalkCurrent === undefined) {
			this.addNewRequest();
			return;
		}

		this.currentRequest = Object.assign(
			{}, this.historyWalkCurrent.value
		);
		this.triggerChange();

		// Revisualize old req so there is a chance to update stale visualizations
		this.revisualize(this.currentRequest).then((vizNew) => {
			this.currentRequest = vizNew;
			this.triggerChange();
		});
	}
}
