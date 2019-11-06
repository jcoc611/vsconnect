import { Payload } from "../../payloads/Payload";
import { IPayload } from "../../interfaces";
import { Response } from "request";

export class HTTPResponse extends Payload {
	static FromNativeResponse( response : Response ): IPayload {
		console.log(response);
		let status = (response.statusCode)? `${response.statusCode}`: '';
		let statusText = (response.statusMessage)? `${response.statusMessage}`: '';

		return {
			body: String( response.body ),
			shortStatus: `${status} ${statusText}`,
			isError: (response.statusCode >= 400),
			isPending: false
		} as IPayload;
	}
}
