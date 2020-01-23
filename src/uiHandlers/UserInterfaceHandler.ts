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
}
