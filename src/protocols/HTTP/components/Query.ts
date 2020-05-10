import { UITypes, ITransaction, KeyValues, IUserInterface, IContext } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent } from "../../../utils/transactionTools";

export class QueryComponent extends UserInterfaceHandler<KeyValues<string>> {
	private isURI: boolean;

	// 'query', 'path', true
	constructor() {
		super();
		this.isURI = true;
	}

	defaultValue(): KeyValues<string> {
		return [];
	}

	getUI(t: ITransaction, context: IContext): IUserInterface {
		return {
			type: UITypes.KeyValues,
			name: 'query',
			// subName: this.uiSubName,
			location: 'extra',
			count: String(this.getValueFromTransaction(t, context).length)
		}
	}

	shouldDisplay(t: ITransaction, context: IContext): boolean {
		return context === 'outgoing' && hasComponent(t, 'path');
	}

	getTransactionFromValue(valueNew: KeyValues<string>, tCurrent: ITransaction): ITransaction {
		let currentStr = getComponent<string>(tCurrent, 'path');
		let newStr: string;
		if (this.isURI) {
			let queryIndex = currentStr.indexOf('?');
			let rootPath = (queryIndex >= 0) ? currentStr.substr(0, queryIndex) : currentStr;
			if (rootPath === '') {
				rootPath = '/';
			}
			newStr = rootPath + '?' + this.serializeQuery(valueNew);
		} else {
			newStr = this.serializeQuery(valueNew);
		}

		return setComponent(tCurrent, 'path', newStr);
	}

	getValueFromTransaction(tNew: ITransaction, context: IContext): KeyValues<string> {
		return this.parseQuery( getComponent(tNew, 'path') );
	}

	private parseQuery(endpoint: string): KeyValues<string> {
		let queryStarts = (this.isURI)? endpoint.indexOf('?'): -1;
		if (this.isURI && queryStarts < 0) {
			return [];
		}

		let result: KeyValues<string> = [];
		let currentVar = '', currentVarComponents;
		for (let i = queryStarts + 1; i < endpoint.length; i++) {
			if (endpoint[i] === '&' || i === endpoint.length - 1) {
				if (endpoint[i] !== '&' && i === endpoint.length - 1) {
					currentVar += endpoint[i];
				}

				currentVarComponents = currentVar.split('=').map((s) => decodeURIComponent(s));

				if (currentVarComponents.length === 2) {
					result.push([ currentVarComponents[0], currentVarComponents[1] ]);
				} else if (currentVarComponents.length === 1) {
					result.push([ currentVarComponents[0], '' ]);
				}

				currentVar = '';
			} else {
				currentVar += endpoint[i];
			}
		}

		return result;
	}

	private serializeQuery(values: KeyValues<string>): string {
		return values.filter(([k, v]) => k !== '' || v !== '').map( ([k, v]) => (
			encodeURIComponent(k) + ( (v !== '')? '=' + encodeURIComponent(v): '')
		) ).join('&');
	}
}
