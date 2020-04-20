'use strict';

import { UITypes, ITransaction, IUserInterface, IContext, KeyValues, BytesValue } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent } from "../../../utils/transactionTools";
import { getHeaderValue } from "../utils/HeaderUtils";
import { Formats } from "../../../utils/Formats";

export class BodyBinaryComponent extends UserInterfaceHandler<BytesValue> {
	getUI(transaction: ITransaction): IUserInterface {
		let valueCur = this.getValueFromTransaction(transaction);
		return {
			type: UITypes.BytesBinary,
			name: 'body',
			subName: 'binary',
			location: 'extra',
			count: (valueCur.type === 'file')? Formats.byteCountToString(valueCur.sizeBytes): undefined
		}
	}

	shouldDisplay(context: IContext, transaction: ITransaction): boolean {
		return (context === 'outgoing' && hasComponent(transaction, 'body'));
	}

	getTransactionFromValue(
		newValue: BytesValue,
		currentTransaction: ITransaction
	): ITransaction {
		return setComponent(currentTransaction, 'body', newValue);
	}

	getValueFromTransaction(
		newTransaction: ITransaction
	): BytesValue {
		return getComponent<BytesValue>(newTransaction, 'body', { type: 'empty' });
	}
}
