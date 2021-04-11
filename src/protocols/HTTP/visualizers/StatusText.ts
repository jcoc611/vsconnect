import { UITypes, ITransaction, IUserInterface, IContext } from "../../../interfaces";
import { Visualizer } from "../../../visualizers/Visualizer";
import { hasComponent, getComponent, setComponent } from "../../../utils/transactionTools";

export class StatusTextVisualizer extends Visualizer<string> {
	getUI(t: ITransaction, context: IContext): IUserInterface {
		return {
			type: UITypes.String,
			name: 'Status',
			location: 'short',
		}
	}

	shouldDisplay(t: ITransaction, context: IContext): boolean {
		return (context === 'incoming');
	}

	getTransactionFromValue(shortStatus: string, tCurrent: ITransaction): ITransaction {
		throw new Error('Short status component is read only');
		// return Object.assign({}, tCurrent, { shortStatus });
	}

	getValueFromTransaction(tNew: ITransaction, context: IContext): string {
		return tNew.shortStatus;
	}
}
