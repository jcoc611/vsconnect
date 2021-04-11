import { UITypes, ITransaction, KeyValues, IUserInterface, IContext } from "../../../interfaces";
import { Visualizer } from "../../../visualizers/Visualizer";
import { hasComponent, getComponent, setComponent } from "../../../utils/transactionTools";

interface TLSComponentValue {
	enabled: boolean;
}

export class TLSVisualizer extends Visualizer<boolean> {
	getUI(t: ITransaction, context: IContext): IUserInterface {
		return {
			type: UITypes.Boolean,
			name: 'TLS',
			location: 'short'
		}
	}

	shouldDisplay(t: ITransaction, context: IContext): boolean {
		return hasComponent(t, 'tls');
	}

	getTransactionFromValue(valueNew: boolean, tCurrent: ITransaction): ITransaction {
		let tNew: ITransaction = tCurrent;

		let host: string = getComponent<string>(tCurrent, 'host');
		let parts = /(.*?:\/\/|)?([^\/]*)(.*)$/.exec(host)!;
		host = (typeof(parts[1]) === 'string')? host.substr(parts[1].length) : host;
		if (valueNew && parts[1] !== 'https://')
			tNew = setComponent(tNew, 'host', 'https://' + host);
		else if (!valueNew && parts[1] !== 'http://')
			tNew = setComponent(tNew, 'host', 'http://' + host);

		tNew = setComponent(tNew, 'tls', { enabled: valueNew });
		return tNew;
	}

	getValueFromTransaction(tNew: ITransaction, context: IContext): boolean {
		return getComponent<TLSComponentValue>(tNew, 'tls').enabled;
	}
}
