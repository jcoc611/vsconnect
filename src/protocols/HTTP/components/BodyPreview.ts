'use strict';

import { UITypes, ITransaction, IUserInterface, IContext, KeyValues } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent, getBinaryComponentString } from "../../../utils/transactionTools";
import { getHeaderValue } from "../utils/HeaderUtils";

export class BodyPreviewComponent extends UserInterfaceHandler<string> {
	getUI(transaction: ITransaction): IUserInterface {
		return {
			type: UITypes.HTML,
			name: 'body',
			subName: 'preview',
			location: 'extra',
		}
	}

	shouldDisplay(context: IContext, transaction: ITransaction): boolean {
		if (context !== 'incoming' || !hasComponent(transaction, 'headers'))
			return false;

		let contentType = getHeaderValue(
			getComponent<KeyValues<string>>(transaction, 'headers'), 'content-type', ''
		);
		return contentType.toLowerCase().startsWith('text/');
	}

	getTransactionFromValue(
		html: string,
		currentTransaction: ITransaction
	): ITransaction {
		// Read Only
		return currentTransaction;
	}

	getValueFromTransaction(
		newTransaction: ITransaction
	): string {
		return getBinaryComponentString(newTransaction, 'body');
	}
}
