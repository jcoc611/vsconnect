'use strict';

import { ITransaction, IUserInterface, IVisualization, IVisualizationItem, ServiceAction, ServiceActionTypes, IContext, DefaultComponentUI, UITypes, ProtocolShortMetadata } from "./interfaces";
import { ProtocolHandler } from "./ProtocolHandler";
import { Visualizer } from "./visualizers/Visualizer";
import { EventEmitter } from "./utils/EventEmitter";

import { TextDocument } from 'vscode';
import { Store } from "./stores/Store";
import { Sandbox } from "./utils/Sandbox";
import { Formats } from "./utils/Formats";
import { StoreDatabase } from "./stores/StoreDatabase";


export interface ServicesState {
	storesData: string;
}

export interface TrackedDocument {
	/** transaction id */
	tId: number;

	/** panel id */
	sourceId: number;

	/** pointer to actual doc */
	document: TextDocument;
}

export class Services extends EventEmitter {
	private static instance?: Services;

	public static GetInstance(stateRestored?: ServicesState): Services {
		if (Services.instance === undefined) {
			Services.instance = new Services(stateRestored);
		}

		return Services.instance;
	}

	/** @var protocols  map of protocol names to handlers */
	private protocols: Map<string, ProtocolHandler> = new Map();

	private protocolConnections: { [protocolId: string]: Set<number> } = {};

	/** @var visualizers  list of visualizers */
	private visualizers: Visualizer<any>[] = [];

	private stores: Store<any>[] = [];
	private storeDb: StoreDatabase;

	private trackedDocuments: { [key: number]: TrackedDocument } = {};
	private trackedDocumentsCount: number = 0;

	private sandboxes: { [key: number]: Sandbox } = {};

	private tCount: number = 0;

	private constructor(stateRestored?: ServicesState) {
		super();

		if (stateRestored !== undefined) {
			this.storeDb = new StoreDatabase(JSON.parse(stateRestored.storesData));
		} else {
			this.storeDb = new StoreDatabase();
		}

		this.storeDb.on('change', () => this.trigger('change', 'stores', this.storeDb.toJSON()));
	}

	async process(action: ServiceAction, sourceId: number) : Promise<any> {
		switch (action.type) {
			// The UI requests all available protocols
			case ServiceActionTypes.GetAllProtocols:
				return this.getAllProtocols();

			// User selects one of the protocols (e.g. default one)
			case ServiceActionTypes.GetNewRequest:
				// - protocolHandler.getDefaultTransaction()
				// - getVisualization(ITransaction) - matching visualizers provide visualization
				const [protocolId, connectionId] = action.params;
				return this.getDefaultRequest(protocolId, connectionId);

			// User clones a transaction from the history
			// User reruns a transaction (with possibly different viz)
			case ServiceActionTypes.Revisualize:
				return this.revisualize(...action.params);

			// User edits transaction (request) using one of the Visualization items
			case ServiceActionTypes.HandleVisualizationChange:
				return this.onVisualizationItemChange(...action.params);

			// User submits transaction
			case ServiceActionTypes.DoTransaction:
				const [ tReq ] = action.params;
				return this.doTransaction(tReq, sourceId);

			// Protocol Handler gets a new response
			case ServiceActionTypes.VisualizeResponse:
				// Response transaction is converted into Visualization and sent to UI
				const [ tRes ] = action.params;
				return this.onResponse(tRes, sourceId);

			case ServiceActionTypes.GetConnectionState:
				// return true iff connectionIdQ is still connected
				const [ protocolIdQ, connectionIdQ ] = action.params;
				if (this.protocolConnections[protocolIdQ] === undefined)
					return false;
				else
					return (this.protocolConnections[protocolIdQ].has(connectionIdQ));

			// User opens a BinaryStringInput in a new text document
			case ServiceActionTypes.OpenTextDocument:
				const [openTextDocumentOptions, tId] = action.params;
				this.trigger('document:open', openTextDocumentOptions, tId, sourceId);
				return this.trackedDocumentsCount;

			// User makes a change on a BinaryStringInput synced with an open document
			case ServiceActionTypes.TextDocumentChanged:
				const [ docId, valueNew ] = action.params;
				if (valueNew.type === 'string') {
					this.trigger('document:change', this.trackedDocuments[docId], valueNew.rawValue);
				}
				// else this.trigger('document:change', ..., '<binary data>')
				break;

			// User types in scripting field
			case ServiceActionTypes.PreviewInSandbox:
				const [ strCode ] = action.params;
				return this.getOrCreateSandbox(sourceId).preview(strCode);

			// User requests rerunning requests
			case ServiceActionTypes.ClearSandbox:
				return this.clearSandbox(sourceId);
		}
	}

