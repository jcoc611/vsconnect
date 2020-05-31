'use strict';

import { KeyValues, IStoreItem } from "../../../interfaces";
import { CookieItem } from "../stores/CookieStore";

export type HTTPQuery = { [key: string]: string | string[] | null };

export class StringFormats {
	static serializeQuery(queryObj: HTTPQuery, sort: boolean = false, percentEncode: boolean = false): string {
		let encode: (s: string) => string = (percentEncode)? StringFormats.percentEncode: encodeURIComponent;
		let parts: string[] = [];

		for (let key of (sort)? Object.keys(queryObj).sort() : Object.keys(queryObj)) {
			let value = queryObj[key];
			if (typeof(value) === 'string')
				parts.push( encode(key) + '=' + encode(value));
			else if (value === null)
				parts.push( encode(key) );
			else if (Array.isArray(value) && sort)
				value.map(encode).sort().map((v) => parts.push( encode(key) + '=' + v));
			else
				value.map((v) => parts.push( encode(key) + '=' + encode(v)));
		}

		return parts.join('&');
	}

	static parseQuery(query: string, fromURL: boolean = false): HTTPQuery {
		if (fromURL) {
			let queryStart = query.indexOf('?');
			if (queryStart >= 0)
				query = query.substr(queryStart + 1);
			else
				return {};
		}

		let components = query.split('&');
		let data: HTTPQuery = {};

		for (let component of components) {
			let [key, value] = StringFormats.parseKeyValue(component);

			// Handle duplicate keys formkey=formvalue1&formkey=formvalue2
			if (data[key]) {
				let currentVal = data[key];
				if (!Array.isArray(currentVal))
					data[key] = (typeof(currentVal) === 'string')? [currentVal]: [];

				(<string[]> data[key]).push(value);
			} else {
				data[key] = value;
			}
		}

		return data;
	}

	static percentEncode(str: string): string {
		return encodeURIComponent(str)
			.replace(/\!/g, "%21")
			.replace(/\*/g, "%2A")
			.replace(/\'/g, "%27")
			.replace(/\(/g, "%28")
			.replace(/\)/g, "%29");
	}

	static percentDecode(str: string): string {
		return decodeURIComponent(str.replace(/\+/g, " "));
	}

	static parseCookieHeader(header: string): KeyValues<string> {
		if (header === '') {
			return [];
		}
		let cookies = header.split('; ');
		let result: KeyValues<string> = [];
		for (let cookie of cookies) {
			let kv = StringFormats.parseKeyValue(cookie);
			result.push(kv);
		}
		return result;
	}

	static serializeCookieHeader(cookies: KeyValues<string>): string {
		return cookies.map(
			([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value)
		).join('; ');
	}

	static parseSetCookiesHeader(headers: string[], hostDefault?: string): IStoreItem<CookieItem>[] {
		return headers.map((setCookie) => {
			let parts = setCookie.split('; ');
			let [key, value] = StringFormats.parseKeyValue(parts[0]);
			let setCookieOptions : { [key: string]: string } = {};
			for (let i = 1; i < parts.length; i++) {
				let [partKey, partValue] = StringFormats.parseKeyValue(parts[i]);
				setCookieOptions[partKey.toLowerCase()] = partValue;
			}

			let ttlSec: number;
			if (setCookieOptions['max-age'] !== undefined) {
				ttlSec = Number(setCookieOptions['max-age']);
			} else if (setCookieOptions['expires'] !== undefined) {
				// @ts-ignore date subtraction not in TS?
				ttlSec = (new Date(setCookieOptions['expires']) - new Date()) / 1000;
			} else {
				ttlSec = Number.POSITIVE_INFINITY;
			}

			let storeItem: IStoreItem<CookieItem> = {
				ttlSec,
				timestampSec: (new Date()).getTime() / 1000,

				data: {
					name: key,
					value: value,
					domain: setCookieOptions['domain'] || hostDefault,
					path: setCookieOptions['path'],

					tlsOnly: (setCookieOptions['secure'] !== undefined),
					httpOnly: (setCookieOptions['httponly'] !== undefined),
					sameSite: 'strict',
				}
			};
			return storeItem;
		});
	}

	static serializeSetCookieHeader(items: IStoreItem<CookieItem>[]) {
		// TODO
	}

	static mimeFromContentType(contentType: string): string {
		let iMimeEnd = contentType.indexOf(';');
		if (iMimeEnd >= 0) {
			return contentType.substr(0, iMimeEnd);
		}

		return contentType;
	}

	static contentTypeFromMimeNew(mime: string, contentTypeOld?: string): string {
		if (contentTypeOld === undefined) {
			return mime;
		}

		let iMimeEnd = contentTypeOld.indexOf(';');
		if (iMimeEnd >= 0) {
			return mime + contentTypeOld.substr(iMimeEnd);
		}

		return mime;
	}

	private static parseKeyValue(keyValue: string): [string, string] {
		let i = keyValue.indexOf('=');
		let key = (i < 0)? keyValue : keyValue.substr(0, i);
		let value = (i < 0)? '' : keyValue.substr(i + 1);

		return [ decodeURIComponent(key), decodeURIComponent(value) ];
	}
}