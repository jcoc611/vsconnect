'use strict';

import { IStoreItem } from "../interfaces";
import { EventEmitter } from "../utils/EventEmitter";

export class StoreDatabase extends EventEmitter {
	private data: { [storeId: string]: IStoreItem<any>[] };

	constructor(dataInitial?: { [storeId: string]: IStoreItem<any>[] }) {
		super();

		if (dataInitial !== undefined) {
			this.data = dataInitial;
		} else {
			this.data = {};
		}
	}

	public getItems(storeId: string): IStoreItem<any>[] {
		if (this.data[storeId] !== undefined) {
			return this.data[storeId];
		}

		return [];
	}

	public addItem(storeId: string, item: IStoreItem<any>): void {
		if (this.data[storeId] === undefined) {
			this.data[storeId] = [];
		}

		this.data[storeId]!.push(item);
		this.trigger('change');
	}

	public setItems(storeId: string, items: IStoreItem<any>[]): void {
		this.data[storeId] = items;
		this.trigger('change');
	}

	public toJSON(): string {
		return JSON.stringify(this.data);
	}
}
