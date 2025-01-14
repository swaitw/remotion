/* eslint-disable @typescript-eslint/no-use-before-define */
import {
	knownIdsWithOneLength,
	knownIdsWithThreeLength,
	knownIdsWithTwoLength,
} from './boxes/webm/segments/all-segments';
import {detectFileType} from './file-types';

export class OffsetCounter {
	#offset: number;
	#discardedBytes: number;
	constructor(initial: number) {
		this.#offset = initial;
		this.#discardedBytes = 0;
	}

	increment(amount: number) {
		if (amount < 0) {
			throw new Error('Cannot increment by a negative amount: ' + amount);
		}

		this.#offset += amount;
	}

	getOffset(): number {
		return this.#offset;
	}

	getDiscardedOffset(): number {
		return this.#offset - this.#discardedBytes;
	}

	setDiscardedOffset(offset: number) {
		this.#discardedBytes = offset;
	}

	getDiscardedBytes() {
		return this.#discardedBytes;
	}

	discardBytes(amount: number) {
		this.#discardedBytes += amount;
	}

	decrement(amount: number) {
		if (amount < 0) {
			throw new Error('Cannot decrement by a negative amount');
		}

		this.#offset -= amount;
	}
}

const makeOffsetCounter = (): OffsetCounter => {
	return new OffsetCounter(0);
};

