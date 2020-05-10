import { ITransaction, BytesValue, KeyValues } from "../interfaces";
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

export function deleteComponent(t: ITransaction, name: string): ITransaction {
	let components: { [name: string]: any } = Object.assign({}, t.components);
	delete components[name];
	return Object.assign({}, t, { components });
}

// Key Value Components
export function getKeyValueComponent<T>(t: ITransaction, nameComponent: string, nameKey: T, defaultValue?: T): T {
	let componentValue = getComponent<KeyValues<T>>(t, nameComponent);
	for (let [key, value] of componentValue) {
		if (key === nameKey) {
			return value;
		}
	}

	if (defaultValue === undefined) {
		throw new Error(`Transaction component ${nameComponent} has no key ${nameKey} but no default value provided`);
	}

	return defaultValue;
}

export function hasKeyValueComponent(t: ITransaction, nameComponent: string, nameKey: any, value?: any): boolean {
	let componentValue = getComponent<KeyValues<any>>(t, nameComponent);
	for (let [keyCur, valueCur] of componentValue) {
		if (keyCur === nameKey && (value === valueCur || value === undefined)) {
			return true;
		}
	}

	return false;
}

export function getKeyValueComponents<T>(t: ITransaction, nameComponent: string, nameKey: T): T[] {
	let componentValue = getComponent<KeyValues<T>>(t, nameComponent);
	let result: T[] = [];
	for (let [key, value] of componentValue) {
		if (key === nameKey) {
			result.push(value);
		}
	}

	return result;
}

export function setKeyValueComponent<T>(t: ITransaction, nameComponent: string, nameKey: T, value: T): ITransaction {
	let valueCur = getComponent<KeyValues<T>>(t, nameComponent);
	let valueNew: KeyValues<T> = [...valueCur];

	let ikey = valueNew.findIndex(([key, _]) => {
		if (typeof(key) === 'string' && typeof(nameKey) === 'string') {
			return (key.toLowerCase() === nameKey.toLowerCase());
		}
		return (key === nameKey);
	});

	if (ikey >= 0)
		valueNew[ikey][1] = value;
	else
		valueNew.push([ nameKey, value ]);

	return setComponent(t, nameComponent, valueNew);
}

export function deleteKeyValueComponent<T>(t: ITransaction, nameComponent: string, nameKey: T): ITransaction {
	let valueCur = getComponent<KeyValues<T>>(t, nameComponent);
	let valueNew: KeyValues<T> = valueCur.filter(([key, value]) => {
		if (typeof(key) === 'string' && typeof(nameKey) === 'string') {
			return (key.toLowerCase() !== nameKey);
		}
		return (key !== nameKey);
	});

	return setComponent(t, nameComponent, valueNew);
}

// Binary Components
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
	if (typeof(value) === 'string') {
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
