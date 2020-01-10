// import { WebViewServices } from "./utils/WebViewServices";
import { ITransaction, IServiceMessage, ServiceAction, IServiceCall, ServiceActionTypes, IVisualization, ITransactionState, IVisualizationItem } from "../interfaces";
import { DelegatedPromise } from "../utils/DelegatedPromise";

// type History = IVisualization[];

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

	private vscode: any;
	private pendingPromises: Map< number, DelegatedPromise<any> > = new Map();
	private pendingPromiseCount: number = 0;

	private constructor() {
		// @ts-ignore because function does not exist in dev environment
		// eslint-disable-next-line
		this.vscode = acquireVsCodeApi();

		window.addEventListener( 'message', (event) => {
			const message: IServiceMessage = event.data; // The json data that the extension sent
			console.log('message', message);
			if (message.type === 'result') {
				if ( this.pendingPromises.has(message.promiseId) ) {
					this.pendingPromises.get(message.promiseId)!.fulfill(message.result);
				} else {
					console.error(`Dropped response with ID ${message.promiseId}, promise not found.`);
				}
			} else if (message.type === 'call') {
				if (message.action.type === ServiceActionTypes.AppendResponse) {
					this.addResponse(message.action.params[0]);
				} else {
					throw new Error(`UI received action call of unexpected type ${message.action.type}`);
				}
			} else {
				throw new Error(`Received message of unknown type`);
			}
		} );

		this.addNewRequest();
	}

	getHistory(): IVisualization[] {
		return this.history;
	}

	onChange( callback: (newHistory: IVisualization[]) => void) {
		this.changeListeners.push(callback);
		callback( this.getHistory() );
	}

	getAllProtocols(): Promise<string[]> {
		return this.remoteCall({
			type: ServiceActionTypes.GetAllProtocols,
			params: []
		});
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

		// this.history.push(currentRequest);
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

	async updateUI(viz: IVisualizationItem, currentTransaction: ITransaction) {
		if ( this.currentRequest === undefined ) {
			throw new Error('Cannot update UI if there is no current request');
		}

		this.currentRequest = await this.remoteCall({
			type: ServiceActionTypes.HandleVisualizationChange,
			params: [viz, currentTransaction]
		});
		this.triggerChange();
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
		this.reqCount++;

		this.reqInHistory.set(this.reqCount, this.history.length);
		this.history.push(v);

		// this.triggerChange();

		return this.reqCount;
	}

	private addResponse(v: IVisualization): number {
		this.resCount++;

		this.resInHistory.set(this.resCount, this.history.length);
		this.history.push(v);

		this.triggerChange();

		return this.resCount;
	}

	// TODO: response always immutable?
	// private updateResponse( resIndex: number, newViz: IVisualization ) {
	// 	...
	// }

	private async remoteCall(action: ServiceAction) {
		let promiseId = this.pendingPromiseCount++;
		var newPromise = new DelegatedPromise<any>();

		let serviceCall: IServiceCall = {
			type: 'call',
			action,
			promiseId
		};

		this.vscode.postMessage( serviceCall );

		this.pendingPromises.set( promiseId, newPromise );
		return newPromise;
	}

	private triggerChange() {
		const h = this.getHistory();
		for ( let callback of this.changeListeners ) {
			callback(h);
		}
	}
}
