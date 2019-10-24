import { Payload } from "../../payloads/Payload";

export class HTTPResponse extends Payload {
	static FromNativeResponse( response : Response ): HTTPResponse {
		let result = new HTTPResponse();
		result.setBody( String( response.body ) );

		return result;
	}

	constructor() {
		super();
	}
}
