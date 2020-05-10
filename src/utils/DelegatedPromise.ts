'use strict';
export class PromiseCancelledError extends Error {
	constructor(...params: any[]) {
		// Pass remaining arguments (including vendor specific ones) to parent constructor
		super(...params);

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, PromiseCancelledError)
		}

		this.name = 'PromiseCancelledError';
	}
}

export class DelegatedPromise<T> implements Promise<T> {
	private promise: Promise<T>;
	private doResolve?: (value?: T | PromiseLike<T> | undefined) => void;
	private doReject?: (reason?: any) => void;
	private isCancelled: boolean;
	public id: number;

	constructor(id: number) {
		this.isCancelled = false;
		this.id = id;
		this.promise = new Promise( (resolve, reject) => {
			this.doResolve = resolve;
			this.doReject = reject;
		} )
	}

	fulfill( value?: T | PromiseLike<T> | undefined ): void {
		if (!this.isCancelled) {
			this.doResolve!( value );
		}
	}

	reject( error?: any ): void {
		this.doReject!( error );
	}

	cancel(): void {
		this.isCancelled = true;
		this.reject(new PromiseCancelledError());
	}

	// Promise interface:
	then<TResult1 = T, TResult2 = never>(
		onfulfilled?: ( (value: T) => TResult1 | PromiseLike<TResult1> ) | null | undefined,
		onrejected?: ( (reason: any) => TResult2 | PromiseLike<TResult2> ) | null | undefined
	): Promise<TResult1 | TResult2> {
		return this.promise.then( onfulfilled, onrejected );
	}

	catch<TResult = never>(
		onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined
	): Promise<T | TResult> {
		return this.promise.catch( onrejected );
	}

	[Symbol.toStringTag]: string;
	finally( onfinally?: ( () => void ) | null | undefined ): Promise<T> {
		return this.promise.finally( onfinally );
	}
}
