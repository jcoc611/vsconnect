'use strict';

import { UITypes, ITransaction, KeyValues, IUserInterface, IContext } from "../../../interfaces";
import { UserInterfaceHandler } from "../../../uiHandlers/UserInterfaceHandler";
import { hasComponent, getComponent, setComponent, getBinaryComponentValue, getBinaryComponentString } from "../../../utils/transactionTools";
import { OAuth1, OAuth1Request, OAuth1Token } from "../utils/OAuth1";

export class AuthOAuth1Component extends UserInterfaceHandler<string[]> {

	defaultValue(): string[] {
		return [ '', '' ];
	}

	getUI(t: ITransaction, context: IContext): IUserInterface {
		let value: string[] = this.getValueFromTransaction(t, context);
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

	shouldDisplay(t: ITransaction, context: IContext): boolean {
		return context === 'outgoing' && hasComponent(t, 'headers');
	}

	getTransactionFromValue(valueNew: string[], tCurrent: ITransaction): ITransaction {
		if (valueNew.length < 4 || (valueNew[0] === '' && valueNew[1] === ''))
			return tCurrent;

		let newTransaction = setComponent(tCurrent, 'extra:oauth-1.0', valueNew);

		let consumer = { key: valueNew[0], secret: valueNew[1] };
		let tokens: OAuth1Token | undefined = undefined;
		if (valueNew[2] && valueNew[3])
			tokens = { key: valueNew[2], secret: valueNew[3] };
		const oauth = new OAuth1({ consumer, signatureMethod: 'HMAC-SHA1', realm: '' });

		let host: string = getComponent<string>(tCurrent, 'host');
		let uri: string =  host + getComponent<string>(tCurrent, 'path');
		let reqData: OAuth1Request = {
			method: getComponent(tCurrent, 'verb'),
			uri,
			body: getBinaryComponentString(tCurrent, 'body'),
		};
		let authStr: string = oauth.getAuthHeader(reqData, tokens);

		let currentHeaders = getComponent<KeyValues<string>>(tCurrent, 'headers', []);
		let newHeaders = [...currentHeaders];
		let iAuth = newHeaders.findIndex((h) => h[0].toLowerCase() === 'authorization');
		if (iAuth >= 0)
			newHeaders[iAuth][1] = authStr;
		else
			newHeaders.push([ 'authorization', authStr ]);

		return setComponent(newTransaction, 'headers', newHeaders);
	}

	getValueFromTransaction(tNew: ITransaction, context: IContext): string[] {
		if (hasComponent(tNew, 'extra:oauth-1.0'))
			return getComponent<string[]>(tNew, 'extra:oauth-1.0');

		return ['', '', '', ''];
	}

	shouldRecompute(tOld: ITransaction, tNew: ITransaction): boolean {
		return hasComponent(tNew, 'extra:oauth-1.0');
	}
}
