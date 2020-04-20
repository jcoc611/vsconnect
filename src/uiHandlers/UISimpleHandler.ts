import { UITypes, ITransaction, IUserInterface, IContext, BytesValue } from "../interfaces";
import { UserInterfaceHandler } from "../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent, getBinaryComponentSize } from "../utils/transactionTools";
import { Formats } from "../utils/Formats";

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

		if (ui.type === UITypes.BytesString || ui.type === UITypes.BytesBinary) {
			let bytesVal: BytesValue = currentValue as any;
			if (
				(bytesVal.type === 'file' && ui.type === UITypes.BytesBinary) ||
				(bytesVal.type === 'string' && ui.type === UITypes.BytesString)
			) {
				let byteCount = getBinaryComponentSize(transaction, ui.name);
				if (byteCount > 0) {
					ui.count = Formats.byteCountToString(byteCount);
				}
			}
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