	getTrackedDocument(document: TextDocument) : TrackedDocument | null {
		for (let trackedDoc of Object.values(this.trackedDocuments))
		{
			if (trackedDoc.document == document)
				return trackedDoc;
		}

		return null;
	}

	trackTextDocument(textDocument: TextDocument, tId: number, sourceId: number): void {
		this.trackedDocuments[this.trackedDocumentsCount++] = { document: textDocument, tId, sourceId };
	}

	textDocumentDidChange(textDocument: TextDocument): void {
		for (let iStr of Object.keys(this.trackedDocuments)) {
			let i = Number(iStr);
			if (this.trackedDocuments[i].document === textDocument) {
				this.trigger('message', <ServiceAction> {
					type: ServiceActionTypes.TextDocumentChanged,
					params: [
						i,
						{
							type: 'string',
							rawValue: textDocument.getText(),
							languageHint: Formats.languageIdToMime(textDocument.languageId),
						}
					]
				});
				return;
			}
		}
	}

	textDocumentDidOpen(textDocument: TextDocument): void {
		for (let iStr of Object.keys(this.trackedDocuments)) {
			let i = Number(iStr);
			if (this.trackedDocuments[i].document === textDocument) {
				this.trigger('message', <ServiceAction> {
					type: ServiceActionTypes.TextDocumentChanged,
					params: [
						i,
						{
							type: 'string',
							rawValue: textDocument.getText(),
							languageHint: Formats.languageIdToMime(textDocument.languageId),
						}
					]
				});
				return;
			}
		}
	}

	textDocumentDidClose(textDocument: TextDocument): void {
		if (!textDocument.isClosed) {
			return;
		}

		for (let iStr of Object.keys(this.trackedDocuments)) {
			let i = Number(iStr);
			if (this.trackedDocuments[i].document === textDocument) {
				delete this.trackedDocuments[i];
				this.trigger('message', <ServiceAction> {
					type: ServiceActionTypes.TextDocumentClosed,
					params: [i]
				});
			}
		}
	}

	// Adding protocols
	addProtocol(handler: ProtocolHandler): void {
		let metadata = handler.getMetadata();
		if (this.protocols.has(metadata.id))
			throw new Error(`Duplicate protocol ${metadata.id}`);

		handler.on('response', (response: ITransaction, sourceId?: number) => {
			this.trigger('message', <ServiceAction> {
				type: ServiceActionTypes.AppendResponse,
				params: [ this.onResponse(response, sourceId) ]
			}, sourceId);
		});
		handler.on('connected', (connectionId: number, tIdConnect: number, sourceId?: number) => {
			if (this.protocolConnections[metadata.id] === undefined)
				this.protocolConnections[metadata.id] = new Set<number>();

			this.protocolConnections[metadata.id].add(connectionId);
			this.trigger('message', <ServiceAction> {
				type: ServiceActionTypes.AddConnection,
				params: [ metadata.id, connectionId, tIdConnect ]
			}, sourceId);
		});
		handler.on('disconnected', (connectionId: number, sourceId?: number) => {
			if (this.protocolConnections[metadata.id] === undefined
				|| !this.protocolConnections[metadata.id].has(connectionId)) {
					throw new Error("Unexpected connection.");
			}

			this.protocolConnections[metadata.id].delete(connectionId);
			this.trigger('message', <ServiceAction> {
				type: ServiceActionTypes.RemoveConnection,
				params: [ metadata.id, connectionId ]
			}, sourceId);
		});

		// Add default visualizers
		if (metadata.defaultVisualizers)
		{
			for (let i = 0; i < metadata.defaultVisualizers.length; i++)
				this.addVisualizer(metadata.defaultVisualizers[i]);
		}

		this.protocols.set(metadata.id, handler);
	}

	getProtocolHandler(name: string): ProtocolHandler {
		let handler = this.protocols.get(name);
		if ( handler === undefined ) {
			throw new Error(`Protocol with name ${name} not found.`);
		}

		return handler;
	}

	getAllProtocols(): ProtocolShortMetadata[] {
		let protocolsMeta : ProtocolShortMetadata[] = [];

		for (let handler of this.protocols.values()) {
			let metadata = handler.getMetadata();
			if (metadata.isConnectionOriented) {
				protocolsMeta.push({
					id: metadata.id,
					isConnectionOriented: true,
					connections: this.getProtocolConnections(metadata.id),
				});
			} else {
				protocolsMeta.push({ id: metadata.id, isConnectionOriented: false });
			}
		}

		return protocolsMeta;
	}

