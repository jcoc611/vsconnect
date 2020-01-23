import { UITypes, ITransaction, KeyValues, IUserInterface, IContext } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent } from "../../../utils/transactionTools";

export class HeadersComponent extends UserInterfaceHandler<KeyValues<string>> {
	getUI(transaction: ITransaction): IUserInterface {
		return {
			type: UITypes.KeyValues,
			name: 'Headers',
			location: 'extra'
		}
	}

	shouldDisplay(context: IContext, transaction: ITransaction): boolean {
		return hasComponent(transaction, 'headers');
	}

	getTransactionFromValue(
		newValue: KeyValues<string>,
		currentTransaction: ITransaction
	): ITransaction {
		return setComponent(currentTransaction, 'headers', newValue);
	}

	getValueFromTransaction(
		newTransaction: ITransaction
	): KeyValues<string> {
		return getComponent<KeyValues<string>>(newTransaction, 'headers');
	}
}
