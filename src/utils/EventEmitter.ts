type Callback = (...params: any[]) => void;

export class EventEmitter {
	eventListeners: Map<string, Callback[]> = new Map();

	on( eventName: string, callback: (...params: any[]) => void ) {
		if ( !this.eventListeners.has(eventName) ) {
			this.eventListeners.set(eventName, []);
		}

		this.eventListeners.get(eventName)!.push(callback);
	}

	trigger( eventName: string, ...params: any[] ) {
		if ( !this.eventListeners.has(eventName) ) {
			return;
		}

		for ( let cb of this.eventListeners.get(eventName)! ) {
			cb(...params);
		}
	}
}
