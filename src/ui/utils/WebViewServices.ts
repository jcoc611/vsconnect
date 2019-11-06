import { WebViewService } from "./WebViewService";
import { IProtocol, IVerb, IPayload, IServiceCall, ITransaction } from "../../interfaces";
import { DelegatedPromise } from "../../utils/DelegatedPromise";

class ProtocolWebService implements IProtocol {
	serviceMethods: Set<string> = new Set([]);
	actualService : WebViewService;

	constructor( actualService : WebViewService ) {
		this.actualService = actualService;
	}

	async initialize(params: any[]): Promise<boolean> {
		return true; // no setup
	}

	async do( transaction: ITransaction ): Promise<IPayload> {
		return await this.actualService.execute( 'do', [ transaction ] ) as IPayload;
	}
}

export class WebViewServices {
	static ServicesHostId : number = 0;

	private static instance : WebViewServices | null;
	static GetInstance(): WebViewServices {
		if ( !WebViewServices.instance ) {
			WebViewServices.instance = new WebViewServices();
		}

		return WebViewServices.instance;
	}

	private vscode: any;
	private pendingPromises: Map< number, DelegatedPromise<any> > = new Map();
	private pendingPromiseCount: number = 0;

	constructor() {
		// @ts-ignore because function does not exist in dev environment
		// eslint-disable-next-line
		this.vscode = acquireVsCodeApi();

		window.addEventListener( 'message', ( event ) => {
			console.log('message', event);
			const message = event.data; // The json data that the extension sent
			if ( message.type === 'response' ) {
				if ( this.pendingPromises.has( message.promiseId ) ) {
					this.pendingPromises.get( message.promiseId )!.fulfill( message.body )
				} else {
					console.error( `Dropped response with ID ${message.promiseId}, promise not found.`)
				}
			} else {
				console.error( `Unexpected type ${message.type}` )
			}
		} );
	}

	async getService( name: string, args: any[] = [] ) : Promise<WebViewService | null> {
		return this.request(
			WebViewServices.ServicesHostId, 'getService', [ name, args ]
		).then( (response: any) => {
			return new WebViewService( response, this.request.bind(this) );
		} );
	}

	async request( serviceId: number, action: string, params: any[] ): Promise<any> {
		var i = this.pendingPromiseCount++;
		var newPromise = new DelegatedPromise<any>();

		let serviceCall = {
			type: 'request',
			promiseId: i,
			body: {
				serviceId,
				action,
				params
			}
		} as IServiceCall;

		console.log( 'posting', serviceCall );
		this.vscode.postMessage( serviceCall );

		this.pendingPromises.set( i, newPromise );
		return newPromise;
	}

	// Utility wrappers for types

	async getProtocol( name: string ) : Promise<IProtocol | null> {
		var actualService = await this.getService( name );

		if ( actualService !== null ) {
			return new ProtocolWebService( actualService );
		}

		return null;
	}
}
