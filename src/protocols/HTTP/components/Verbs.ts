import { UITypes, ITransaction, IUserInterface, IContext } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../UserInterfaceHandler";
import { hasComponent, getComponent, setComponent } from "../../../utils/transactionTools";

export class VerbsComponent extends UserInterfaceHandler<string> {
	getUI(transaction: ITransaction): IUserInterface {
		return {
			type: UITypes.Enum,
			name: 'Verb',
			location: 'short',

			allowedValues: [
				'GET', 'HEAD', 'POST', 'PUT',
				'DELETE', 'CONNECT', 'OPTIONS',
				'TRACE', 'PATCH'
			]
		}
	}

	shouldDisplay(context: IContext, transaction: ITransaction): boolean {
		return hasComponent(transaction, 'verb');
	}

	getTransactionFromValue(
		newValue: string,
		currentTransaction: ITransaction
	): ITransaction {
		return setComponent(currentTransaction, 'verb', newValue);
	}

	getValueFromTransaction(
		newTransaction: ITransaction
	): string {
		return getComponent<string>(newTransaction, 'verb');
	}
}
