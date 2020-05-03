'use strict';

import { UITypes, ITransaction, IUserInterface, IContext, KeyValues } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent, getBinaryComponentString } from "../../../utils/transactionTools";
import { getHeaderValue } from "../utils/HeaderUtils";

export class BodyPreviewComponent extends UserInterfaceHandler<string> {
	getUI(t: ITransaction, context: IContext): IUserInterface {
		return {
			type: UITypes.HTML,
			name: 'body',
			subName: 'preview',
			location: 'extra',
		}
	}

	shouldDisplay(t: ITransaction, context: IContext): boolean {
		if (context !== 'incoming' || !hasComponent(t, 'headers'))
			return false;

		let contentType = getHeaderValue(
			getComponent<KeyValues<string>>(t, 'headers'),
			'content-type', ''
		);
		return contentType.toLowerCase().startsWith('text/');
	}

	getTransactionFromValue(html: string, tCurrent: ITransaction): ITransaction {
		// Read Only
		return tCurrent;
	}

	getValueFromTransaction(tNew: ITransaction, context: IContext): string {
		return getBinaryComponentString(tNew, 'body');
	}
}
