'use strict';

import { UITypes, ITransaction, IUserInterface, IContext, BytesValue } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent, setKeyValueComponent } from "../../../utils/transactionTools";

export type MultipartValue = [string, BytesValue, string][];
export class BodyMultipartComponent extends UserInterfaceHandler<MultipartValue> {
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

	getTransactionFromValue(valueNew: MultipartValue, tCurrent: ITransaction): ITransaction {
		let tNew = tCurrent;
		tNew = setKeyValueComponent(
			tNew, 'headers', 'Content-Type',
			'multipart/form-data; boundary=<calculated when sent>'
		);
		return setComponent(tNew, 'extra:body-multipart', valueNew);
	}

	getValueFromTransaction(tNew: ITransaction, context: IContext): MultipartValue {
		return getComponent<MultipartValue>(tNew, 'extra:body-multipart', []);
	}
}
