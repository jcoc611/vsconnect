'use strict';

import { DelegatedPromise } from "./DelegatedPromise";

export class DelegatedPromiseStore {
	private pendingPromises: { [id: number]: DelegatedPromise<any> } = {};
	private pendingPromiseCount: number = 0;

	create(): DelegatedPromise<any> {
		let promiseId = this.pendingPromiseCount++;
		let newPromise = new DelegatedPromise<any>(promiseId);

		this.pendingPromises[promiseId] = newPromise;
		return newPromise;
	}

	has(id: number): boolean {
		return (id in this.pendingPromises);
	}

	fulfill(id: number, value: any): void {
		if (this.pendingPromises[id] === undefined) {
			throw new Error(`Promise with id ${id} not found`);
		}
		this.pendingPromises[id].fulfill(value);
		delete this.pendingPromises[id];
	}

	cancel(id: number): void {
		if (this.pendingPromises[id] === undefined) {
			throw new Error(`Promise with id ${id} not found`);
		}
		this.pendingPromises[id].cancel();
		delete this.pendingPromises[id];
	}

	reject(id: number, error?: any): void {
		if (this.pendingPromises[id] === undefined) {
			throw new Error(`Promise with id ${id} not found`);
		}
		this.pendingPromises[id].reject(error);
		delete this.pendingPromises[id];
	}
}