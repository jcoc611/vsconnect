import { UITypes, ITransaction, IUserInterface, IContext } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent } from "../../../utils/transactionTools";

export class StatusTextComponent extends UserInterfaceHandler<string> {
	getUI(transaction: ITransaction): IUserInterface {
		return {
			type: UITypes.String,
			name: 'Status',
			location: 'short',
		}
	}

	shouldDisplay(context: IContext, transaction: ITransaction): boolean {
		return (context === 'incoming');
	}

	getTransactionFromValue(
		shortStatus: string,
		currentTransaction: ITransaction
	): ITransaction {
		return Object.assign({}, currentTransaction, { shortStatus });
	}

	getValueFromTransaction(
		newTransaction: ITransaction
	): string {
		return newTransaction.shortStatus;
	}
}
