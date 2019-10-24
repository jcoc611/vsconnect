export interface IService {
	serviceMethods: Set<string>;
	initialize( params: any[] ): Promise<boolean>;
}

export interface IServiceMetadata {
	serviceId : number;
}

export interface IServiceCall {
	type: string;
	promiseId: number | null;
	body: {
		serviceId: number,
		action: string,
		params: any[]
	};
}

export interface IPayload {
	endpoint : string;

	getBodyText() : string;
}

export interface IVerb {
	
}

export interface IProtocol extends IService {
	do( verb: IVerb, payload: IPayload ) : Promise<IPayload>;
}
