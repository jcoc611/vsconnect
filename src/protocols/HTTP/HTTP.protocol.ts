const request = require( 'request-promise-native' );
import { Response } from "request";
import * as iconv from 'iconv-lite';
import { gunzipSync, inflateSync, brotliDecompressSync } from 'zlib';

import { ITransaction, KeyValues, ITransactionState, IProtocolMetadata, IComponentTypes, UITypes, BytesValue } from '../../interfaces';

import { ProtocolHandler } from '../../ProtocolHandler';
import { getComponent, getBinaryComponentValue } from "../../utils/transactionTools";
import { QueryComponent } from "./components/Query";
import { StatusTextComponent } from "./components/StatusText";
import { URLComponent } from "./components/URL";
import { TLSComponent } from "./components/TLS";
import { AuthBasicComponent } from "./components/AuthBasic";
import { AuthOAuth1Component } from "./components/AuthOauth1";
import { BodyPreviewComponent } from "./components/BodyPreview";
import { getHeaderValue, objToHeaderValues, hasHeaderValue } from "./utils/HeaderUtils";
import { Formats } from "../../utils/Formats";
import { BodyBinaryComponent } from "./components/BodyBinary";
import { BodyUrlencodedComponent } from "./components/BodyUrlencoded";
import { CookiesComponent } from "./components/Cookies";

interface TLSComponentValue {
	enabled: boolean;
}

export class HTTP extends ProtocolHandler {
	static fromNativeResponse(response : Response): ITransaction {
		let status = (response.statusCode)? `${response.statusCode}`: '';
		let statusText = (response.statusMessage)? `${response.statusMessage}`: '';

		let headerKV: KeyValues<string> = objToHeaderValues(response.headers);
		let bodyRaw: Buffer = response.body as Buffer;

		// Handle content encoding
		if (hasHeaderValue(headerKV, 'content-encoding', 'gzip')) {
			bodyRaw = gunzipSync(bodyRaw);
		} else if (hasHeaderValue(headerKV, 'content-encoding', 'deflate')) {
			bodyRaw = inflateSync(bodyRaw);
		} else if (hasHeaderValue(headerKV, 'content-encoding', 'br')) {
			bodyRaw = brotliDecompressSync(bodyRaw);
		}

		// Convert body from given charset to UTF8 so everything else works out
		// TODO: Keep the original charset next to the component so we can go back to it later
		let bodyNormalized: string;
		let matches = getHeaderValue(headerKV, 'content-type', '').match(/(?:charset=)([^;]+)/);
		if (matches === undefined || matches === null || matches.length < 2) {
			matches = ['', 'utf-8'];
		}

		if (iconv.encodingExists(matches[1])) {
			bodyNormalized = iconv.decode(bodyRaw, matches[1]);
		} else {
			bodyNormalized = `VSConnect error: Unknow charset ${String(matches[1])}`;
		}

		return {
			protocolId: 'HTTP',
			components: {
				host: response.request.host,
				// TODO: this should be type 'file' if non text?
				body: {
					type: 'string',
					rawValue: bodyNormalized
				} as BytesValue,
				headers: headerKV,
				duration: Formats.msToString(response.timings!.end)
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
					default: { type: 'empty' } as BytesValue,
					ui: {
						location: 'extra',
						type: UITypes.BytesString,
						name: 'body',
						subName: 'raw'
					},
				},
				new BodyUrlencodedComponent(),
				new BodyBinaryComponent(),
				new BodyPreviewComponent(),
				{
					name: 'headers',
					type: IComponentTypes.KeyValues,
					required: false,
					default: [
						// Hard-coded common chrome user agent.
						// TODO: better UI for selecting alternatives.
						['User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36']
					],
					ui: 'extra'
				},
				{
					name: 'version',
					type: IComponentTypes.String,
					required: true,
					default: '1.1'
				},
				new StatusTextComponent(),
				{
					name: 'duration',
					type: IComponentTypes.String,
					required: false,
					ui: {
						name: 'duration',
						location: 'short',
						type: UITypes.String,
						contextType: 'incoming'
					},
					default: '',
				},
				new URLComponent(),
				new TLSComponent(),
				new CookiesComponent(),
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
		if (/(.*?:\/\/|)?([^\/]*)(.*)$/.exec(host)![1] === undefined) {
			host = (getComponent<TLSComponentValue>(transaction, 'tls').enabled)? 'https://' : 'http://' + host;
		}

		let uri: string =  host + getComponent<string>(transaction, 'path');

		request( {
			resolveWithFullResponse: true,
			simple: false,
			encoding: null,
			time: true,
			followRedirect: false,

			method: getComponent(transaction, 'verb'),
			headers: headersObj,
			uri: uri,
			body: getBinaryComponentValue(transaction, 'body'),
		} ).then( ( res: Response ) => {
			this.trigger( 'response', HTTP.fromNativeResponse(res) );
		} ).catch( (err: any) => {
			console.log('HTTP error', err);
			this.trigger( 'response', HTTP.fromNativeResponse(err.response) );
		} );
	}
}
