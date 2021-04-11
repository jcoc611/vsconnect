type Callback = (...params: any[]) => void;

export class EventEmitter {
	eventListeners: Map<string, Callback[]> = new Map();

	on(eventName: string, callback: (...params: any[]) => void): void {
		if ( !this.eventListeners.has(eventName) ) {
			this.eventListeners.set(eventName, []);
		}

		this.eventListeners.get(eventName)!.push(callback);
	}

	off(eventName: string, callback: (...params: any[]) => void): void {
		let listeners: Callback[] = this.eventListeners.get(eventName)!;
		let listenersNew: Callback[] = [];
		for (let listener of listeners) {
			if (listener !== callback) {
				listenersNew.push(listener);
			}
		}

		this.eventListeners.set(eventName, listenersNew);
	}

	trigger( eventName: string, ...params: any[] ): void {
		if ( !this.eventListeners.has(eventName) ) {
			return;
		}

		for ( let cb of this.eventListeners.get(eventName)! ) {
			cb(...params);
		}
	}
}
