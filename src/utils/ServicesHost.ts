import { IService, IServiceMetadata, IServiceCall } from "../interfaces";

import { HTTP } from '../protocols/HTTP/HTTP'

export class ServicesHost implements IService {
	serviceMethods: Set<string> = new Set( [ 'getService' ] );
	static services: Map<string, { new(): IService }> = new Map([
		[ 'HTTP', HTTP ]
	]);

	private serviceInstances: Map<number, IService> = new Map();
	private serviceInstanceCount: number = 1;

	constructor() {
		this.serviceInstances.set( 0, this );
	}

	async initialize(params: any[]): Promise<boolean> {
		return true; // no setup
	}

	async process( payload: IServiceCall ) : Promise<IServiceCall | null> {
		if ( payload.type === 'request' ) {
			if ( !this.serviceInstances.has( payload.body.serviceId ) ) {
				throw new Error( `Got payload for non existent service ${payload}` );
			}

			let service: IService | undefined = this.serviceInstances.get( payload.body.serviceId);
			if ( !service!.serviceMethods.has( payload.body.action ) ) {
				throw new Error( `Cannot call non-existent action ${payload.body.action}`);
			}

			let response : IServiceCall = {
				type: 'response',
				promiseId: payload.promiseId,
				// @ts-ignore arbitrary method call
				body: await service![ payload.body.action ].apply( service, payload.body.params )
			};
			return response;
		}

		return null;
	}

	async getService( name: string, params: any[] ): Promise<IServiceMetadata | null> {
		if ( !ServicesHost.services.has( name ) ) {
			return null;
		}

		let ServiceClass = ServicesHost.services.get( name );
		let service: IService = new ServiceClass!();
		let count = this.serviceInstanceCount++;
		await service.initialize( params );

		this.serviceInstances.set( count, service );

		return { serviceId: count } as IServiceMetadata;
	}
}
