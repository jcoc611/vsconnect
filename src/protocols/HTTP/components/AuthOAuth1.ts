'use strict';

import { UITypes, ITransaction, KeyValues, IUserInterface, IContext } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent } from "../../../utils/transactionTools";
import { OAuth1, OAuth1Request, OAuth1Token } from "../utils/OAuth1";

export class AuthOAuth1Component extends UserInterfaceHandler<string[]> {

	defaultValue(): string[] {
		return [ '', '' ];
	}

	getUI(transaction: ITransaction): IUserInterface {
		let value: string[] = this.getValueFromTransaction(transaction);
		return {
			type: UITypes.Form,
			name: 'auth',
			subName: 'OAuth 1.0',
			location: 'extra',
			components: [
				{
					name: 'Consumer Key',
					type: UITypes.String,
					location: 'extra',
				},
				{
					name: 'Consumer Secret',
					type: UITypes.String,
					location: 'extra',
				},
				{
					name: 'Access Token',
					type: UITypes.String,
					location: 'extra',
				},
				{
					name: 'Token Secret',
					type: UITypes.String,
					location: 'extra',
				}
			],
			count: (value[0] !== '' || value[1] !== '')? 'OAuth 1.0': undefined,
		}
	}

	shouldDisplay(context: IContext, transaction: ITransaction): boolean {
		return context === 'outgoing' && hasComponent(transaction, 'headers');
	}

	getTransactionFromValue(
		newValue: string[],
		currentTransaction: ITransaction
	): ITransaction {
		if (newValue.length < 4 || (newValue[0] === '' && newValue[1] === ''))
			return currentTransaction;

		let newTransaction = setComponent(currentTransaction, 'oauth-1.0', newValue);

		let consumer = { key: newValue[0], secret: newValue[1] };
		let tokens: OAuth1Token | undefined = undefined;
		if (newValue[2] && newValue[3])
			tokens = { key: newValue[2], secret: newValue[3] };
		const oauth = new OAuth1({ consumer, signatureMethod: 'HMAC-SHA1', realm: '' });

		let host: string = getComponent<string>(currentTransaction, 'host');
		let uri: string =  host + getComponent<string>(currentTransaction, 'path');
		let reqData: OAuth1Request = {
			method: getComponent(currentTransaction, 'verb'),
			uri,
			body: getComponent(currentTransaction, 'body'),
		};
		let authStr: string = oauth.getAuthHeader(reqData, tokens);

		let currentHeaders = getComponent<KeyValues<string>>(currentTransaction, 'headers', []);
		let newHeaders = [...currentHeaders];
		let iAuth = newHeaders.findIndex((h) => h[0].toLowerCase() === 'authorization');
		if (iAuth >= 0)
			newHeaders[iAuth][1] = authStr;
		else
			newHeaders.push([ 'authorization', authStr ]);

		return setComponent(newTransaction, 'headers', newHeaders);
	}

	getValueFromTransaction(
		newTransaction: ITransaction
	): string[] {
		if (hasComponent(newTransaction, 'oauth-1.0'))
			return getComponent<string[]>(newTransaction, 'oauth-1.0');

		return ['', '', '', ''];
	}

	shouldRecompute(oldTransaction: ITransaction, newTransaction: ITransaction): boolean {
		return hasComponent(newTransaction, 'oauth-1.0');
	}
}
