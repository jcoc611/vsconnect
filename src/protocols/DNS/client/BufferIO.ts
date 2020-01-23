// Only these numbers supported for now, for simplicity
type BufferNumberSizes = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 16 | 32;

/**
 * @class BufferIO
 * Allows for arbitrary reading bits from a buffer, with a few limitations. Does not allow reading
 * data types on bit offsets that are not aligned with octets, except for data types smaller than
 * an octet. All these unaligned reads must fall in a single octet. For example, reading a 4-bit
 * integer is allowed on any offset that falls within the same 8-bit octet in the Buffer. Also,
 * reading a 16-bit integer is only allowed on two consecutive aligned octets (so reading a int16
 * from, say, offset 4 is not allowed).
 */
export class BufferIO {
	private buffer: Buffer;

	/** @var offset current buffer position, in bits */
	private offset: number;

	constructor(b: Buffer) {
		this.buffer = b;
		this.offset = 0;
	}

	seek(offset: number) {
		this.offset = offset;
	}

	getOffsetBits(): number {
		return this.offset;
	}

	readUInt(size: BufferNumberSizes): number {
		let result = 0;
		let offsetBytes = ~~(this.offset / 8);
		let offsetUnaligned = (this.offset % 8);
		let isAligned: boolean = (offsetUnaligned == 0);

		if (size == 32 && isAligned) {
			result = this.buffer.readUInt32BE(offsetBytes);
		} else if (size == 16 && isAligned) {
			result = this.buffer.readUInt16BE(offsetBytes);
		} else if (size == 8 && isAligned) {
			result = this.buffer.readUInt8(offsetBytes);
		} else if (size < 8) {
			if (size + offsetUnaligned > 8) {
				throw new Error(`Unaligned buffer access on size ${size} and offset ${offsetUnaligned}`);
			}
			// EXAMPLE
			// offset   1
			// read     1
			// buffer   0  1  0  0  0  0  0  0
			// offsetBytes = 0

			// result =  0  1  0  0  0  0  0  0
			result = this.buffer.readUInt8(offsetBytes);

			// although result has int8, it likely is int32 in JVM, need to cap it to 8
			// result =  1  0  0  0  0  0  0  0
			result = (result << offsetUnaligned) & 0b11111111;

			// result =  0  0  0  0  0  0  0  1
			result = result >> (8 - size);
		} else {
			throw new Error(`Unaligned buffer access on size ${size}`);
		}

		this.offset += size;

		return result;
	}

	writeUInt(n: number, size: BufferNumberSizes): this {
		let offsetBytes = ~~(this.offset / 8);
		let offsetUnaligned = (this.offset % 8);
		let isAligned: boolean = (offsetUnaligned == 0);

		if (size == 32 && isAligned) {
			this.buffer.writeUInt32BE(n, offsetBytes);
		} else if (size == 16 && isAligned) {
			this.buffer.writeUInt16BE(n, offsetBytes);
		} else if (size == 8 && isAligned) {
			this.buffer.writeUInt8(n, offsetBytes);
		} else if (size < 8) {
			if (size + offsetUnaligned > 8) {
				throw new Error(`Unaligned buffer access on size ${size} and offset ${offsetUnaligned}`);
			}

			if (n >= (1 << size)) {
				throw new Error(`writeUInt: number ${n} not in range 0-${(1 << size)}`);
			}

			// EXAMPLE
			// offset   1
			// size     2
			// n        0  0  0  0  0  0  1  1
			// buffer   X  0  0  0  0  0  0  0
			// new      X  1  1  0  0  0  0  0

			// offsetBytes = 0
			let current = this.buffer.readUInt8(offsetBytes);
			current = current | ( n << (8 - size - offsetUnaligned) );

			this.buffer.writeUInt8(current, offsetBytes);
		} else {
			throw new Error(`Unaligned buffer access on size ${size}`);
		}

		this.offset += size;

		return this;
	}
}