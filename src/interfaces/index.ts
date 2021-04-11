import { Visualizer } from "../visualizers/Visualizer";

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

	allowedValues?: any[];
	components?: IComponent[];
}

export interface IProtocolMetadata {
	id: string;
	isConnectionOriented: boolean;
	components: IComponent[];
	defaultVisualizers?: Visualizer<any>[];
}

interface IProtocolMetaConnectionless {
	id: string;
	isConnectionOriented: false;
}

interface IProtocolMetaConnection {
	id: string;
	isConnectionOriented: true;
	connections: number[];
}

export type ProtocolShortMetadata = IProtocolMetaConnection | IProtocolMetaConnectionless;

export enum ITransactionState {
	Dummy,
	Pending,
	Sent,
	Acknowledged,
	Replied,
	Error
}

export interface ITransaction {
	id?: number;
	responseTo?: number;
	protocolId: string;
	connectionId?: number;
	state: ITransactionState;
	shortStatus: string;
	components: { [name: string]: any };
}

export interface IVisualizationItem<T> {
	visualizerId: number;
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
	languageHint?: string;
}

interface BytesStringValue {
	type: 'string';
	rawValue: string;
	languageHint?: string;
}

interface BytesFileValue {
	type: 'file';
	name: string;
	path: string;
	sizeBytes: number;
	languageHint?: string;
}

export type BytesValue = BytesStringValue | BytesFileValue | BytesEmptyValue;

export enum ServiceActionTypes {
	// For webview
	SetWebviewId,
	SendRequest,
	AppendResponse,
	AddConnection,
	RemoveConnection,

	// For extension
	GetAllProtocols,
	GetNewRequest,
	Revisualize,
	HandleVisualizationChange,
	DoTransaction,
	VisualizeResponse,
	GetConnectionState,

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

interface SendCurrentRequestAction {
	type: ServiceActionTypes.SendRequest,
	params: [number]
}

interface AppendResponseAction {
	type: ServiceActionTypes.AppendResponse,
	params: [IVisualization]
}

interface AddConnectionAction {
	type: ServiceActionTypes.AddConnection,
	params: [string, number] // [protocolId, connectionId]
}

interface RemoveConnectionAction {
	type: ServiceActionTypes.RemoveConnection,
	params: [string, number] // [protocolId, connectionId]
}

interface GetAllProtocolsAction {
	type: ServiceActionTypes.GetAllProtocols;
	params: []
}

interface GetNewRequestAction {
	type: ServiceActionTypes.GetNewRequest;
	params: [string, number?] // [protocolId, connectionId?]
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

interface GetConnectionStateAction {
	type: ServiceActionTypes.GetConnectionState,
	params: [string, number] // [protocolId, connectionId]
}

export interface OpenTextDocumentOptions {
	name: string;
	content: string;
	language: string;
	shouldSync: boolean;
}

/** UI requests a opening a new text document [options, transaction id] */
interface OpenTextDocumentAction {
	type: ServiceActionTypes.OpenTextDocument,
	params: [OpenTextDocumentOptions, number]
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
	| SendCurrentRequestAction
	| AppendResponseAction
	| AddConnectionAction
	| RemoveConnectionAction
	| GetAllProtocolsAction
	| GetNewRequestAction
	| RevisualizeAction
	| HandleVisualizationChangeAction
	| DoTransactionAction
	| VisualizeResponseAction
	| GetConnectionStateAction
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
	lastProtocol: string;
}

// Stores
export interface IStoreItem<T> {
	data: T;
	// key: string | null;
	ttlSec?: number;
	timestampSec: number;
}

export interface IStoreMetadata {
	name: string;
}
