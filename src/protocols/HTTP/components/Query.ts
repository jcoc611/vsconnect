import { UITypes, ITransaction, KeyValues, IUserInterface, IContext } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent } from "../../../utils/transactionTools";

export class QueryComponent extends UserInterfaceHandler<KeyValues<string>> {
	private uiName: string;
	private componentName: string;
	private isURI: boolean;
	private uiSubName?: string;

	constructor(uiName: string, componentName: string, isURI: boolean, uiSubName?: string) {
		super();
		this.uiName = uiName;
		this.componentName = componentName;
		this.isURI = isURI;
		this.uiSubName = uiSubName;
	}

	defaultValue(): KeyValues<string> {
		return [];
	}

	getUI(transaction: ITransaction): IUserInterface {
		return {
			type: UITypes.KeyValues,
			name: this.uiName,
			subName: this.uiSubName,
			location: 'extra',
			count: String(this.getValueFromTransaction(transaction).length)
		}
	}

	shouldDisplay(context: IContext, transaction: ITransaction): boolean {
		return context === 'outgoing' && hasComponent(transaction, this.componentName);
	}

	getTransactionFromValue(
		newValue: KeyValues<string>,
		currentTransaction: ITransaction
	): ITransaction {
		let currentStr = getComponent<string>(currentTransaction, this.componentName);
		let newStr: string;
		if (this.isURI) {
			let queryIndex = currentStr.indexOf('?');
			let rootPath = (queryIndex >= 0) ? currentStr.substr(0, queryIndex) : currentStr;
			newStr = rootPath + '?' + this.serializeQuery(newValue);
		} else {
			newStr = this.serializeQuery(newValue);
		}

		return setComponent(currentTransaction, this.componentName, newStr);
	}

	getValueFromTransaction(
		newTransaction: ITransaction
	): KeyValues<string> {
		return this.parseQuery( getComponent(newTransaction, this.componentName) );
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
		return values.map( ([k, v]) => (
			encodeURIComponent(k) + ( (v !== '')? '=' + encodeURIComponent(v): '')
		) ).join('&');
	}
}
