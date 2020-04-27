import { ITransaction, IUserInterface, IVisualization, IVisualizationItem, ServiceAction, ServiceActionTypes, IContext, DefaultComponentUI, UITypes } from "./interfaces";
import { ProtocolHandler } from "./ProtocolHandler";
import { UserInterfaceHandler } from "./uiHandlers/UserInterfaceHandler";
import { EventEmitter } from "./utils/EventEmitter";
import { UISimpleHandler } from "./uiHandlers/UISimpleHandler";
import { getComponent, getBinaryComponentString } from "./utils/transactionTools";

import { TextDocument } from 'vscode';
import { Store } from "./stores/Store";

//-----------------------------------------------------------------------------------
//  3. process('protocol:set') - User selects one of the protocols (i.e. default one)
//  4. Protocol Handler provides a default ITransaction
//  5. getVisualization(ITransaction) - Matching UI handlers provide visualizations
//-----------------------------------------------------------------------------------



export class Services extends EventEmitter {
	/** @var protocols  map of protocol names to handlers */
	private protocols: Map<string, ProtocolHandler> = new Map();

	/** @var uiHandlers  list of user interface handlers */
	private uiHandlers: UserInterfaceHandler<any>[] = [];

	private stores: Store<any>[] = [];

	private trackedDocuments: { [key: number]: TextDocument } = {};
	private trackedDocumentsCount: number = 0;

	async process(action: ServiceAction) : Promise<any> {
		switch (action.type) {
			// 1. The UI requests all available protocols
			case ServiceActionTypes.GetAllProtocols:
				return this.getAllProtocols();

			// 2. User selects one of the protocols (e.g. default one)
			case ServiceActionTypes.GetNewRequest:
				// - protocolHandler.getDefaultTransaction()
				// - getVisualization(ITransaction) - matching UI handlers provide visualization
				return this.getDefaultRequest(...action.params);

			// 3. User edits transaction (request) using one of the Visualization items
			case ServiceActionTypes.HandleVisualizationChange:
				return this.getVisualization(
					'outgoing',
					this.onVisualizationItemChange(...action.params)
				);

			// 4. User submits transaction
			case ServiceActionTypes.DoTransaction:
				return this.doTransaction(...action.params);

			// 5. Protocol Handler gets a new response
			case ServiceActionTypes.VisualizeResponse:
				// Response transaction is converted into Visualization and sent to UI
				this.trigger('message', {
					type: ServiceActionTypes.AppendResponse,
					params: [ this.onResponse(...action.params) ]
				} as ServiceAction);
				break;

			// 6. User opens a BinaryStringInput in a new text document
			case ServiceActionTypes.OpenTextDocument:
				this.trigger('document:open', action.params[0]);
				return this.trackedDocumentsCount;

			// 7. User makes a change on a BinaryStringInput synced with an open document
			case ServiceActionTypes.TextDocumentChanged:
				const [ docId, valueNew ] = action.params;
				if (valueNew.type === 'string') {
					this.trigger('document:change', this.trackedDocuments[docId], valueNew.rawValue);
				}
				// else this.trigger('document:change', ..., '<binary data>')
				break;
		}
	}

	trackTextDocument(textDocument: TextDocument): void {
		this.trackedDocuments[this.trackedDocumentsCount++] = textDocument;
	}

	textDocumentDidChange(textDocument: TextDocument): void {
		for (let iStr of Object.keys(this.trackedDocuments)) {
			let i = Number(iStr);
			if (this.trackedDocuments[i] === textDocument) {
				this.trigger('message', {
					type: ServiceActionTypes.TextDocumentChanged,
					params: [
						i,
						{
							type: 'string',
							rawValue: textDocument.getText(),
						}
					]
				} as ServiceAction);
				return;
			}
		}
	}

	textDocumentDidClose(textDocument: TextDocument): void {
		for (let iStr of Object.keys(this.trackedDocuments)) {
			let i = Number(iStr);
			if (this.trackedDocuments[i] === textDocument) {
				delete this.trackedDocuments[i];
				this.trigger('message', {
					type: ServiceActionTypes.TextDocumentClosed,
					params: [i]
				} as ServiceAction);
			}
		}
	}

