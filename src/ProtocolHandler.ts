import { ITransaction, ITransactionState, IProtocolMetadata } from './interfaces'
import { EventEmitter } from './utils/EventEmitter';

export abstract class ProtocolHandler extends EventEmitter {
	serviceMethods: Set<string> = new Set( [ 'do' ] );
	abstract initialize(params: any[]): Promise<boolean>;
	abstract do( transaction: ITransaction ): void;

	abstract getMetadata(): IProtocolMetadata;

	getDefaultTransaction(): ITransaction {
		let meta = this.getMetadata();
		let components: { [name: string]: any } = {};

		for (let componentDefinition of meta.components) {
			if (componentDefinition.default !== undefined) {
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
