import { WebViewServices } from "./utils/WebViewServices";
import { ITransaction, IPayload } from "../interfaces";

type History = Array<ITransaction | IPayload>;

export class StateManager {
	static PendingResponse: IPayload = {
		type: 'Payload', body: '', shortStatus: '', isError: false, isPending: true
	};
	services : WebViewServices;

	changeListeners: Array<(newHistory: History) => void> = new Array();
	history: History = new Array();

	reqInHistory: Map<number, number> = new Map();
	resInHistory: Map<number, number> = new Map();
	reqCount: number = 0;
	resCount: number = 0;

	constructor() {
		this.services = WebViewServices.GetInstance();
		this.addEmptyRequest();
	}

	getHistory(): History {
		return this.history;
	}

	getLastRequestId(): number{
		return this.reqCount;
	}

	onChange( callback: (newHistory: History) => void) {
		this.changeListeners.push(callback);
		callback( this.getHistory() );
	}

	getCurrentRequest(): ITransaction | null {
		if ( this.reqCount === 0 ) {
			return null;
		}

		let historyIndex = this.reqInHistory.get( this.reqCount );

		if ( historyIndex !== undefined ) {
			return this.history[historyIndex] as ITransaction;
		} else {
			return null;
		}
	}

	sendCurrentRequest() {
		const currentRequest = this.getCurrentRequest();

		if ( !currentRequest ) {
			return;
		}

		// this.updateRequest( reqIndex, { sent: true } )
		const resIndex = this.addResponse( StateManager.PendingResponse );
		this.addEmptyRequest();
		this.services.getProtocol( currentRequest.protocolId ).then( (protocol) => {
			if ( protocol === null ) {
				throw new Error( 'ups' );
			}

			protocol.do( currentRequest ).then( (res: IPayload) => {
				this.updateResponse( resIndex, res );
			} );
		} );
	}

	addEmptyRequest(): number {
		let prevRequest = this.getCurrentRequest();
		let req: ITransaction;

		if ( prevRequest ) {
			req = Object.assign( {}, prevRequest ) as ITransaction;
		} else {
			req = {
				type: 'Transaction',
				protocolId: 'HTTP',
				payload: {
					type: 'Payload',
					body: '',
					shortStatus: '',
					isError: false,
					isPending: false
				},
				verb: { verbId: 'GET' },
				endpoint: ''
			}
		}

		return this.addRequest( req );
	}

	private addRequest( transaction: ITransaction ): number {
		this.reqCount++;

		this.reqInHistory.set( this.reqCount, this.history.length );
		this.history.push( transaction );

		this.triggerChange();

		return this.reqCount;
	}

	private addResponse( payload: IPayload ): number {
		this.resCount++;

		this.resInHistory.set( this.resCount, this.history.length );
		this.history.push( payload );

		this.triggerChange();

		return this.resCount;
	}

	updateRequest( reqIndex: number, newTransaction: ITransaction ) {
		let historyIndex = this.reqInHistory.get( reqIndex );
		if ( historyIndex !== undefined ) {
			this.history[historyIndex] = newTransaction;
		}
		this.triggerChange();
	}

	private updateResponse( resIndex: number, newPayload: IPayload ) {
		let historyIndex = this.resInHistory.get( resIndex );
		if ( historyIndex !== undefined ) {
			this.history[historyIndex] = newPayload;
		}
		this.triggerChange();
	}

	private triggerChange() {
		const h = this.getHistory();
		for ( let callback of this.changeListeners ) {
			callback(h);
		}
	}
}