	getDefaultRequest(protocolId: string, connectionId?: number): IVisualization {
		let tDefault = this.getProtocolHandler(protocolId).getDefaultTransaction(connectionId);
		tDefault.id = this.tCount++;

		for (let store of this.stores) {
			if (store.shouldProcess(tDefault, 'outgoing')) {
				tDefault = store.populateDefaultRequest(tDefault);
			}
		}

		return this.getVisualization('outgoing', tDefault);
	}

	doTransaction(transaction: ITransaction, sourceId: number): void {
		let handler: ProtocolHandler;
		// if (transaction.connectionId !== undefined) {
		// 	if (this.connections.length <= transaction.connectionId) {
		// 		throw new Error(`Connection $conn${transaction.connectionId} doesn't exist`);
		// 	}
		// 	handler = this.connections[transaction.connectionId];
		// } else {
			handler = this.getProtocolHandler(transaction.protocolId);
		// }

		handler.send(transaction, sourceId);

		this.getOrCreateSandbox(sourceId).addRequest(transaction);
	}

	addVisualizer(visualizer: Visualizer<any>): void {
		this.visualizers.push(visualizer);
	}

	addStore(store: Store<any>): void {
		store.setDb(this.storeDb);
		this.stores.push(store);
	}

	private getVisualization(context: IContext, transaction: ITransaction): IVisualization {
		let items: IVisualizationItem<any>[] = [];
		let groupItems: { [key: string]: number } = {};

		for (let i = 0; i < this.visualizers.length; i++) {
			const visualizer = this.visualizers[i];
			if (!visualizer.shouldDisplay(transaction, context)) {
				continue;
			}

			const ui = visualizer.getUI(transaction, context);
			const viz: IVisualizationItem<any> = {
				visualizerId: i,
				ui,
				value: visualizer.getValueFromTransaction(transaction, context)
			};
			if (ui.location === 'extra' && groupItems[ui.name] !== undefined) {
				if (items[groupItems[ui.name]].ui.type == UITypes.OneOfMany) {
					if (items[groupItems[ui.name]].ui.count === undefined)
						items[groupItems[ui.name]].ui.count = ui.count;

					items[groupItems[ui.name]].value.push(viz);
				} else {
					items[groupItems[ui.name]] = {
						visualizerId: -1,
						ui: {
							location: 'extra',
							type: UITypes.OneOfMany,
							name: ui.name,
							contextType: ui.contextType,
							count: items[groupItems[ui.name]].ui.count || ui.count,
						},
						value: [ items[groupItems[ui.name]], viz ]
					}
				}
				continue;
			} else {
				groupItems[ui.name] = items.length;
			}

			items.push(viz);
		}

		return {
			context,
			items,
			transaction
		};
	}

	private revisualize(vizCurrent: IVisualization): IVisualization {
		let tNew = vizCurrent.transaction;

		// TODO: in certain cases, this is not enough. Issues when multiple components should
		// recompute and the expected output is given by calling one or more visualizers twice.
		for (let visualizer of this.visualizers) {
			if (visualizer.shouldRecompute(tNew, tNew)) {
				tNew = visualizer.getTransactionFromValue(
					visualizer.getValueFromTransaction(tNew, 'outgoing'),
					tNew
				);
			}
		}

		for (let store of this.stores) {
			if (store.shouldProcess(tNew, 'outgoing')) {
				tNew = store.populateDefaultRequest(tNew);
			}
		}

		let vizNewFromT = this.getVisualization(vizCurrent.context, tNew);
		return this.mergeVizChange(vizCurrent, vizNewFromT);
	}

	private onVisualizationItemChange(
		vizItem: IVisualizationItem<any>,
		vizCurrent: IVisualization
	): IVisualization {
		let tCurrent = vizCurrent.transaction;
		let tNew = this.visualizers[vizItem.visualizerId].getTransactionFromValue(vizItem.value, tCurrent);

		// TODO: in certain cases, this is not enough. Issues when multiple components should
		// recompute and the expected output is given by calling one or more visualizers twice.
		for (let visualizer of this.visualizers) {
			if (visualizer.shouldRecompute(tCurrent, tNew)) {
				tNew = visualizer.getTransactionFromValue(
					visualizer.getValueFromTransaction(tNew, 'outgoing'),
					tNew
				);
			}
		}

		for (let store of this.stores) {
			if (store.shouldProcess(tNew, 'outgoing')) {
				tNew = store.didRequestChange(tCurrent, tNew);
			}
		}

		let vizNewFromT = this.getVisualization(vizCurrent.context, tNew);
		return this.mergeVizChange(vizCurrent, vizNewFromT, vizItem);
	}

