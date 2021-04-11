import { ITransaction, ITransactionState, IProtocolMetadata } from './interfaces'
import { EventEmitter } from './utils/EventEmitter';

export abstract class ProtocolHandler extends EventEmitter {
	serviceMethods: Set<string> = new Set( [ 'send' ] );

	abstract send(transaction: ITransaction, sourceId?: number): void;
	abstract getMetadata(): IProtocolMetadata;
	abstract getDefaultTransaction(connectionId?: number): ITransaction;

	on(eventName: 'response', callback: (response: ITransaction, sourceId?: number) => void): void;
	on(eventName: 'connected', callback: (connectionId: number, sourceId?: number) => void): void;
	on(eventName: 'disconnected', callback: (connectionId: number, sourceId?: number) => void): void;
	on(eventName: string, callback: (...params: any[]) => void): void {
		return super.on(eventName, callback);
	}

	trigger(eventName: 'response', response: ITransaction, sourceId?: number): void;
	trigger(eventName: 'connected', connectionId: number, sourceId?: number): void;
	trigger(eventName: 'disconnected', connectionId: number, sourceId?: number): void;
	trigger(eventName: string, ...params: any[]): void {
		return super.trigger(eventName, ...params);
	}
}
