import { string } from "prop-types";

// export interface IService {
// 	serviceMethods: Set<string>;
// 	initialize( params: any[] ): Promise<boolean>;
// }

// export interface IServiceMetadata {
// 	serviceId : number;
// }

// export interface IServiceCall {
// 	type: 'request' | 'response';
// 	promiseId?: number;
// 	body: {
// 		serviceId: number,
// 		action: string,
// 		params: any[]
// 	};
// }

export enum IComponentTypes {
	KeyValues,
	Enum,
	String,
	Host,
	Bytes
} 

export interface IComponent {
	name: string;
	type: IComponentTypes;
	required: boolean;

	default: any;
	allowedValues?: any[];
}

export interface IProtocolMetadata {
	id: string;
	components: IComponent[];
}

export enum ITransactionState {
	Dummy,
	Pending,
	Sent,
	Acknowledged,
	Replied,
	Error
}

export interface ITransaction {
	protocolId: string;
	connectionId?: number;
	state: ITransactionState;
	shortStatus: string;
	components: { [name: string]: any };
}

export enum UITypes {
	KeyValues,
	Enum,
	String,
	Host,
	Bytes
}

export interface IUserInterface {
	location: 'short' | 'extra';
	type: UITypes;
	name: string;

	allowedValues?: any[];
}

export interface IVisualizationItem {
	handlerId: number;
	ui: IUserInterface;
	value: any;
}

export type IContext = 'incoming' | 'outgoing';

export interface IVisualization {
	context: IContext;
	items: IVisualizationItem[];
	transaction: ITransaction;
}

export type KeyValues<T> = [T, T][];


export enum ServiceActionTypes {
	GetAllProtocols,
	GetNewRequest,
	HandleVisualizationChange,
	DoTransaction,
	VisualizeResponse,
	AppendResponse
};

interface GetAllProtocolsAction {
	type: ServiceActionTypes.GetAllProtocols;
	params: []
}

interface GetNewRequest {
	type: ServiceActionTypes.GetNewRequest;
	params: [string]
}

interface HandleVisualizationChangeAction {
	type: ServiceActionTypes.HandleVisualizationChange;
	params: [IVisualizationItem, ITransaction]
}

interface DoTransactionAction {
	type: ServiceActionTypes.DoTransaction;
	params: [ITransaction];
}

interface VisualizeResponseAction {
	type: ServiceActionTypes.VisualizeResponse,
	params: [ITransaction]
}

interface AppendResponseAction {
	type: ServiceActionTypes.AppendResponse,
	params: [IVisualization]
}

export type ServiceAction = (
	GetAllProtocolsAction
	| GetNewRequest
	| HandleVisualizationChangeAction
	| DoTransactionAction
	| VisualizeResponseAction
	| AppendResponseAction
);

export interface IServiceCall {
	type: 'call';
	action: ServiceAction;
	promiseId: number;
}

export interface IServiceResult {
	type: 'result';
	result: any;
	promiseId: number;
}

export type IServiceMessage = IServiceCall | IServiceResult;
