import { IServiceMetadata } from "../../interfaces";

export class WebViewService {
	webServiceData: IServiceMetadata;
	doRequest: ( serviceId: number, action: string, params: any[] ) => Promise<any>;

	constructor(
		webServiceData: IServiceMetadata,
		doRequest: ( serviceId: number, action: string, params: any[] ) => Promise<any>
	) {
		this.webServiceData = webServiceData;
		this.doRequest = doRequest;
	}

	async execute( method : string, params : any[] ) : Promise<any> {
		return await this.doRequest( this.webServiceData.serviceId, method, params )
	}
}
