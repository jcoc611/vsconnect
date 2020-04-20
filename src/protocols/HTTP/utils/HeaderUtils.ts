'use strict';

import { KeyValues } from "../../../interfaces";

type HeaderValues = KeyValues<string>;

export function getHeaderValue(headers: HeaderValues, name: string) : string | undefined;
export function getHeaderValue(headers: HeaderValues, name: string, defaultValue: string) : string;
export function getHeaderValue(headers: HeaderValues, name: string, defaultValue?: string): string | undefined {
	for (let [nameCur, valueCur] of headers) {
		if (nameCur === name)
			return valueCur;
	}

	return defaultValue;
}

export function hasHeaderValue(headers: HeaderValues, name: string, value: string): boolean {
	for (let [nameCur, valueCur] of headers) {
		if (nameCur === name && value === valueCur) {
			return true;
		}
	}

	return false;
}

export function objToHeaderValues(
	resHeaders: { [key: string]: string | string[] | undefined}
) : HeaderValues {
	let headerKV: KeyValues<string> = [];
	for (let key of Object.keys(resHeaders).sort()) {
		if (typeof (resHeaders[key]) === 'string') {
			headerKV.push([ key, resHeaders[key] as string ]);
		}
	}
	return headerKV;
}