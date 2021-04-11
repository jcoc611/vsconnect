import { ITransaction, IUserInterface, KeyValues, IContext, IComponent } from "../interfaces";

export abstract class Visualizer<T> {
	abstract getUI(transaction: ITransaction, context: IContext): IUserInterface;
	abstract shouldDisplay(t: ITransaction, context: IContext): boolean;
	abstract getValueFromTransaction(t: ITransaction, context: IContext): T;
	abstract getTransactionFromValue(valueNew: T, tCurrent: ITransaction): ITransaction;

	/**
	 * Determines whether the visualizer should recompute the value(s) of its component(s) based on a
	 * change from a different visualizer.
	 *
	 * This is useful when the final components given by getTransactionFromValue depend on other
	 * components. For example, in auth, sometimes a visualizer will need to sign the entire
	 * transaction, or parts of it. In this case, when a visualizer modifies part of the transaction
	 * that is relevant to the signing, the auth visualizer should recompute the final transaction
	 * value with the right signature.
	 */
	shouldRecompute(tOld: ITransaction, tNew: ITransaction): boolean {
		return false;
	}
}
