const request = require( 'request-promise-native' );

import { IVerb, IPayload } from '../../interfaces'

import { Protocol } from '../Protocol';
import { HTTPResponse } from './HTTPResponse';

export class HTTP extends Protocol {
	async initialize(params: any[]): Promise<boolean> {
		return true; // no setup needed
	}

	do(verb: IVerb, payload: IPayload): Promise<IPayload> {
		return request( {
			uri: payload.endpoint,
			resolveWithFullResponse: true
		} ).then( ( res: Response ) => {
			return HTTPResponse.FromNativeResponse( res );
		} );
	}

}
