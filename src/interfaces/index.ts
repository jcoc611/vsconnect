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
	type: "Payload";
	body: string; // todo use IBodyFormat

	/** @var string the payload status. In HTTP, this is the HTTP status code and text. */
	shortStatus: string;

	/** @var boolean a quick way to tell if the payload represents an error. */
	isError: boolean;

	isPending: boolean;

	// getBodyText(): string;
}

export interface IVerb {
	verbId: string;
}

export interface ITransaction {
	type: "Transaction";
	protocolId: string;
	payload: IPayload;
	verb: IVerb;

	endpoint: string;
}

export interface IProtocol extends IService {
	initialize( params: any[] ): Promise<boolean>;
	do( transaction: ITransaction ) : Promise<IPayload>;
}
