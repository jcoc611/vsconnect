'use strict';

import { UITypes, ITransaction, KeyValues, IUserInterface, IContext } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent, deleteKeyValueComponent, setKeyValueComponent } from "../../../utils/transactionTools";

export class AuthBasicComponent extends UserInterfaceHandler<string[]> {

	defaultValue(): string[] {
		return [ '', '' ];
	}

	getUI(t: ITransaction, context: IContext): IUserInterface {
		let value: string[] = this.getValueFromTransaction(t, context);
		return {
			type: UITypes.Form,
			name: 'auth',
			subName: 'basic',
			location: 'extra',
			components: [
				{
					name: 'username',
					type: UITypes.String,
					location: 'extra',
				},
				{
					name: 'password',
					type: UITypes.String,
					location: 'extra',
				}
			],
			count: (value[0] !== '' || value[1] !== '')? 'Basic': undefined,
		}
	}

	shouldDisplay(t: ITransaction, context: IContext): boolean {
		return context === 'outgoing' && hasComponent(t, 'headers');
	}

	getTransactionFromValue(valueNew: string[], tCurrent: ITransaction): ITransaction {
		if (valueNew.length < 2 || (valueNew[0] === '' && valueNew[1] === '')) {
			return deleteKeyValueComponent(tCurrent, 'headers', 'authorization');
		}

		let basicAuthStr = 'Basic ' + Buffer.from(`${valueNew[0]}:${valueNew[1]}`).toString('base64');
		return setKeyValueComponent(tCurrent, 'headers', 'authorization', basicAuthStr);
	}

	getValueFromTransaction(tNew: ITransaction, context: IContext): string[] {
		return this.fromHeaders( getComponent<KeyValues<string>>(tNew, 'headers') );
	}

	private fromHeaders(headers: KeyValues<string>): string[] {
		let auth: string[] | undefined = headers.find((h) => h[0].toLowerCase() == 'authorization');
		if (auth === undefined)
			return ['', ''];

		if (!auth[1].toLowerCase().startsWith('basic'))
			return ['', ''];

		let data: string[] = Buffer.from(auth[1].split(' ')[1], 'base64').toString('utf8').split(':');
		return data;
	}
}
