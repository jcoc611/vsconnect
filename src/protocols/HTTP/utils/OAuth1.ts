'use strict';
/*!
Based on https://github.com/ddo/oauth-1.0a
Licensed under MIT License.
Copyright (c) 2014 Ddo
*/

import * as crypto from 'crypto';
import { StringFormats } from './StringFormats';

export type OAuth1SignatureMethod = 'PLAINTEXT' | 'HMAC-SHA1';

export interface OAuth1Request {
	method: string;
	uri: string;
	body: string;
}

export interface OAuth1Token {
	key: string;
	secret: string;
}

export interface OAuth1Options {
	consumer: OAuth1Token;
	nonceLength?: number;
	signatureMethod: OAuth1SignatureMethod;
	realm: string;
}

export interface OAuth1Data {
	oauth_consumer_key: string;
	oauth_nonce: string;
	oauth_signature_method: OAuth1SignatureMethod;
	oauth_timestamp: string;
	oauth_version: string;
	oauth_token?: string;
	oauth_signature?: string;
	oauth_body_hash?: string;
}

const PARAMETER_SEPARATOR = ', ';

export class OAuth1 {
	private signatureMethod: OAuth1SignatureMethod;
	private consumer: OAuth1Token;
	private nonceLength: number;
	private version: string;
	private realm: string;

	/**
	 * Constructor
	 * @param {Object} opts consumer key and secret
	 */
	constructor(opts: OAuth1Options) {

		this.consumer         = opts.consumer;
		this.nonceLength      = opts.nonceLength || 6;
		this.version          = '1.0';
		this.realm            = opts.realm;
		this.signatureMethod  = opts.signatureMethod;
	}

	/**
	 * Computes OAuth v1 authorization data for a request.
	 */
	authorize(req: OAuth1Request, token?: OAuth1Token): OAuth1Data {
		let oauthData: OAuth1Data = {
			oauth_consumer_key: this.consumer.key,
			oauth_nonce: this.getNonce(),
			oauth_signature_method: this.signatureMethod,
			oauth_timestamp: String(this.getTimeStamp()),
			oauth_version: this.version
		};

		if (token !== undefined) {
			oauthData.oauth_token = token.key;

			if (req.body)
				oauthData.oauth_body_hash = this.getBodyHash(req, token.secret);
		}

		oauthData.oauth_signature = this.getSignature(
			req, (token === undefined)? '' : token.secret, oauthData
		);

		return oauthData;
	}

	/**
	 * Creates a OAuth Signature
	 */
	private getSignature(req: OAuth1Request, tokenSecret: string, oauthData: OAuth1Data) {
		if (this.signatureMethod === 'PLAINTEXT') {
			return this.getBaseString(req, oauthData);
		} else if (this.signatureMethod === 'HMAC-SHA1') {
			return crypto.createHmac('sha1', this.getSigningKey(tokenSecret))
				.update(this.getBaseString(req, oauthData))
				.digest('base64');
		}

		return '';
	}

	/**
	 * Create a OAuth Body Hash
	 * @param {Object} request data
	 */
	private getBodyHash(req: OAuth1Request, tokenSecret: string) {
		if (this.signatureMethod === 'PLAINTEXT') {
			return req.body;
		} else if (this.signatureMethod === 'HMAC-SHA1') {
			return crypto.createHmac('sha1', this.getSigningKey(tokenSecret))
				.update(req.body)
				.digest('base64');
		}

		return '';
	}

	/**
	 * Base String = Method + Base Url + ParameterString
	 * @param  {Object} request data
	 * @param  {Object} OAuth data
	 * @return {String} Base String
	 */
	getBaseString(request: OAuth1Request, oauthData: OAuth1Data) {
		return (request.method.toUpperCase()
			+ '&' + StringFormats.percentEncode(this.getBaseUrl(request.uri))
			+ '&' + StringFormats.percentEncode(this.getParameterString(request, oauthData)));
	}

	/**
	 * Get data from url
	 * -> merge with oauth data
	 * -> percent encode key & value
	 * -> sort
	 *
	 * @param  {Object} request data
	 * @param  {Object} OAuth data
	 * @return {Object} Parameter string data
	 */
	private getParameterString(req: OAuth1Request, oauthData: OAuth1Data): string {
		let data;
		// if (oauthData.oauth_body_hash)
			data = Object.assign({}, oauthData, StringFormats.parseQuery(req.uri, true));
		// else
		// 	data = Object.assign({}, oauthData, req.data, StringFormats.parseQuery(req.uri));

		const sort = true, percentEncode = true;
		return StringFormats.serializeQuery(data, sort, percentEncode);
	}

	/**
	 * Creates a Signing Key
	 */
	private getSigningKey(tokenSecret: string): string {
		// if (!tokenSecret)
		// 	return StringFormats.percentEncode(this.consumer.secret);

		return StringFormats.percentEncode(this.consumer.secret)
			+ '&' + StringFormats.percentEncode(tokenSecret);
	}

	/**
	 * Get base url
	 * @param  {String} url
	 * @return {String}
	 */
	getBaseUrl(url: string): string {
		return url.split('?')[0];
	}

	/**
	 * Get OAuth data as Header
	 * @param  {Object} oauth_data
	 * @return {String} Header data key - value
	 */
	getAuthHeader(req: OAuth1Request, token?: OAuth1Token): string {
		let oauthData = this.authorize(req, token);
		let header: string = 'OAuth ';

		if (this.realm)
			header += 'realm="' + StringFormats.percentEncode(this.realm) + '"' + PARAMETER_SEPARATOR;

		for (let key of Object.keys(oauthData).sort()) {
			if (!key.startsWith('oauth_'))
				continue;

			/// @ts-ignore next line
			let value = oauthData[key];
			header += StringFormats.percentEncode(key) + '="' + StringFormats.percentEncode(value) + '"' + PARAMETER_SEPARATOR;
		}

		return header.substr(0, header.length - PARAMETER_SEPARATOR.length);
	}

	/**
	 * Create a random word characters string with input length
	 * @return {String} a random word characters string
	 */
	private getNonce(): string {
		const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		let result = '';

		for (var i = 0; i < this.nonceLength; i++) {
			let charIndex = Math.floor(Math.random() * (chars.length + 1));
			result += chars[charIndex];
		}

		return result;
	}

	/**
	 * @return {number} current unix timestamp
	 */
	private getTimeStamp(): number {
		return Math.round(new Date().getTime() / 1000);
	}
}