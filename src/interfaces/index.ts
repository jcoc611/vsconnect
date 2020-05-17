import { UserInterfaceHandler } from "../uiHandlers/UserInterfaceHandler";

export type IContext = 'incoming' | 'outgoing';

export enum UITypes {
	KeyValues,
	Enum,
	String,
	Host,
	BytesBinary,
	BytesString,
	BytesInline,
	Textarea,
	Table,
	Boolean,
	Object,
	HTML,

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
	defaultValue?: any;
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
	Textarea,
	Table,
	Boolean,
	Object,
	HTML,
}

export var DefaultComponentUI: { [key in IComponentTypes]: UITypes } = {
	[IComponentTypes.KeyValues]: UITypes.KeyValues,
	[IComponentTypes.Enum]: UITypes.Enum,
	[IComponentTypes.String]: UITypes.String,
	[IComponentTypes.Host]: UITypes.Host,
	[IComponentTypes.Bytes]: UITypes.BytesString,
	[IComponentTypes.Textarea]: UITypes.Textarea,
	[IComponentTypes.Table]: UITypes.Table,
	[IComponentTypes.Boolean]: UITypes.Boolean,
	[IComponentTypes.Object]: UITypes.Object,
	[IComponentTypes.HTML]: UITypes.HTML,
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

export interface IVisualizationItem<T> {
	handlerId: number;
	ui: IUserInterface;
	value: T;
	valueFunction?: T;
	valuePreview?: any;
}

export interface IVisualization {
	context: IContext;
	items: IVisualizationItem<any>[];
	transaction: ITransaction;
	resDependencies?: number[];
}

export type KeyValues<T> = [T, T][];

interface BytesEmptyValue {
	type: 'empty';
}

interface BytesStringValue {
	type: 'string';
	rawValue: string;
}

interface BytesFileValue {
	type: 'file';
	name: string;
	path: string;
	sizeBytes: number;
}

export type BytesValue = BytesStringValue | BytesFileValue | BytesEmptyValue;

export enum ServiceActionTypes {
	SetWebviewId,

	GetAllProtocols,
	GetNewRequest,
	Revisualize,
	HandleVisualizationChange,
	DoTransaction,
	VisualizeResponse,
	AppendResponse,

	// Text Docs
	OpenTextDocument,
	TextDocumentChanged,
	TextDocumentClosed,

	// Sandboxes
	PreviewInSandbox,
	ClearSandbox,
};

interface SetWebviewIdAction {
	type: ServiceActionTypes.SetWebviewId,
	params: [number]
}

interface GetAllProtocolsAction {
	type: ServiceActionTypes.GetAllProtocols;
	params: []
}

interface GetNewRequestAction {
	type: ServiceActionTypes.GetNewRequest;
	params: [string]
}

interface RevisualizeAction {
	type: ServiceActionTypes.Revisualize,
	params: [IVisualization]
}

interface HandleVisualizationChangeAction {
	type: ServiceActionTypes.HandleVisualizationChange;
	params: [IVisualizationItem<any>, IVisualization]
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

export interface OpenTextDocumentOptions {
	name: string;
	content: string;
	language: string;
	shouldSync: boolean;
}

interface OpenTextDocumentAction {
	type: ServiceActionTypes.OpenTextDocument,
	params: [OpenTextDocumentOptions]
}

/** A text document synced with a BytesStringInput changed [input id, new content] */
interface TextDocumentChangedAction {
	type: ServiceActionTypes.TextDocumentChanged,
	params: [number, BytesValue]
}

interface TextDocumentClosedAction {
	type: ServiceActionTypes.TextDocumentClosed,
	params: [number],
}

interface PreviewInSandboxAction {
	type: ServiceActionTypes.PreviewInSandbox,
	params: [string],
}

interface ClearSandboxAction {
	type: ServiceActionTypes.ClearSandbox,
	params: [],
}

export type ServiceAction = (
	SetWebviewIdAction
	| GetAllProtocolsAction
	| GetNewRequestAction
	| RevisualizeAction
	| HandleVisualizationChangeAction
	| DoTransactionAction
	| VisualizeResponseAction
	| AppendResponseAction
	| OpenTextDocumentAction
	| TextDocumentChangedAction
	| TextDocumentClosedAction
	| PreviewInSandboxAction
	| ClearSandboxAction
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

// Webview interfaces
export interface ConsoleViewState {
	webviewId: number;
	history: IVisualization[];
	currentRequest: IVisualization;
	reqInHistory: [number, number][];
	resInHistory: [number, number][];
	reqCount: number;
	resCount: number;
	lastProtocol: string;
	protocols?: string[];
	trackedTextDocuments: { [key: number]: IVisualizationItem<BytesValue> };
}
