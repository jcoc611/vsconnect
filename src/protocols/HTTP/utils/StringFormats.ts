'use strict';

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
			let i = component.indexOf('=');
			let key = (i < 0)? component : component.substr(0, i);
			let value = (i < 0)? '' : component.substr(i + 1);

			// Handle duplicate keys formkey=formvalue1&formkey=formvalue2
			if (data[key]) {
				let currentVal = data[key];
				if (!Array.isArray(currentVal))
					data[key] = (typeof(currentVal) === 'string')? [currentVal]: [];

				(data[key] as string[]).push(decodeURIComponent(value));
			} else {
				data[key] = decodeURIComponent(value);
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
}