	private onResponse(tResponse: ITransaction, sourceId?: number): IVisualization {
		tResponse.id = this.tCount++;

		if (sourceId !== undefined)
			this.getOrCreateSandbox(sourceId).addResponse(tResponse);

		for (let store of this.stores) {
			if (store.shouldProcess(tResponse, 'incoming')) {
				store.didReceiveResponse(tResponse);
			}
		}

		return this.getVisualization('incoming', tResponse);
	}

	private getProtocolConnections(protocolId: string) : number[] {
		let protocolConnections: number[] = [];
		if (this.protocolConnections[protocolId] === undefined)
			return protocolConnections;

		for (let connectionId of this.protocolConnections[protocolId]) {
			protocolConnections.push(connectionId);
		}
		return protocolConnections;
	}

////#region Scripting viz helpers
	private matchesVizType(u: unknown, type: UITypes): boolean {
		switch (type) {
			case UITypes.KeyValues:

				break;
			case UITypes.Enum:
				break;
			case UITypes.String:
				return (typeof(u) === 'string');

			case UITypes.Host:
				// TODO
				return false;
				break;
			case UITypes.BytesBinary:
				break;
			case UITypes.BytesString:
				break;
			case UITypes.BytesInline:
				break;
			case UITypes.Textarea:
				break;
			case UITypes.Table:
				break;
			case UITypes.Boolean:
				return (typeof(u) === 'boolean');
				break;
			case UITypes.Object:
				return (typeof(u) === 'object');
				break;
			case UITypes.HTML:
				return (typeof(u) === 'string');
				break;

			// Collections
			case UITypes.OneOfMany:
				// TODO
				return false;
			case UITypes.Form:
				return false;

			default:
				return false;
		}

		//debug: unreachable
		return false;
	}

	private mergeVizChange(
		vizOld: IVisualization,
		vizNew: IVisualization,
		vizItem?: IVisualizationItem<any>
	): IVisualization {
		let vizItemsMerged = this.mergeVizItemsChange(vizOld.items, vizNew.items, vizItem);
		vizNew.items = vizItemsMerged;
		return vizNew;
	}

	private mergeVizItemsChange(
		vizOld: IVisualizationItem<any>[],
		vizNew: IVisualizationItem<any>[],
		vizItemChanged?: IVisualizationItem<any>
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
			if (itemOld.visualizerId == itemNew.visualizerId) {
				if (vizItemChanged !== undefined && itemNew.visualizerId == vizItemChanged.visualizerId) {
					itemNew.valueFunction = vizItemChanged.valueFunction;
					itemNew.valuePreview = vizItemChanged.valuePreview;
				} else if (itemNew.ui.type === UITypes.OneOfMany) {
					// OneOfMany item has value of type IVisualizationItem[]
					itemNew.value = this.mergeVizItemsChange(itemOld.value, itemNew.value, vizItemChanged);
				} else if (itemOld.valueFunction !== undefined && this.isEqualDeep(itemOld.value, itemNew.value)) {
					itemNew.valueFunction = itemOld.valueFunction;
					itemNew.valuePreview = itemOld.valuePreview;
				}
				iOld++;
				iNew++;
			} else if (itemOld.visualizerId < itemNew.visualizerId) {
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
////#endregion

///#region Sandbox helpers
	private getOrCreateSandbox(sourceId: number): Sandbox {
		if (this.sandboxes[sourceId] === undefined)
			this.sandboxes[sourceId] = new Sandbox();

		return this.sandboxes[sourceId];
	}

	private clearSandbox(sourceId: number) {
		delete this.sandboxes[sourceId];
		this.sandboxes[sourceId] = new Sandbox();
	}

	deleteSandbox(sourceId: number): void {
		delete this.sandboxes[sourceId];
	}

	restoreSandbox(sourceId: number, history: IVisualization[]): void {
		if (this.sandboxes[sourceId] !== undefined)
			return;

		let sandbox = new Sandbox();
		for (let viz of history) {
			if (viz.context === 'outgoing')
				sandbox.addRequest(viz.transaction);
			else
				sandbox.addResponse(viz.transaction);
		}
		this.sandboxes[sourceId] = sandbox;
	}
///#endregion
}
