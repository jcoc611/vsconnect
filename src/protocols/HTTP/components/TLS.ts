import { UITypes, ITransaction, KeyValues, IUserInterface, IContext } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent } from "../../../utils/transactionTools";

interface TLSComponentValue {
	enabled: boolean;
}

export class TLSComponent extends UserInterfaceHandler<boolean> {
	getUI(transaction: ITransaction): IUserInterface {
		return {
			type: UITypes.Boolean,
			name: 'TLS',
			location: 'short'
		}
	}

	shouldDisplay(context: IContext, transaction: ITransaction): boolean {
		return hasComponent(transaction, 'tls');
	}

	getTransactionFromValue(
		newValue: boolean,
		currentTransaction: ITransaction
	): ITransaction {
		let newTransaction: ITransaction = currentTransaction;

		let host: string = getComponent<string>(currentTransaction, 'host');
		let parts = /(.*?:\/\/|)?([^\/]*)(.*)$/.exec(host)!;
		host = (typeof(parts[1]) === 'string')? host.substr(parts[1].length) : host;
		if (newValue && parts[1] !== 'https://')
			newTransaction = setComponent(newTransaction, 'host', 'https://' + host);
		else if (!newValue && parts[1] !== 'http://')
			newTransaction = setComponent(newTransaction, 'host', 'http://' + host);

		newTransaction = setComponent(newTransaction, 'tls', { enabled: newValue });
		return newTransaction;
	}

	getValueFromTransaction(
		newTransaction: ITransaction
	): boolean {
		return getComponent<TLSComponentValue>(newTransaction, 'tls').enabled;
	}
}