	// Adding protocols
	addProtocol(name: string, handler: ProtocolHandler): void {
		handler.on('response', (response: ITransaction) => {
			this.trigger('message', {
				type: ServiceActionTypes.AppendResponse,
				params: [ this.onResponse(response) ]
			} as ServiceAction);
		});

		let metadata = handler.getMetadata();
		for (let z = 0; z < metadata.components.length; z++) {
			let component = metadata.components[z];

			if (component instanceof UserInterfaceHandler) {
				this.addUIHandler(component);
				continue;
			}

			if (component.ui === undefined) {
				continue;
			}

			let ui: IUserInterface;
			if (typeof(component.ui) === "string") {
				ui = {
					type: DefaultComponentUI[component.type],
					name: component.name,
					location: component.ui,
				}
			} else {
				ui = component.ui;
			}

			if (component.allowedValues && ui.allowedValues === undefined) {
				ui.allowedValues = component.allowedValues;
			}

			if (component.components && ui.components === undefined) {
				ui.components = component.components.map( (c) => ({
					name: c.name,
					type: DefaultComponentUI[c.type],
					required: c.required,
					default: c.default,
					allowedValues: c.allowedValues,
					location: ui.location,
				}));
			}

			this.addUIHandler( new UISimpleHandler(name, ui) );
		}

		this.protocols.set(name, handler);
	}

	getProtocolHandler(name: string): ProtocolHandler {
		let handler = this.protocols.get(name);
		if ( handler === undefined ) {
			throw new Error(`Protocol with name ${name} not found.`);
		}

		return handler;
	}

	getAllProtocols(): string[] {
		return Array.from( this.protocols.keys() );
	}

	getDefaultRequest(protocolId: string): IVisualization {
		return this.getVisualization(
			'outgoing',
			this.getProtocolHandler(protocolId).getDefaultTransaction()
		);
	}

	doTransaction(transaction: ITransaction): void {
		let handler: ProtocolHandler;
		// if (transaction.connectionId !== undefined) {
		// 	if (this.connections.length <= transaction.connectionId) {
		// 		throw new Error(`Connection $conn${transaction.connectionId} doesn't exist`);
		// 	}
		// 	handler = this.connections[transaction.connectionId];
		// } else {
			handler = this.getProtocolHandler(transaction.protocolId);
		// }

		handler.do(transaction);
	}

	addUIHandler(handler: UserInterfaceHandler<any>): void {
		this.uiHandlers.push(handler);
	}

	addStore(store: Store<any>): void {
		this.stores.push(store);
	}

	private getVisualization(context: IContext, transaction: ITransaction): IVisualization {
		let items: IVisualizationItem[] = [];
		let groupItems: { [key: string]: number } = {};

		for (let i = 0; i < this.uiHandlers.length; i++) {
			const handler = this.uiHandlers[i];
			if (!handler.shouldDisplay(transaction, context)) {
				continue;
			}

			const ui = handler.getUI(transaction, context);
			const viz: IVisualizationItem = {
				handlerId: i,
				ui,
				value: handler.getValueFromTransaction(transaction, context)
			};
			if (ui.location === 'extra' && groupItems[ui.name] !== undefined) {
				if (items[groupItems[ui.name]].ui.type == UITypes.OneOfMany) {
					if (items[groupItems[ui.name]].ui.count === undefined)
						items[groupItems[ui.name]].ui.count = ui.count;

					items[groupItems[ui.name]].value.push(viz);
				} else {
					items[groupItems[ui.name]] = {
						handlerId: -1,
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

	private onVisualizationItemChange(
		viz: IVisualizationItem,
		tCurrent: ITransaction
	): ITransaction {
		let tNew = this.uiHandlers[viz.handlerId].getTransactionFromValue(viz.value, tCurrent);

		// TODO: in certain cases, this is not enough. Issues when multiple components should
		// recompute and the expected output is given by calling one or more handlers twice.
		for (let handler of this.uiHandlers) {
			if (handler.shouldRecompute(tCurrent, tNew)) {
				tNew = handler.getTransactionFromValue(
					handler.getValueFromTransaction(tNew, 'outgoing'),
					tNew
				);
			}
		}

		for (let store of this.stores) {
			if (store.shouldProcess(tNew, 'outgoing')) {
				tNew = store.didRequestChange(tCurrent, tNew);
			}
		}

		return tNew;
	}

	private onResponse(tResponse: ITransaction): IVisualization {
		for (let store of this.stores) {
			if (store.shouldProcess(tResponse, 'incoming')) {
				store.didReceiveResponse(tResponse);
			}
		}

		return this.getVisualization('incoming', tResponse);
	}
}
