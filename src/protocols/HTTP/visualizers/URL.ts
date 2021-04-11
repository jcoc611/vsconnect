import { UITypes, ITransaction, KeyValues, IUserInterface, IContext } from "../../../interfaces";
import { Visualizer } from "../../../visualizers/Visualizer";
import { hasComponent, getComponent, setComponent, setComponents } from "../../../utils/transactionTools";

export class URLVisualizer extends Visualizer<string> {
	getUI(transaction: ITransaction, context: IContext): IUserInterface {
		return {
			type: UITypes.String,
			name: 'URL',
			location: 'short'
		}
	}

	shouldDisplay(t: ITransaction, context: IContext): boolean {
		return hasComponent(t, 'path') && hasComponent(t, 'host');
	}

	getTransactionFromValue(valueNew: string, tCurrent: ITransaction): ITransaction {
		let result = tCurrent;
		let parts = /(.*?:\/\/|)?([^\/]*)(.*)$/.exec(valueNew);
		if (!parts || parts.length !== 4) {
			throw new Error('URL has wrong format');
		}

		let schema = parts[1] || '';
		let host = parts[2] || '';
		let path = parts[3] || '';

		if (schema.toLowerCase() === 'https://') {
			result = setComponent(result, 'tls', { enabled: true });
		}

		result = setComponents(result, {
			host: schema + host,
			path: path
		});

		return result;
	}

	getValueFromTransaction(tNew: ITransaction, context: IContext): string {
		return getComponent<string>(tNew, 'host') + getComponent<string>(tNew, 'path');
	}
}
