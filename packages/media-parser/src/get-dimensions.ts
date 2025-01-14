import {getTracks} from './get-tracks';
import type {Structure} from './parse-result';
import type {ParserState} from './state/parser-state';

export type Dimensions = {
	width: number;
	height: number;
};

export type ExpandedDimensions = Dimensions & {
	rotation: number;
	unrotatedWidth: number;
	unrotatedHeight: number;
};

export const getDimensions = (
	boxes: Structure,
	state: ParserState,
): ExpandedDimensions => {
	const {videoTracks} = getTracks(boxes, state);
	if (!videoTracks.length) {
		throw new Error('Expected video track');
	}

	const firstVideoTrack = videoTracks[0];

	return {
		width: firstVideoTrack.width,
		height: firstVideoTrack.height,
		rotation: firstVideoTrack.rotation,
		unrotatedHeight: firstVideoTrack.displayAspectHeight,
		unrotatedWidth: firstVideoTrack.displayAspectWidth,
	};
};

// TODO: An audio track should return 'hasDimensions' = true on an audio file
// and stop parsing
export const hasDimensions = (
	boxes: Structure,
	state: ParserState,
): boolean => {
	try {
		return getDimensions(boxes, state) !== null;
	} catch {
		return false;
	}
};
