'use strict';

import * as vm from 'vm';
import { IVisualizationItem, ITransaction, IVisualization, UITypes } from '../interfaces';
import { setComponents } from './transactionTools';

interface SandboxUniverse {
	$req: any[];
	$res: any[];
}

export class Sandbox {
	box: vm.Context;
	universe: SandboxUniverse;

	constructor() {
		this.universe = { $req: [], $res: [] };
		this.box = vm.createContext(this.universe);
	}

	preview(code: string): IVisualizationItem<any> | null {
		// Idea: run code on a ephemeral vm context with a frozen universe. If any mutation to the
		// global state happens, runInContext will throw, thus signaling it is not a pure statement.
		let universeFrozen = this.getSnapshot();
		let valueRaw: unknown;

		try {
			valueRaw = vm.runInContext(`"use strict";${code}`, vm.createContext(universeFrozen));
		} catch {
			return null;
		}

		if (valueRaw === 'use strict') {
			return null;
		}

		let uiType: UITypes | undefined;

		switch (typeof(valueRaw)) {
			case 'boolean':
				uiType = UITypes.Boolean;
				break;

			case 'symbol':
			case 'string':
			case 'number':
			case 'function':
				valueRaw = String(valueRaw);
				uiType = UITypes.String;
				break;

			case 'object':
				valueRaw = JSON.parse(JSON.stringify(valueRaw));
				if (typeof(valueRaw) !== 'object') {
					valueRaw = String(valueRaw);
					uiType = UITypes.String;
				} else {
					uiType = UITypes.Object;
				}
				break;

			case 'bigint':
			case 'undefined':
			default:
				return null;
		}


		if (uiType === undefined) {
			return null;
		}

		return {
			handlerId: -1, // readonly
			ui: {
				location: 'short',
				name: 'preview',
				type: uiType,
			},
			value: valueRaw,
		};
	}

	compute(code: string): any {
		return vm.runInContext(code, this.box);
	}

	computeTransactionComponents(t: ITransaction): ITransaction {
		let componentsNew : { [key: string]: any } = {};

		for (let componentName of Object.keys(t.components)) {
			componentsNew[componentName] = this.computeComponent(t.components[componentName]);
		}
		return setComponents(t, componentsNew);
	}

	addRequest(tReq: ITransaction): void {
		let reqObj = Object.assign({}, tReq.components, {
			status: tReq.shortStatus,
			protocol: tReq.protocolId
		});
		this.universe.$req.push(reqObj);
	}

	addResponse(tRes: ITransaction): void {
		let resObj = Object.assign({}, tRes.components, {
			status: tRes.shortStatus,
			protocol: tRes.protocolId
		});
		this.universe.$res.push(resObj);
	}

	private getSnapshot(): Readonly<SandboxUniverse> {
		return this.getDeepFrozenClone(this.universe);
	}

	private getDeepFrozenClone<T extends object>(original: T): Readonly<T> {
		if (typeof(original) !== 'object') {
			return original;
		}

		if (Array.isArray(original)) {
			// @ts-ignore type checking here is complicated
			return original.map((i) => this.getDeepFrozenClone(i));
		}

		let clone: object = {};
		for (let key in original) {
			// @ts-ignore type checking here is complicated
			clone[key] = this.getDeepFrozenClone(original[key]);
		}

		return Object.freeze(<T> clone);
	}

	private computeComponent<T>(componentValue: T): T {
		if (typeof(componentValue) === 'string') {
			if (componentValue[0] === '`') {
				return this.compute(componentValue.substr(1));
			}
			return componentValue;
		} else if (typeof(componentValue) === 'object') {
			if (Array.isArray(componentValue)) {
				// @ts-ignore type checking here is complicated
				return componentValue.map((i) => this.computeComponent(i));
			}

			let result: T = <T> {};
			for (let prop in componentValue) {
				result[prop] = this.computeComponent(componentValue[prop]);
			}
			return result;
		}

		return componentValue;
	}
}
