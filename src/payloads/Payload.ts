import { IPayload } from "../interfaces";

export class Payload implements IPayload {
	endpoint: string;

	public body: string = '';

	constructor( endpoint: string = '' ) {
		this.endpoint = endpoint;
	}

	setBody( body: string ) {
		this.body = body;
	}

	getBodyText(): string {
		return this.body;
	}
}
