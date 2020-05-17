import { ITransaction, ITransactionState, IProtocolMetadata } from './interfaces'
import { EventEmitter } from './utils/EventEmitter';
import { UserInterfaceHandler } from './uiHandlers/UserInterfaceHandler';

export abstract class ProtocolHandler extends EventEmitter {
	serviceMethods: Set<string> = new Set( [ 'do' ] );
	protected connections: any[] = [];

	abstract initialize(params: any[]): Promise<boolean>;
	abstract do(transaction: ITransaction, sourceId?: number): void;

	abstract getMetadata(): IProtocolMetadata;

	connect(to: ITransaction): number {
		// Cannot connect, not connection-oriented
		return -1;
	}

	disconnect(from: number) {
		if (from < 0 || from >= this.connections.length) {
			throw new Error(`Cannot disconnect from non-existent connection ${from}`);
		}

		this.connections.splice(from, 1);
	}

	getDefaultTransaction(): ITransaction {
		let meta = this.getMetadata();
		let components: { [name: string]: any } = {};

		for (let componentDefinition of meta.components) {
			if (!(componentDefinition instanceof UserInterfaceHandler) && componentDefinition.default !== undefined) {
				components[componentDefinition.name] = componentDefinition.default;
			}
		}

		return {
			protocolId: meta.id,
			state: ITransactionState.Pending,
			shortStatus: '',
			components
		}
	}
}
