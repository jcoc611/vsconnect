'use strict';

import { ITransaction, IContext, IStoreItem, IStoreMetadata } from "../interfaces";
import { StoreDatabase } from "./StoreDatabase";


export abstract class Store<T> {
	private db?: StoreDatabase;

	public abstract getMetadata(): IStoreMetadata;
	public abstract shouldProcess(t: ITransaction, context: IContext): boolean;
	public abstract matchesKey(key: string, item: IStoreItem<T>): boolean;
	public abstract areItemsEqual(item1: IStoreItem<T>, item2: IStoreItem<T>): boolean;
	public abstract getKeyFilterFromTransaction(t: ITransaction): string;
	public abstract getStoreItemsFromTransaction(t: ITransaction, context: IContext): IStoreItem<T>[];
	public abstract getTransactionFromStoreItems(items: IStoreItem<T>[], tCur: ITransaction): ITransaction;

	// Wired to Services.ts
	public setDb(db: StoreDatabase): void {
		this.db = db;
	}

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
			let itemsNew: IStoreItem<T>[] = this.getStoreItemsFromTransaction(tNew, 'outgoing');
			for (let itemNew of itemsNew) {
				this.insertItem(itemNew);
			}
			return tNew;
		} else {
			let storeItems = this.getItems(keyNew);
			return this.getTransactionFromStoreItems(storeItems, tNew);
		}
	}

	protected upsertItems(itemsNew: IStoreItem<T>[]): void {
		for (let itemNew of itemsNew) {
			this.upsertItem(itemNew);
		}
	}

	protected upsertItem(itemNew: IStoreItem<T>): void {
		if (this.db === undefined) {
			throw new Error('Unexpected: store.upsertItem(...) called before db was set');
		}

		let storeId = this.getMetadata().name;
		let items = this.db.getItems(storeId);
		for (let i = 0; i < items.length; i++) {
			let itemCur: IStoreItem<T> = items[i];
			if (this.areItemsEqual(itemCur, itemNew)) {
				// Update
				items[i] = itemNew;
				return;
			}
		}

		// Insert
		this.db.addItem(storeId, itemNew);
	}

	protected insertItem(item: IStoreItem<T>): void {
		if (this.db === undefined) {
			throw new Error('Unexpected: store.insertItem(...) called before db was set');
		}

		this.db.addItem(this.getMetadata().name, item);
	}

	protected removeItemsWithKey(key: string): void {
		if (this.db === undefined) {
			throw new Error('Unexpected: store.removeItemsWithKey(...) called before db was set');
		}

		let storeId = this.getMetadata().name;
		let items = this.db.getItems(storeId);
		this.db.setItems(
			storeId,
			items.filter((item) => !this.matchesKey(key, item))
		);
	}

	protected getItems(keyFilter?: string): IStoreItem<T>[] {
		if (this.db === undefined) {
			throw new Error('Unexpected: store.getItems(...) called before db was set');
		}

		let items = this.db.getItems(this.getMetadata().name);
		let itemsFiltered: IStoreItem<T>[] = [];
		let timestampSecCur = (new Date()).getTime() / 1000;

		for (let item of items) {
			if (item.ttlSec !== undefined && timestampSecCur > item.timestampSec + item.ttlSec) {
				// TODO; remove item
				continue;
			}

			if (keyFilter !== undefined && !this.matchesKey(keyFilter, item)) {
				continue;
			}

			itemsFiltered.push(item);
		}

		return itemsFiltered;
	}
}
