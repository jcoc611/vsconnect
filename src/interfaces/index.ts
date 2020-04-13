import { UserInterfaceHandler } from "../uiHandlers/UserInterfaceHandler";

export type IContext = 'incoming' | 'outgoing';

export enum UITypes {
	KeyValues,
	Enum,
	String,
	Host,
	Bytes,
	Table,
	Boolean,
	Object,

	// Collections
	OneOfMany,
	Form,
}

export interface IUserInterface {
	location: 'short' | 'extra';
	type: UITypes;
	name: string;

	shortDescription?: string;
	allowedValues?: any[];
	contextType?: IContext;
	components?: IUserInterface[];
	count?: string;
	subName?: string;
}

export enum IComponentTypes {
	KeyValues,
	Enum,
	String,
	Host,
	Bytes,
	Table,
	Boolean,
	Object,
}

export var DefaultComponentUI: { [key in IComponentTypes]: UITypes } = {
	[IComponentTypes.KeyValues]: UITypes.KeyValues,
	[IComponentTypes.Enum]: UITypes.Enum,
	[IComponentTypes.String]: UITypes.String,
	[IComponentTypes.Host]: UITypes.Host,
	[IComponentTypes.Bytes]: UITypes.Bytes,
	[IComponentTypes.Table]: UITypes.Table,
	[IComponentTypes.Boolean]: UITypes.Boolean,
	[IComponentTypes.Object]: UITypes.Object,
}

export interface IComponent {
	name: string;
	type: IComponentTypes;
	required: boolean;

	default: any;
	allowedValues?: any[];
	components?: IComponent[];
	ui?: IUserInterface | 'short' | 'extra';
}

export interface IProtocolMetadata {
	id: string;
	components: (IComponent | UserInterfaceHandler<any>)[];
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

export interface IVisualizationItem {
	handlerId: number;
	ui: IUserInterface;
	value: any;
}

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