export const getArrayBufferIterator = (
	initialData: Uint8Array,
	maxBytes: number | null,
) => {
	const buf = new ArrayBuffer(initialData.byteLength, {
		maxByteLength:
			maxBytes === null
				? initialData.byteLength
				: Math.min(maxBytes as number, 2 ** 32),
	});
	if (!buf.resize) {
		throw new Error(
			'`ArrayBuffer.resize` is not supported in this Runtime. On the server: Use at least Node.js 20 or Bun. In the browser: Chrome 111, Edge 111, Safari 16.4, Firefox 128, Opera 111',
		);
	}

	let data = new Uint8Array(buf);

	data.set(initialData);

	let view = new DataView(data.buffer);
	const counter = makeOffsetCounter();
	let discardAllowed = true;

	const getSlice = (amount: number) => {
		const value = data.slice(
			counter.getDiscardedOffset(),
			counter.getDiscardedOffset() + amount,
		);
		counter.increment(amount);

		return value;
	};

	const disallowDiscard = () => {
		discardAllowed = false;
	};

	const allowDiscard = () => {
		discardAllowed = true;
	};

	const discard = (length: number) => {
		counter.increment(length);
	};

	const readUntilNullTerminator = () => {
		const bytes = [];
		let byte;
		while ((byte = getUint8()) !== 0) {
			bytes.push(byte);
		}

		counter.decrement(1);

		return new TextDecoder().decode(new Uint8Array(bytes));
	};

	const getUint8 = () => {
		const val = view.getUint8(counter.getDiscardedOffset());
		counter.increment(1);

		return val;
	};

	const getEightByteNumber = (littleEndian = false) => {
		if (littleEndian) {
			const one = getUint8();
			const two = getUint8();
			const three = getUint8();
			const four = getUint8();
			const five = getUint8();
			const six = getUint8();
			const seven = getUint8();
			const eight = getUint8();

			return (
				(eight << 56) |
				(seven << 48) |
				(six << 40) |
				(five << 32) |
				(four << 24) |
				(three << 16) |
				(two << 8) |
				one
			);
		}

		function byteArrayToBigInt(byteArray: number[]): BigInt {
			let result = BigInt(0);
			for (let i = 0; i < byteArray.length; i++) {
				result = (result << BigInt(8)) + BigInt(byteArray[i]);
			}

			return result;
		}

		const bigInt = byteArrayToBigInt([
			getUint8(),
			getUint8(),
			getUint8(),
			getUint8(),
			getUint8(),
			getUint8(),
			getUint8(),
			getUint8(),
		]);

		return Number(bigInt);
	};

	const getFourByteNumber = () => {
		return (
			(getUint8() << 24) | (getUint8() << 16) | (getUint8() << 8) | getUint8()
		);
	};

	const getPaddedFourByteNumber = () => {
		let lastInt = 128;
		while (((lastInt = getUint8()), lastInt === 128)) {
			// Do nothing
		}

		return lastInt;
	};

	const getUint32 = () => {
		const val = view.getUint32(counter.getDiscardedOffset());
		counter.increment(4);
		return val;
	};

	const getUint64 = (littleEndian = false) => {
		const val = view.getBigUint64(counter.getDiscardedOffset(), littleEndian);
		counter.increment(8);
		return val;
	};

	const getInt64 = (littleEndian = false) => {
		const val = view.getBigInt64(counter.getDiscardedOffset(), littleEndian);
		counter.increment(8);
		return val;
	};

	const startBox = (size: number) => {
		const startOffset = counter.getOffset();

		return {
			discardRest: () => discard(size - (counter.getOffset() - startOffset)),
			expectNoMoreBytes: () => {
				const remaining = size - (counter.getOffset() - startOffset);
				if (remaining !== 0) {
					throw new Error('expected 0 bytes, got ' + remaining);
				}
			},
		};
	};

	const getUint32Le = () => {
		const val = view.getUint32(counter.getDiscardedOffset(), true);
		counter.increment(4);
		return val;
	};

	const getInt32Le = () => {
		const val = view.getInt32(counter.getDiscardedOffset(), true);
		counter.increment(4);
		return val;
	};

	const getInt32 = () => {
		const val = view.getInt32(counter.getDiscardedOffset());
		counter.increment(4);
		return val;
	};

	const addData = (newData: Uint8Array) => {
		const oldLength = buf.byteLength;
		const newLength = oldLength + newData.byteLength;
		buf.resize(newLength);
		const newArray = new Uint8Array(buf);
		newArray.set(newData, oldLength);
		data = newArray;
		view = new DataView(data.buffer);
	};

	const byteLength = () => {
		return data.byteLength;
	};

	const bytesRemaining = () => {
		return data.byteLength - counter.getDiscardedOffset();
	};

	const removeBytesRead = () => {
		if (!discardAllowed) {
			return;
		}

		const bytesToRemove = counter.getDiscardedOffset();

		// Only do this operation if it is really worth it 😇
		if (bytesToRemove < 100_000) {
			return;
		}

		counter.discardBytes(bytesToRemove);
		const newData = data.slice(bytesToRemove);
		data.set(newData);
		buf.resize(newData.byteLength);
		view = new DataView(data.buffer);
	};

	const skipTo = (offset: number, reset: boolean) => {
		const becomesSmaller = offset < counter.getOffset();
		if (becomesSmaller) {
			if (reset) {
				buf.resize(0);
				counter.decrement(counter.getOffset() - offset);
				counter.setDiscardedOffset(offset);
			} else {
				const toDecrement = counter.getOffset() - offset;
				const newOffset = counter.getOffset() - toDecrement;
				counter.decrement(toDecrement);
				const c = counter.getDiscardedBytes();
				if (c > newOffset) {
					throw new Error('already discarded too many bytes');
				}
			}
		} else {
			const currentOffset = counter.getOffset();
			counter.increment(offset - currentOffset);
			removeBytesRead();
		}
	};

	const readExpGolomb = () => {
		if (!bitReadingMode) {
			throw new Error('Not in bit reading mode');
		}

		let zerosCount = 0;

		// Step 1: Count the number of leading zeros
		while (getBits(1) === 0) {
			zerosCount++;
		}

		// Step 2: Read the suffix
		let suffix = 0;
		for (let i = 0; i < zerosCount; i++) {
			suffix = (suffix << 1) | getBits(1);
		}

		// Step 3: Calculate the value
		return (1 << zerosCount) - 1 + suffix;
	};

	const peekB = (length: number) => {
		// eslint-disable-next-line no-console
		console.log(
			[...getSlice(length)].map((b) => b.toString(16).padStart(2, '0')),
		);
		counter.decrement(length);
	};

	const peekD = (length: number) => {
		// eslint-disable-next-line no-console
		console.log([...getSlice(length)].map((b) => b));
		counter.decrement(length);
	};

	const leb128 = () => {
		let result = 0;
		let shift = 0;
		let byte;

		do {
			byte = getBits(8);
			result |= (byte & 0x7f) << shift;
			shift += 7;
		} while (byte >= 0x80); // Continue if the high bit is set

		return result;
	};

	let bitIndex = 0;

	const stopReadingBits = () => {
		bitIndex = 0;
		bitReadingMode = false;
	};

	let byteToShift = 0;
	let bitReadingMode = false;

	const startReadingBits = () => {
		bitReadingMode = true;
		byteToShift = getUint8();
	};

	const getBits = (bits: number) => {
		let result = 0;
		let bitsCollected = 0;

		while (bitsCollected < bits) {
			if (bitIndex >= 8) {
				bitIndex = 0;
				byteToShift = getUint8();
			}

			const remainingBitsInByte = 8 - bitIndex;
			const bitsToReadNow = Math.min(bits - bitsCollected, remainingBitsInByte);
			const mask = (1 << bitsToReadNow) - 1;
			const shift = remainingBitsInByte - bitsToReadNow;

			result <<= bitsToReadNow;
			result |= (byteToShift >> shift) & mask;

			bitsCollected += bitsToReadNow;
			bitIndex += bitsToReadNow;
		}

		return result;
	};

	const destroy = () => {
		data = new Uint8Array(0);
		buf.resize(0);
	};

	return {
		startReadingBits,
		stopReadingBits,
		skipTo,
		addData,
		counter,
		peekB,
		peekD,
		getBits,
		byteLength,
		bytesRemaining,
		leb128,
		removeBytesRead,
		discard,
		getEightByteNumber,
		getFourByteNumber,
		getSlice,
		getAtom: () => {
			const atom = getSlice(4);
			return new TextDecoder().decode(atom);
		},
		detectFileType: () => {
			return detectFileType(data);
		},
		getPaddedFourByteNumber,
		getMatroskaSegmentId: (): string | null => {
			if (bytesRemaining() === 0) {
				return null;
			}

			const first = getSlice(1);
			const firstOneString = `0x${Array.from(new Uint8Array(first))
				.map((b) => {
					return b.toString(16).padStart(2, '0');
				})
				.join('')}`;

			// Catch void block
			// https://www.matroska.org/technical/elements.html

			if (knownIdsWithOneLength.includes(firstOneString)) {
				return firstOneString;
			}

			if (bytesRemaining() === 0) {
				return null;
			}

			const firstTwo = getSlice(1);

			const firstTwoString = `${firstOneString}${Array.from(
				new Uint8Array(firstTwo),
			)
				.map((b) => {
					return b.toString(16).padStart(2, '0');
				})
				.join('')}`;

			if (knownIdsWithTwoLength.includes(firstTwoString)) {
				return firstTwoString;
			}

			if (bytesRemaining() === 0) {
				return null;
			}

			const firstThree = getSlice(1);

			const firstThreeString = `${firstTwoString}${Array.from(
				new Uint8Array(firstThree),
			)
				.map((b) => {
					return b.toString(16).padStart(2, '0');
				})
				.join('')}`;

			if (knownIdsWithThreeLength.includes(firstThreeString)) {
				return firstThreeString;
			}

			if (bytesRemaining() === 0) {
				return null;
			}

			const segmentId = getSlice(1);

			return `${firstThreeString}${Array.from(new Uint8Array(segmentId))
				.map((b) => {
					return b.toString(16).padStart(2, '0');
				})
				.join('')}`;
		},
		getVint: (): number | null => {
			if (bytesRemaining() === 0) {
				return null;
			}

			const firstByte = getUint8();
			const totalLength = firstByte;

			if (totalLength === 0) {
				return 0;
			}

			// Calculate the actual length of the data based on the first set bit
			let actualLength = 0;
			while (((totalLength >> (7 - actualLength)) & 0x01) === 0) {
				actualLength++;
			}

			if (bytesRemaining() < actualLength) {
				return null;
			}

			const slice = getSlice(actualLength);
			const d = [firstByte, ...Array.from(new Uint8Array(slice))];

			actualLength += 1; // Include the first byte set as 1
			// Combine the numbers to form the integer value
			let value = 0;

			// Mask the first byte properly then start combining
			value = totalLength & (0xff >> actualLength);
			for (let i = 1; i < actualLength; i++) {
				value = (value << 8) | d[i];
			}

			// Livestreamed segments sometimes have a Cluster length of 0xFFFFFFFFFFFFFF
			// which we parse as -1
			// this should be treated as Infinity
			if (value === -1) {
				return Infinity;
			}

			return value;
		},
		getUint8,
		getEBML: () => {
			const val = getUint8();

			// https://darkcoding.net/software/reading-mediarecorders-webm-opus-output/#:~:text=The%20first%20four%20bytes%20(%201A,%E2%80%93%20read%20on%20for%20why).
			// You drop the initial 0 bits and the first 1 bit to get the value. 0x81 is 0b10000001, so there are zero inital 0 bits, meaning length one byte, and the value is 1. The 0x9F value for length of the EBML header we saw earlier is 0b10011111, still one byte, value is 0b0011111, which is 31 (the python repl is very helpful for these conversions).
			const actualValue = val & 0x7f; // 0x7F is binary 01111111, which masks out the first bit

			return actualValue;
		},
		getInt8: () => {
			const val = view.getInt8(counter.getDiscardedOffset());
			counter.increment(1);
			return val;
		},
		getUint16: () => {
			const val = view.getUint16(counter.getDiscardedOffset());
			counter.increment(2);
			return val;
		},
		getUint16Le: () => {
			const val = view.getUint16(counter.getDiscardedOffset(), true);
			counter.increment(2);
			return val;
		},
		getUint24: () => {
			const val1 = view.getUint8(counter.getDiscardedOffset());
			const val2 = view.getUint8(counter.getDiscardedOffset() + 1);
			const val3 = view.getUint8(counter.getDiscardedOffset() + 2);
			counter.increment(3);
			return (val1 << 16) | (val2 << 8) | val3;
		},
		getInt24: () => {
			const val1 = view.getInt8(counter.getDiscardedOffset());
			const val2 = view.getUint8(counter.getDiscardedOffset() + 1);
			const val3 = view.getUint8(counter.getDiscardedOffset() + 2);
			counter.increment(3);
			return (val1 << 16) | (val2 << 8) | val3;
		},
		getInt16: () => {
			const val = view.getInt16(counter.getDiscardedOffset());
			counter.increment(2);
			return val;
		},
		getUint32,
		getUint64,
		getInt64,
		// https://developer.apple.com/documentation/quicktime-file-format/sound_sample_description_version_1
		// A 32-bit unsigned fixed-point number (16.16) that indicates the rate at which the sound samples were obtained.
		getFixedPointUnsigned1616Number: () => {
			const val = getUint32();
			return val / 2 ** 16;
		},
		getFixedPointSigned1616Number: () => {
			const val = getInt32();
			return val / 2 ** 16;
		},
		getFixedPointSigned230Number: () => {
			const val = getInt32();
			return val / 2 ** 30;
		},
		getPascalString: () => {
			const val = getSlice(32);
			return [...Array.from(new Uint8Array(val))];
		},
		getUint(length: number): number {
			const bytes = getSlice(length);
			const numbers = [...Array.from(new Uint8Array(bytes))];
			return numbers.reduce(
				(acc, byte, index) =>
					acc + (byte << (8 * (numbers.length - index - 1))),
				0,
			);
		},
		getByteString(length: number, trimTrailingZeroes: boolean): string {
			let bytes = getSlice(length);
			// This file has trailing zeroes throughout
			// https://github.com/remotion-dev/remotion/issues/4668#issuecomment-2561904068
			// eslint-disable-next-line no-unmodified-loop-condition
			while (trimTrailingZeroes && bytes[bytes.length - 1] === 0) {
				bytes = bytes.slice(0, -1);
			}

			return new TextDecoder().decode(bytes).trim();
		},
		getFloat64: () => {
			const val = view.getFloat64(counter.getDiscardedOffset());
			counter.increment(8);
			return val;
		},
		readUntilNullTerminator,
		getFloat32: () => {
			const val = view.getFloat32(counter.getDiscardedOffset());
			counter.increment(4);
			return val;
		},
		getUint32Le,
		getInt32Le,
		getInt32,
		destroy,
		disallowDiscard,
		allowDiscard,
		startBox,
		readExpGolomb,
	};
};

export type BufferIterator = ReturnType<typeof getArrayBufferIterator>;
