import {getRemotionEnvironment} from 'remotion';
import {manuallyManagedGifCache, volatileGifCache} from './gif-cache';
import type {GifState} from './props';
import {parseGif, parseWithWorker} from './react-tools';

const calcDuration = (parsed: GifState) => {
	return (
		parsed.delays.reduce((sum: number, delay: number) => sum + delay, 0) / 1000
	);
};

/*
 * @description Gets the duration in seconds of a GIF.
 * @see [Documentation](https://remotion.dev/docs/gif/get-gif-duration-in-seconds)
 */
export const getGifDurationInSeconds = async (src: string) => {
	const resolvedSrc = new URL(src, window.origin).href;
	const inCache =
		volatileGifCache.get(resolvedSrc) ??
		manuallyManagedGifCache.get(resolvedSrc);
	if (inCache) {
		return calcDuration(inCache);
	}

	if (getRemotionEnvironment().isRendering) {
		const renderingParsed = parseWithWorker(resolvedSrc);
		const resolved = await renderingParsed.prom;
		volatileGifCache.set(resolvedSrc, resolved);
		return calcDuration(resolved);
	}

	const parsed = await parseGif({
		src: resolvedSrc,
		controller: new AbortController(),
	});
	volatileGifCache.set(resolvedSrc, parsed);

	return calcDuration(parsed);
};
