'use strict';

import { UITypes, ITransaction, IUserInterface, IContext, BytesValue } from "../../../interfaces";
import { Visualizer } from "../../../visualizers/Visualizer";
import { hasComponent, getComponent, setComponent, setKeyValueComponent, hasKeyValueComponent, deleteComponent } from "../../../utils/transactionTools";

const multipartMIME = 'multipart/form-data; boundary=<calculated when sent>';

export type MultipartValue = [string, BytesValue, string][];
export class BodyMultipartVisualizer extends Visualizer<MultipartValue> {
	getUI(t: ITransaction, context: IContext): IUserInterface {
		let valueCur = this.getValueFromTransaction(t, context);
		return {
			type: UITypes.Table,
			name: 'body',
			subName: 'multipart',
			location: 'extra',
			count: (valueCur.length > 0)? `${valueCur.length} parts`: undefined,
			components: [
				{
					type: UITypes.String,
					name: 'name',
					location: 'extra'
				},
				{
					type: UITypes.BytesInline,
					name: 'value',
					location: 'extra',
					defaultValue: <BytesValue> {
						type: 'empty'
					}
				},
				{
					type: UITypes.String,
					name: 'content-type',
					location: 'extra'
				}
			]
		};
	}

	shouldDisplay(t: ITransaction, context: IContext): boolean {
		return (context === 'outgoing' && hasComponent(t, 'body'));
	}

	shouldRecompute(tOld: ITransaction, tNew: ITransaction): boolean {
		return (hasComponent(tNew, 'extra:body-multipart')
			&& !hasKeyValueComponent(tNew, 'headers', 'Content-Type', multipartMIME));
	}

	getTransactionFromValue(valueNew: MultipartValue, tCurrent: ITransaction): ITransaction {
		if (valueNew.length == 0) {
			return deleteComponent(tCurrent, 'extra:body-multipart');
		}

		let tNew = tCurrent;
		tNew = setKeyValueComponent(tNew, 'headers', 'Content-Type', multipartMIME);
		return setComponent(tNew, 'extra:body-multipart', valueNew);
	}

	getValueFromTransaction(tNew: ITransaction, context: IContext): MultipartValue {
		if (!hasKeyValueComponent(tNew, 'headers', 'Content-Type', multipartMIME))
			return [];

		return getComponent<MultipartValue>(tNew, 'extra:body-multipart', []);
	}
}
