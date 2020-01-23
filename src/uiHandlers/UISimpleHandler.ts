import { UITypes, ITransaction, IUserInterface, IContext } from "../interfaces";
import { UserInterfaceHandler } from "../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent } from "../utils/transactionTools";

export class UISimpleHandler<T> extends UserInterfaceHandler<T> {
	protected protocolId: string;
	protected uiSpec: IUserInterface;

	constructor(protocolId: string, uiSpec: IUserInterface) {
		super()

		this.protocolId = protocolId;
		this.uiSpec = uiSpec;
	}

	getUI(transaction: ITransaction): IUserInterface {
		return this.uiSpec;
	}

	shouldDisplay(context: IContext, transaction: ITransaction): boolean {
		if (transaction.protocolId !== this.protocolId) {
			return false;
		}

		if (this.uiSpec.contextType !== undefined && this.uiSpec.contextType !== context) {
			return false;
		}

		return hasComponent(transaction, this.uiSpec.name);
	}

	getTransactionFromValue(
		newValue: T,
		currentTransaction: ITransaction
	): ITransaction {
		return setComponent(currentTransaction, this.uiSpec.name, newValue);
	}

	getValueFromTransaction(
		newTransaction: ITransaction
	): T {
		return getComponent<T>(newTransaction, this.uiSpec.name);
	}
}
