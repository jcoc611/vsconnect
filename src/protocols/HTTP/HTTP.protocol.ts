const request = require( 'request-promise-native' );
import { Response } from "request";

import { ITransaction, KeyValues, ITransactionState, IProtocolMetadata, IComponentTypes } from '../../interfaces';

import { ProtocolHandler } from '../../ProtocolHandler';
import { getComponent } from "../../utils/transactionTools";

export class HTTP extends ProtocolHandler {
	static fromNativeResponse( response : Response ): ITransaction {
		console.log('fromNativeRes', response);
		let status = (response.statusCode)? `${response.statusCode}`: '';
		let statusText = (response.statusMessage)? `${response.statusMessage}`: '';

		let headerKV: KeyValues<string> = [];
		for (let key of Object.keys(response.headers)) {
			if (typeof (response.headers[key]) === 'string') {
				headerKV.push([ key, response.headers[key] as string ]);
			}
		}

		return {
			protocolId: 'HTTP',
			components: {
				body: String( response.body ),
				headers: headerKV
			},

			shortStatus: `${status} ${statusText}`,
			state: (response.statusCode >= 400)? ITransactionState.Error: ITransactionState.Sent,
		};
	}

	async initialize(params: any[]): Promise<boolean> {
		return true; // no setup needed
	}

	getMetadata(): IProtocolMetadata {
		return {
			id: 'HTTP',
			components: [
				{
					name: 'verb',
					type: IComponentTypes.Enum,
					required: true,
					allowedValues: [
						'GET', 'HEAD', 'POST', 'PUT',
						'DELETE', 'CONNECT', 'OPTIONS',
						'TRACE', 'PATCH'
					],
					default: 'GET'
				},
				{
					name: 'host',
					type: IComponentTypes.String,
					required: true,
					default: ''
				},
				{
					name: 'path',
					type: IComponentTypes.String,
					required: true,
					default: ''
				},
				{
					name: 'headers',
					type: IComponentTypes.KeyValues,
					required: false,
					default: []
				},
				{
					name: 'body',
					type: IComponentTypes.Bytes,
					required: false,
					default: ''
				},
				{
					name: 'version',
					type: IComponentTypes.String,
					required: true,
					default: '1.1'
				}
			],
		};
	}

	do( transaction: ITransaction ): void {
		let headers = getComponent<KeyValues<string>>(transaction, 'headers', []);

		let headersObj: { [key: string]: string } = {};
		for (let header of headers) {
			headersObj[header[0]] = header[1];
		}

		// TODO validation
		let uri: string = 'http://' + getComponent<string>(transaction, 'host')
			+ getComponent<string>(transaction, 'path');

		console.log({
			resolveWithFullResponse: true,
			simple: false,

			method: getComponent(transaction, 'verb'),
			headers: headersObj,
			uri: uri,
		});
		request( {
			resolveWithFullResponse: true,
			simple: false,

			method: getComponent(transaction, 'verb'),
			headers: headersObj,
			uri: uri,
		} ).then( ( res: Response ) => {
			this.trigger( 'response', HTTP.fromNativeResponse(res) );
		} ).catch( (err: any) => {
			console.log('HTTP error', err);
			this.trigger( 'response', HTTP.fromNativeResponse(err.response) );
		} );
	}
}
