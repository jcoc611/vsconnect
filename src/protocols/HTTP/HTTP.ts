const request = require( 'request-promise-native' );
import { Response } from "request";

import { IPayload, ITransaction } from '../../interfaces'

import { Protocol } from '../Protocol';
import { HTTPResponse } from './HTTPResponse';

export class HTTP extends Protocol {
	async initialize(params: any[]): Promise<boolean> {
		return true; // no setup needed
	}

	do( transaction: ITransaction ): Promise<IPayload> {
		return request( {
			method: transaction.verb.verbId,
			uri: transaction.endpoint,
			resolveWithFullResponse: true,
			simple: false
		} ).then( ( res: Response ) => {
			return HTTPResponse.FromNativeResponse( res );
		} ).catch( (err: any) => {
			return HTTPResponse.FromNativeResponse( err.response );
		} );
	}
}
