import { UITypes, ITransaction, KeyValues, IUserInterface, IContext } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../UserInterfaceHandler";
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
		let parts = /(?:(.*?):\/\/)?([^\/]*)(.*)$/.exec(newValue);
		if (!parts || parts.length !== 4) {
			throw new Error('URL has wrong format');
		}

		return setComponents(currentTransaction, {
			host: parts[2],
			path: parts[3]
		});
	}

	getValueFromTransaction(
		newTransaction: ITransaction
	): string {
		return getComponent<string>(newTransaction, 'host')
			+ getComponent<string>(newTransaction, 'path');
	}
}
