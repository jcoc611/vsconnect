import { UITypes, ITransaction, KeyValues, IUserInterface, IContext, BytesValue } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent, setKeyValueComponent } from "../../../utils/transactionTools";

export class BodyUrlencodedComponent extends UserInterfaceHandler<KeyValues<string>> {
	defaultValue(): KeyValues<string> {
		return [];
	}

	getUI(t: ITransaction, context: IContext): IUserInterface {
		let valLength = this.getValueFromTransaction(t, context).length;
		return {
			type: UITypes.KeyValues,
			name: 'body',
			subName: 'x-www-form-urlencoded',
			location: 'extra',
			count: (valLength > 0)? String(valLength) : undefined,
		}
	}

	shouldDisplay(t: ITransaction, context: IContext): boolean {
		return context === 'outgoing' && hasComponent(t, 'body');
	}

	getTransactionFromValue(valueNew: KeyValues<string>, tCurrent: ITransaction): ITransaction {
		let currentVal = getComponent<BytesValue>(tCurrent, 'body');
		if (currentVal.type !== 'string')
			return tCurrent;

		let newStr: string = this.serializeQuery(valueNew);

		let tNew: ITransaction = tCurrent;
		tNew = setKeyValueComponent(tNew, 'headers', 'Content-Type', 'application/x-www-form-urlencoded');
		return setComponent(tNew, 'body', <BytesValue> {
			type: 'string',
			rawValue: newStr
		});
	}

	getValueFromTransaction(tNew: ITransaction, context: IContext): KeyValues<string> {
		let currentVal = getComponent<BytesValue>(tNew, 'body');
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
