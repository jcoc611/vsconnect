'use strict';

import { UITypes, ITransaction, KeyValues, IUserInterface, IContext } from "../../../interfaces";
import { Visualizer } from "../../../visualizers/Visualizer";
import { hasComponent, getComponent, setComponent, deleteKeyValueComponent, setKeyValueComponent, getKeyValueComponent } from "../../../utils/transactionTools";

export class AuthBasicVisualizer extends Visualizer<[string, string]> {

	defaultValue(): [string, string] {
		return [ '', '' ];
	}

	getUI(t: ITransaction, context: IContext): IUserInterface {
		let value: [string, string] = this.getValueFromTransaction(t, context);
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

	getTransactionFromValue(valueNew: [string, string], tCurrent: ITransaction): ITransaction {
		if (valueNew.length < 2 || (valueNew[0] === '' && valueNew[1] === '')) {
			return deleteKeyValueComponent(tCurrent, 'headers', 'authorization');
		}

		let basicAuthStr = 'Basic ' + Buffer.from(`${valueNew[0]}:${valueNew[1]}`).toString('base64');
		return setKeyValueComponent(tCurrent, 'headers', 'authorization', basicAuthStr);
	}

	getValueFromTransaction(tNew: ITransaction, context: IContext): [string, string] {
		let headerValue = getKeyValueComponent(tNew, 'headers', 'authorization', '');
		if (headerValue === '')
			return ['', ''];

		return this.fromHeaderValue(headerValue);
	}

	private fromHeaderValue(headerValue: string): [string, string] {
		if (!headerValue.toLowerCase().startsWith('basic'))
			return ['', ''];

		let dataEncoded: string = Buffer.from(headerValue.split(' ')[1], 'base64').toString('utf8');
		let userEnd = dataEncoded.indexOf(':');

		return [ dataEncoded.substr(0, userEnd), dataEncoded.substr(userEnd + 1) ];
	}
}
