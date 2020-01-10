import { ITransaction } from "../interfaces";

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
