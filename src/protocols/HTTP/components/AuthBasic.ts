'use strict';

import { UITypes, ITransaction, KeyValues, IUserInterface, IContext } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent } from "../../../utils/transactionTools";

export class AuthBasicComponent extends UserInterfaceHandler<string[]> {

	defaultValue(): string[] {
		return [ '', '' ];
	}

	getUI(transaction: ITransaction): IUserInterface {
		let value: string[] = this.getValueFromTransaction(transaction);
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

	shouldDisplay(context: IContext, transaction: ITransaction): boolean {
		return context === 'outgoing' && hasComponent(transaction, 'headers');
	}

	getTransactionFromValue(
		newValue: string[],
		currentTransaction: ITransaction
	): ITransaction {
		if (newValue.length < 2 || (newValue[0] === '' && newValue[1] === ''))
			return currentTransaction;

		let currentHeaders = getComponent<KeyValues<string>>(currentTransaction, 'headers');
		let newHeaders = [...currentHeaders];

		let iAuth = newHeaders.findIndex((h) => h[0].toLowerCase() === 'authorization');
		let basicAuthStr = 'Basic ' + Buffer.from(`${newValue[0]}:${newValue[1]}`).toString('base64');

		if (iAuth >= 0)
			newHeaders[iAuth][1] = basicAuthStr;
		else
			newHeaders.push([ 'authorization', basicAuthStr ]);

		return setComponent(currentTransaction, 'headers', newHeaders);
	}

	getValueFromTransaction(
		newTransaction: ITransaction
	): string[] {
		return this.fromHeaders( getComponent<KeyValues<string>>(newTransaction, 'headers') );
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
