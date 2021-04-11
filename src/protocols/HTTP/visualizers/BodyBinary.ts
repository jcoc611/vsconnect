'use strict';

import { UITypes, ITransaction, IUserInterface, IContext, KeyValues, BytesValue } from "../../../interfaces";
import { Visualizer } from "../../../visualizers/Visualizer";
import { hasComponent, getComponent, setComponent } from "../../../utils/transactionTools";
import { getHeaderValue } from "../utils/HeaderUtils";
import { Formats } from "../../../utils/Formats";

export class BodyBinaryVisualizer extends Visualizer<BytesValue> {
	getUI(t: ITransaction, context: IContext): IUserInterface {
		let valueCur = this.getValueFromTransaction(t, context);
		return {
			type: UITypes.BytesBinary,
			name: 'body',
			subName: 'binary',
			location: 'extra',
			count: (valueCur.type === 'file')? Formats.byteCountToString(valueCur.sizeBytes): undefined
		}
	}

	shouldDisplay(t: ITransaction, context: IContext): boolean {
		return (context === 'outgoing' && hasComponent(t, 'body'));
	}

	getTransactionFromValue(valueNew: BytesValue, tCurrent: ITransaction): ITransaction {
		return setComponent(tCurrent, 'body', valueNew);
	}

	getValueFromTransaction(tNew: ITransaction, context: IContext): BytesValue {
		return getComponent<BytesValue>(tNew, 'body', { type: 'empty' });
	}
}
