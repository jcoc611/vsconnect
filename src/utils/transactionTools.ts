import { ITransaction, BytesValue } from "../interfaces";
import * as fs from 'fs';

export function getComponent<T>(t: ITransaction, name: string, defaultValue?: T): T {
	if ( t.components[name] !== undefined ) {
		return t.components[name];
	}

	if (defaultValue === undefined) {
		throw new Error(`Transaction has no component ${name}, but no default provided`);
	}
	return defaultValue;
}

export function getBinaryComponentValue(t: ITransaction, name: string): string | Buffer {
	if (t.components[name] === undefined) {
		return '';
	}

	let value: BytesValue = t.components[name];
	if (value.type === 'string') {
		return value.rawValue;
	} else if (value.type === 'file') {
		return fs.readFileSync(value.path, { encoding: 'binary' });
	}

	return '';
}

export function getBinaryComponentString(t: ITransaction, name: string) : string {
	let value = getBinaryComponentValue(t, name);
	if (typeof(value) === "string") {
		return value;
	} else {
		return value.toString('utf8');
	}
}

export function getBinaryComponentSize(t: ITransaction, name: string): number {
	let value: BytesValue | undefined = t.components[name];
	if (value === undefined || value.type === 'empty') {
		return 0;
	}

	if (value.type === 'file') {
		return value.sizeBytes;
	} else if (value.type === 'string') {
		return Buffer.byteLength(value.rawValue, 'utf8');
	}

	return 0;
}

export function hasComponent(t: ITransaction, name: string): boolean {
	return ( t.components[name] !== undefined );
}

export function setComponent(t: ITransaction, name: string, value: any): ITransaction {
	let newCompValue: { [name: string]: any } = {};
	newCompValue[name] = value;
	return Object.assign({}, t, {
		components: Object.assign({}, t.components, newCompValue)
	});
}

export function setComponents(t: ITransaction, values: { [name: string]: any }): ITransaction {
	return Object.assign({}, t, {
		components: Object.assign({}, t.components, values)
	});
}
