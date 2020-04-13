import { ITransaction, IUserInterface, KeyValues, IContext } from "../interfaces";

export abstract class UserInterfaceHandler<T> {
	abstract getUI(transaction: ITransaction): IUserInterface;
	abstract shouldDisplay(context: IContext,transaction: ITransaction): boolean;

	abstract getValueFromTransaction(
		transaction: ITransaction
	): T;

	abstract getTransactionFromValue(
		newValue: T,
		currentTransaction: ITransaction
	): ITransaction;

	/**
	 * Determines whether the handler should recompute the value(s) of its component(s) based on a
	 * change from a different handler.
	 *
	 * This is useful when the final components given by getTransactionFromValue depend on other
	 * components. For example, in auth, sometimes a handler will need to sign the entire
	 * transaction, or parts of it. In this case, when a handler modifies part of the transaction
	 * that is relevant to the signing, the auth handler should recompute the final transaction
	 * value with the right signature.
	 */
	shouldRecompute(oldTransaction: ITransaction, newTransaction: ITransaction): boolean {
		return false;
	}
}
