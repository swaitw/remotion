import type {BufferIterator} from '../../read-and-increment-offset';
import type {MainSegment} from './segments/main';
import {parseMainSegment} from './segments/main';
import {parseSeekSegment, type SeekSegment} from './segments/seek';
import type {SeekHeadSegment} from './segments/seek-head';
import {parseSeekHeadSegment} from './segments/seek-head';
import {
	parseSeekPositionSegment,
	type SeekPositionSegment,
} from './segments/seek-position';
import type {UnknownSegment} from './segments/unknown';
import {parseUnknownSegment} from './segments/unknown';

export type MatroskaSegment =
	| MainSegment
	| UnknownSegment
	| SeekHeadSegment
	| SeekSegment
	| SeekPositionSegment;

export const expectSegment = (iterator: BufferIterator) => {
	const segmentId = iterator.getMatroskaSegmentId();

	if (segmentId === '0x18538067') {
		iterator.getVint(8);
		return parseMainSegment(iterator);
	}

	if (segmentId === '0x114d9b74') {
		const len = iterator.getVint(1);
		return parseSeekHeadSegment(iterator, len);
	}

	if (segmentId === '0x4dbb') {
		return parseSeekSegment(iterator);
	}

	if (segmentId === '0x53ac') {
		return parseSeekPositionSegment(iterator);
	}

	return parseUnknownSegment(iterator, segmentId, iterator.getVint(8));
};
