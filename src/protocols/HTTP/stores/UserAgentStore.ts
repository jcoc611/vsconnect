'use strict';

import { Store, StoreItem } from "../../../stores/Store";
import { ITransaction, IContext } from "../../../interfaces";
import { setKeyValueComponent, getKeyValueComponent, hasComponent } from "../../../utils/transactionTools";

/**
 * Trivial store for keeping the User-Agent across requests.
 * The user can change the User Agent on any outgoing request, and it will be remembered.
 */
export class UserAgentStore extends Store<string> {
	public shouldProcess(t: ITransaction, context: IContext): boolean {
		return context === 'outgoing' && hasComponent(t, 'headers');
	}

	public areItemsEqual(item1: StoreItem<string>, item2: StoreItem<string>): boolean {
		// TODO
		return true;
	}

	public matchesKey(key: string, item: StoreItem<string>): boolean {
		return true;
	}

	public getKeyFilterFromTransaction(t: ITransaction): string {
		// TODO: Is it useful to have different User-Agent_s for different URLs?
		return '';
	}

	public getStoreItemsFromTransaction(t: ITransaction, context: IContext): StoreItem<string>[] {
		if (context === 'incoming') {
			return [];
		} else {
			let userAgent = getKeyValueComponent(t, 'headers', 'User-Agent', '');
			if (userAgent === '')
				return [];

			let storeItem: StoreItem<string> = {
				ttlSec: Number.POSITIVE_INFINITY,
				timestampSec: (new Date()).getTime() / 1000,

				data: userAgent
			};
			return [ storeItem ];
		}
	}

	public getTransactionFromStoreItems(items: StoreItem<string>[], tCur: ITransaction): ITransaction {
		if (items.length === 0) {
			return tCur;
		}

		return setKeyValueComponent(tCur, 'headers', 'User-Agent', items[0].data);
	}
}
