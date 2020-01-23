'use strict'

import { IMessage } from "../interfaces";

export default abstract class Transport {
	protected resolverAddress: string;

	constructor(resolverAddress: string) {
		this.resolverAddress = resolverAddress;
	}

	public abstract send(msgData: IMessage): Promise<IMessage>;
}
