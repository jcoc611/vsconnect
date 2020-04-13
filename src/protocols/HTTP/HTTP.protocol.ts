const request = require( 'request-promise-native' );
import { Response } from "request";

import { ITransaction, KeyValues, ITransactionState, IProtocolMetadata, IComponentTypes, UITypes } from '../../interfaces';

import { ProtocolHandler } from '../../ProtocolHandler';
import { getComponent } from "../../utils/transactionTools";
import { QueryComponent } from "./components/Query";
import { StatusTextComponent } from "./components/StatusText";
import { URLComponent } from "./components/URL";
import { TLSComponent } from "./components/TLS";
import { AuthBasicComponent } from "./components/AuthBasic";
import { AuthOAuth1Component } from "./components/AuthOauth1";

interface TLSComponentValue {
	enabled: boolean;
}

export class HTTP extends ProtocolHandler {
	static fromNativeResponse( response : Response ): ITransaction {
		let status = (response.statusCode)? `${response.statusCode}`: '';
		let statusText = (response.statusMessage)? `${response.statusMessage}`: '';

		let headerKV: KeyValues<string> = [];
		for (let key of Object.keys(response.headers).sort()) {
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
					default: 'GET',
					ui: 'short'
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
					name: 'tls',
					type: IComponentTypes.Object,
					required: true,
					default: {
						enabled: false
					},
					components: [
						{
							name: 'enabled',
							type: IComponentTypes.Boolean,
							default: false,
							required: true
						},
						// TODO versions, cipher suites
					],
				},
				new QueryComponent('query', 'path', true),
				{
					name: 'body',
					type: IComponentTypes.Bytes,
					required: false,
					default: '',
					ui: {
						location: 'extra',
						type: UITypes.Bytes,
						name: 'body',
						subName: 'raw'
					},
				},
				new QueryComponent('body', 'body', false, 'x-www-form-urlencoded'),
				{
					name: 'headers',
					type: IComponentTypes.KeyValues,
					required: false,
					default: [],
					ui: 'extra'
				},
				{
					name: 'version',
					type: IComponentTypes.String,
					required: true,
					default: '1.1'
				},
				new StatusTextComponent(),
				new URLComponent(),
				new TLSComponent(),
				new AuthBasicComponent(),
				new AuthOAuth1Component(),
			]
		};
	}

	do( transaction: ITransaction ): void {
		let headers = getComponent<KeyValues<string>>(transaction, 'headers', []);

		let headersObj: { [key: string]: string } = {};
		for (let header of headers) {
			headersObj[header[0]] = header[1];
		}

		// TODO validation
		let host: string = getComponent<string>(transaction, 'host');
		if (/(.*?:\/\/|)?([^\/]*)(.*)$/.exec(host)![1] === undefined)
			host = (getComponent<TLSComponentValue>(transaction, 'tls').enabled)? 'https://' : 'http://' + host;

		let uri: string =  host + getComponent<string>(transaction, 'path');

		request( {
			resolveWithFullResponse: true,
			simple: false,

			method: getComponent(transaction, 'verb'),
			headers: headersObj,
			uri: uri,
			body: getComponent(transaction, 'body'),
		} ).then( ( res: Response ) => {
			this.trigger( 'response', HTTP.fromNativeResponse(res) );
		} ).catch( (err: any) => {
			console.log('HTTP error', err);
			this.trigger( 'response', HTTP.fromNativeResponse(err.response) );
		} );
	}
}
