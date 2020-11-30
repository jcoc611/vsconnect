'use strict';

import * as http from 'http';
import * as https from 'https';

import * as url from 'url';

import * as iconv from 'iconv-lite';
import { gunzipSync, inflateSync, brotliDecompressSync } from 'zlib';

import { ITransaction, KeyValues, ITransactionState, BytesValue } from "../../interfaces";
import { getBinaryComponentValue, getComponent, hasComponent } from "../../utils/transactionTools";
import { BodyUtils } from "./utils/BodyUtils";
import { MultipartValue } from "./components/BodyMultipart";
import { objToHeaderValues, hasHeaderValue, getHeaderValue } from './utils/HeaderUtils';
import { Formats } from '../../utils/Formats';
import { StringFormats } from './utils/StringFormats';

interface TLSComponentValue {
	enabled: boolean;
}

// v0.2.5 -> moved from 'request' to the client below to reduce dependencies and simplify

export class HTTPClient {
	static async request(tReq: ITransaction): Promise<ITransaction> {
		let headers = getComponent<KeyValues<string>>(tReq, 'headers', []);

		let headersObj: { [key: string]: string | string[] } = {};
		for (let [hKey, hValue] of headers) {
			let hValueCur = headersObj[hKey];
			if (hValueCur === undefined) {
				headersObj[hKey] = hValue;
			} else {
				if (!Array.isArray(hValueCur)) {
					headersObj[hKey] = [ hValueCur ];
				}

				(<string[]> headersObj[hKey]).push(hValue);
			}
		}

		// TODO validation
		let isHttps = getComponent<TLSComponentValue>(tReq, 'tls').enabled;
		let hostComponent: string = getComponent<string>(tReq, 'host');
		if (!/([^:]+:\/\/)/.test(hostComponent))
		{
			hostComponent = (isHttps)? 'https://' : 'http://' + hostComponent;
		}
		let urlParsed: url.UrlWithStringQuery = url.parse(hostComponent);
		let hostScheme: string | undefined = urlParsed.protocol;
		if (hostScheme != 'http:' && hostScheme != 'https:') {
			hostScheme = (isHttps)? 'https:' : 'http:';
		}

		let body = getBinaryComponentValue(tReq, 'body');
		if (body === '' && hasComponent(tReq, 'extra:body-multipart')) {
			let formData = BodyUtils.multipartFormData(
				getComponent<MultipartValue>(tReq, 'extra:body-multipart')
			);
			body = formData.getBuffer();
			headersObj['Content-Type'] = formData.getHeaders()['content-type'];
		}

		return new Promise((resolve, reject) => {
			let timingStart: [number, number];

			/* Other options
			hostname?: string;
			family?: number; Ipv4 vs ipv6
			defaultPort?: number | string;
			localAddress?: string;
			socketPath?: string;
			headers?: OutgoingHttpHeaders;
			agent?: Agent | boolean;
			_defaultAgent?: Agent;
			setHost?: boolean;
			*/
			let reqOptions: http.RequestOptions & https.RequestOptions = {
				host: urlParsed.hostname,
				port: urlParsed.port,
				method: getComponent<string>(tReq, 'verb'),
				path: getComponent<string>(tReq, 'path'),
				headers: headersObj,
				timeout: 5000 /*milliseconds*/, // TODO: setting
			};
			let req: http.ClientRequest;

			let handleRes = (res: http.IncomingMessage): void => {
				let headerKV: KeyValues<string> = objToHeaderValues(res.headers);
				let bodyParts: Buffer[] = [];
				res.setEncoding('binary');
				res.on('data', (chunk) => {
					bodyParts.push(Buffer.from(chunk, 'binary'));
				});
				res.on('end', () => {
					let timingEnd = process.hrtime(timingStart);
					let bodyRaw = Buffer.concat(bodyParts);
					let bodyNormalized = HTTPClient.normalizeBody(bodyRaw, headerKV);
					let state: ITransactionState;
					if (res.statusCode === undefined || res.statusCode >= 400) {
						state = ITransactionState.Error;
					} else {
						state = ITransactionState.Sent;
					}
					let languageHint;
					if (res.headers['content-type'] !== undefined){
						languageHint = StringFormats.mimeFromContentType(res.headers['content-type']);
					}

					let tRes: ITransaction = {
						responseTo: tReq.id,
						protocolId: 'HTTP',
						state,
						shortStatus: `${res.statusCode} ${res.statusMessage}`,
						components: {
							host: urlParsed.hostname,
							// TODO: this should be type 'file' if non text?
							body: <BytesValue> {
								type: 'string',
								rawValue: bodyNormalized,
								languageHint,
							},
							headers: headerKV,
							duration: Formats.hrToString(timingEnd),
						},
					};
					resolve(tRes);
				});
			};

			if (hostScheme === 'https:') {
				req = https.request(reqOptions, handleRes);
			} else {
				req = http.request(reqOptions, handleRes);
			}

			req.on('timeout', () => {
				let timingEnd = process.hrtime(timingStart);
				let tRes: ITransaction = {
					responseTo: tReq.id,
					protocolId: 'HTTP',
					state: ITransactionState.Error,
					shortStatus: `Timeout`,
					components: {
						host: urlParsed.hostname,
						// TODO: this should be type 'file' if non text?
						body: <BytesValue> {
							type: 'empty'
						},
						headers: [],
						duration: Formats.hrToString(timingEnd),
					},
				};
				resolve(tRes);
			});
			
			req.on('error', (e) => {
				console.error(`problem with request: ${e.message}`);
				let timingEnd = process.hrtime(timingStart);
				let tRes: ITransaction = {
					responseTo: tReq.id,
					protocolId: 'HTTP',
					state: ITransactionState.Error,
					shortStatus: (e as any).code,
					components: {
						host: urlParsed.hostname,
						// TODO: this should be type 'file' if non text?
						body: <BytesValue> {
							type: 'empty'
						},
						headers: [],
						duration: Formats.hrToString(timingEnd),
					},
				};
				resolve(tRes);
			});
			

			if (body !== '') {
				// req.setDefaultEncoding((typeof(body) === 'string') ? 'utf8' : 'binary');
				req.write(body);
			}
			req.end();
			timingStart = process.hrtime();
		});
	}

	private static normalizeBody(bodyRaw: Buffer, headers: KeyValues<string>): string {
		// Handle content encoding
		if (hasHeaderValue(headers, 'content-encoding', 'gzip')) {
			bodyRaw = gunzipSync(bodyRaw);
		} else if (hasHeaderValue(headers, 'content-encoding', 'deflate')) {
			bodyRaw = inflateSync(bodyRaw);
		} else if (hasHeaderValue(headers, 'content-encoding', 'br')) {
			bodyRaw = brotliDecompressSync(bodyRaw);
		}

		// Convert body from given charset to UTF8 so everything else works out
		// TODO: Keep the original charset next to the component so we can go back to it later
		let bodyNormalized: string;
		let matches = getHeaderValue(headers, 'content-type', '').match(/(?:charset=)([^;]+)/);
		if (matches === undefined || matches === null || matches.length < 2) {
			matches = ['', 'utf-8'];
		}

		if (iconv.encodingExists(matches[1])) {
			bodyNormalized = iconv.decode(bodyRaw, matches[1]);
		} else {
			bodyNormalized = `VSConnect error: Unknow charset ${String(matches[1])}`;
		}

		return bodyNormalized;
	}
}
