import { UITypes, ITransaction, KeyValues, IUserInterface, IContext } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent } from "../../../utils/transactionTools";

export class QueryComponent extends UserInterfaceHandler<KeyValues<string>> {
	defaultValue(): KeyValues<string> {
		return [];
	}

	getUI(transaction: ITransaction): IUserInterface {
		return {
			type: UITypes.KeyValues,
			name: 'Query',
			location: 'extra'
		}
	}

	shouldDisplay(context: IContext, transaction: ITransaction): boolean {
		return hasComponent(transaction, 'path');
	}

	getTransactionFromValue(
		newValue: KeyValues<string>,
		currentTransaction: ITransaction
	): ITransaction {
		let path = getComponent<string>(currentTransaction, 'path');
		let rootPath = path.substr( 0, path.indexOf('?') );
		let newPath = rootPath + '?' + this.serializeQuery(newValue);

		return setComponent(currentTransaction, 'path', newPath);
	}

	getValueFromTransaction(
		newTransaction: ITransaction
	): KeyValues<string> {
		return this.parseQuery( getComponent(newTransaction, 'path') );
	}

	private parseQuery(endpoint: string): KeyValues<string> {
		let queryStarts = endpoint.indexOf('?');
		if (queryStarts < 0) {
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
