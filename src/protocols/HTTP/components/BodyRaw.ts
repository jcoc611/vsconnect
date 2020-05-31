'use strict';

import { UITypes, ITransaction, IUserInterface, IContext, KeyValues, BytesValue } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent, getBinaryComponentSize, hasKeyValueComponent, getKeyValueComponent, setKeyValueComponent } from "../../../utils/transactionTools";
import { getHeaderValue } from "../utils/HeaderUtils";
import { Formats } from "../../../utils/Formats";
import { StringFormats } from "../utils/StringFormats";

export class BodyRawComponent extends UserInterfaceHandler<BytesValue> {
	getUI(t: ITransaction, context: IContext): IUserInterface {
		let count: string | undefined;
		let byteCount = getBinaryComponentSize(t, 'body');
		if (byteCount > 0) {
			count = Formats.byteCountToString(byteCount);
		}

		return {
			location: 'extra',
			type: UITypes.BytesString,
			name: 'body',
			subName: 'raw',
			count
		}
	}

	shouldRecompute(tOld: ITransaction, tNew: ITransaction): boolean {
		return (
			getKeyValueComponent(tOld, 'headers', 'Content-Type', '')
			!== getKeyValueComponent(tNew, 'headers', 'Content-Type', '')
		);
	}

	shouldDisplay(t: ITransaction, context: IContext): boolean {
		return hasComponent(t, 'body');
	}

	getTransactionFromValue(valueNew: BytesValue, tCurrent: ITransaction): ITransaction {
		let tNew = setKeyValueComponent(
			tCurrent, 'headers', 'Content-Type',
			StringFormats.contentTypeFromMimeNew(
				valueNew.languageHint || '',
				getKeyValueComponent(tCurrent, 'headers', 'Content-Type', '')
			)
		);
		return setComponent(tNew, 'body', valueNew);
	}

	getValueFromTransaction(tNew: ITransaction, context: IContext): BytesValue {
		let valueCur = getComponent<BytesValue>(tNew, 'body', { type: 'empty' });
		if (hasKeyValueComponent(tNew, 'headers', 'Content-Type')) {
			let contentType = StringFormats.mimeFromContentType(
				getKeyValueComponent(tNew, 'headers', 'Content-Type')
			);
			if (valueCur.type === 'empty') {
				valueCur = { type: 'string', rawValue: '', languageHint: contentType };
			} else if (valueCur.type === 'string') {
				valueCur.languageHint = contentType;
			}
		}
		return valueCur;
	}
}
