import { UITypes, ITransaction, KeyValues, IUserInterface, IContext } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent } from "../../../utils/transactionTools";

export class BodyComponent extends UserInterfaceHandler<string> {
	getUI(transaction: ITransaction): IUserInterface {
		return {
			type: UITypes.Bytes,
			name: 'Body',
			location: 'extra'
		}
	}

	shouldDisplay(context: IContext, transaction: ITransaction): boolean {
		return hasComponent(transaction, 'body');
	}

	getTransactionFromValue(
		newValue: string,
		currentTransaction: ITransaction
	): ITransaction {
		return setComponent(currentTransaction, 'body', newValue);
	}

	getValueFromTransaction(
		newTransaction: ITransaction
	): string {
		return getComponent<string>(newTransaction, 'body');
	}
}
