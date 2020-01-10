export enum BinaryType {
	bit,
	uint3,
	uint4,
	uint8,
	uint16,

	characterString,
	domainName,
}

export type BinaryDefinition = [string, BinaryType];

export class BinaryFormat<T> {
	private typeMap: { [key in keyof T]: BinaryType };
	constructor(typeMap: { [key in keyof T]: BinaryType }) {
		this.typeMap = typeMap;
	}
}

/*
IHeader {
	id: number;
	//...
}

const BHeader = BinaryFormat<IHeader>({ id: BinaryType.uint16, ...})

let header: IHeader = BHeader.fromBuffer(buff);
header.id
let buff = BHeader.toBuffer(header);
*/