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
		const currentValue: T = this.getValueFromTransaction(transaction);
		let ui: IUserInterface = Object.assign({}, this.uiSpec);
		if (Array.isArray(currentValue))
			ui.count = `${currentValue.length}`;

		if (typeof(currentValue) === 'string' && ui.type == UITypes.Bytes) {
			let valLength = Buffer.byteLength(currentValue, 'utf8');

			if (valLength < (1 << 10))
				ui.count = `${valLength} B`;
			else if (valLength < (1 << 20))
				ui.count = `${(valLength / (1 << 10)).toFixed(2)} KB`;
			else if (valLength < (1 << 30))
				ui.count = `${(valLength / (1 << 20)).toFixed(2)} MB`;
			else if (valLength < (1 << 40))
				ui.count = `${(valLength / (1 << 30)).toFixed(2)} GB`;
			else
				ui.count = `${(valLength / (1 << 40)).toFixed(2)} TB`;
		}

		return ui;
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
