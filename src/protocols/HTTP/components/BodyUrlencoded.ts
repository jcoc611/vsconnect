import { UITypes, ITransaction, KeyValues, IUserInterface, IContext, BytesValue } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent } from "../../../utils/transactionTools";

export class BodyUrlencodedComponent extends UserInterfaceHandler<KeyValues<string>> {
	defaultValue(): KeyValues<string> {
		return [];
	}

	getUI(transaction: ITransaction): IUserInterface {
		let valLength = this.getValueFromTransaction(transaction).length;
		return {
			type: UITypes.KeyValues,
			name: 'body',
			subName: 'x-www-form-urlencoded',
			location: 'extra',
			count: (valLength > 0)? String(valLength) : undefined,
		}
	}

	shouldDisplay(context: IContext, transaction: ITransaction): boolean {
		return context === 'outgoing' && hasComponent(transaction, 'body');
	}

	getTransactionFromValue(
		newValue: KeyValues<string>,
		currentTransaction: ITransaction
	): ITransaction {
		let currentVal = getComponent<BytesValue>(currentTransaction, 'body');
		if (currentVal.type !== 'string')
			return currentTransaction;

		let newStr: string = this.serializeQuery(newValue);
		return setComponent(currentTransaction, 'body', {
			type: 'string',
			rawValue: newStr
		} as BytesValue);
	}

	getValueFromTransaction(
		newTransaction: ITransaction
	): KeyValues<string> {
		let currentVal = getComponent<BytesValue>(newTransaction, 'body');
		if (currentVal.type !== 'string')
			return [];
		return this.parseQuery(currentVal.rawValue);
	}

	private parseQuery(endpoint: string): KeyValues<string> {
		let result: KeyValues<string> = [];
		let currentVar = '', currentVarComponents;
		for (let i = 0; i < endpoint.length; i++) {
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
