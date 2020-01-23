import { UITypes, ITransaction, KeyValues, IUserInterface, IContext } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent, setComponents } from "../../../utils/transactionTools";

export class URLComponent extends UserInterfaceHandler<string> {
	getUI(transaction: ITransaction): IUserInterface {
		return {
			type: UITypes.String,
			name: 'URL',
			location: 'short'
		}
	}

	shouldDisplay(context: IContext, transaction: ITransaction): boolean {
		return hasComponent(transaction, 'path') && hasComponent(transaction, 'host');
	}

	getTransactionFromValue(
		newValue: string,
		currentTransaction: ITransaction
	): ITransaction {
		let result = currentTransaction;
		let parts = /(.*?:\/\/|)?([^\/]*)(.*)$/.exec(newValue);
		if (!parts || parts.length !== 4) {
			throw new Error('URL has wrong format');
		}

		let schema = parts[1] || '';
		let host = parts[2] || '';
		let path = parts[3] || '';

		if (schema.toLowerCase() === 'https://') {
			result = setComponent(result, 'tls', { enabled: true });
		}

		result = setComponents(result, {
			host: schema + host,
			path: path
		});

		return result;
	}

	getValueFromTransaction(
		newTransaction: ITransaction
	): string {
		return getComponent<string>(newTransaction, 'host')
			+ getComponent<string>(newTransaction, 'path');
	}
}
