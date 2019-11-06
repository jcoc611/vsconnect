import { IPayload, IProtocol, ITransaction } from '../interfaces'

export abstract class Protocol implements IProtocol {
	serviceMethods: Set<string> = new Set( [ 'do' ] );
	abstract initialize(params: any[] ): Promise<boolean>;
	abstract do( transaction: ITransaction ): Promise<IPayload>;
}
