import { IVerb, IPayload, IProtocol } from '../interfaces'

export abstract class Protocol implements IProtocol {
	serviceMethods: Set<string> = new Set( [ 'do' ] );
	abstract initialize(params: any[] ): Promise<boolean>;
	abstract do(verb: IVerb, payload: IPayload): Promise<IPayload>;
}
