'use strict';

import { ITransaction, IContext } from "../interfaces";

export interface StoreItemOptions {
	key?: string;
	ttlSec?: number;
	context?: 'editor' | 'workbench' | 'vscode';
}

export interface StoreItem<T> {
	data: T;
	// key: string | null;
	ttlSec?: number;
	timestampSec: number;
}

export abstract class Store<T> {
	private items: StoreItem<T>[] = [];

	public abstract shouldProcess(t: ITransaction, context: IContext): boolean;
	public abstract matchesKey(key: string, item: StoreItem<T>): boolean;
	public abstract areItemsEqual(item1: StoreItem<T>, item2: StoreItem<T>): boolean;
	public abstract getKeyFilterFromTransaction(t: ITransaction): string;
	public abstract getStoreItemsFromTransaction(t: ITransaction, context: IContext): StoreItem<T>[];
	public abstract getTransactionFromStoreItems(items: StoreItem<T>[], tCur: ITransaction): ITransaction;

	// Wired to Services.ts
	public didReceiveResponse(tRes: ITransaction) {
		let storeItems = this.getStoreItemsFromTransaction(tRes, 'incoming');
		if (storeItems.length > 0) {
			this.upsertItems(storeItems);
		}
	}

	public populateDefaultRequest(tReq: ITransaction): ITransaction {
		let keyDefault = this.getKeyFilterFromTransaction(tReq);
		let storeItems = this.getItems(keyDefault);

		return this.getTransactionFromStoreItems(storeItems, tReq);
	}

	public didRequestChange(tOld: ITransaction, tNew: ITransaction): ITransaction {
		let keyOld = this.getKeyFilterFromTransaction(tOld);
		let keyNew = this.getKeyFilterFromTransaction(tNew);

		if (keyOld === keyNew) {
			this.removeItemsWithKey(keyNew);
			let itemsNew: StoreItem<T>[] = this.getStoreItemsFromTransaction(tNew, 'outgoing');
			for (let itemNew of itemsNew) {
				this.insertItem(itemNew);
			}
			return tNew;
		} else {
			let storeItems = this.getItems(keyNew);
			return this.getTransactionFromStoreItems(storeItems, tNew);
		}
	}


	protected upsertItems(itemsNew: StoreItem<T>[]): void {
		for (let itemNew of itemsNew) {
			this.upsertItem(itemNew);
		}
	}

	protected upsertItem(itemNew: StoreItem<T>): void {
		for (let i = 0; i < this.items.length; i++) {
			let itemCur: StoreItem<T> = this.items[i];
			if (this.areItemsEqual(itemCur, itemNew)) {
				// Update
				this.items[i] = itemNew;
				return;
			}
		}

		// Insert
		this.items.push(itemNew);
	}

	protected insertItem(item: StoreItem<T>): void {
		this.items.push(item);
	}

	protected removeItemsWithKey(key: string): void {
		this.items = this.items.filter((item) => !this.matchesKey(key, item));
	}

	protected getItems(keyFilter?: string): StoreItem<T>[] {
		let itemsResult: StoreItem<T>[] = [];
		let timestampSecCur = (new Date()).getTime() / 1000;

		for (let item of this.items) {
			if (item.ttlSec !== undefined && timestampSecCur > item.timestampSec + item.ttlSec) {
				// TODO; remove item
				continue;
			}

			if (keyFilter !== undefined && !this.matchesKey(keyFilter, item)) {
				continue;
			}

			itemsResult.push(item);
		}

		return itemsResult;
	}
}
