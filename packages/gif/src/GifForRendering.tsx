/* eslint-disable no-console */
import {forwardRef, useEffect, useRef, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import {Canvas} from './canvas';
import {volatileGifCache} from './gif-cache';
import {isCorsError} from './is-cors-error';
import type {GifState, RemotionGifProps} from './props';
import {parseGif} from './react-tools';
import {resolveGifSource} from './resolve-gif-source';
import {useCurrentGifIndex} from './useCurrentGifIndex';

export const GifForRendering = forwardRef<HTMLCanvasElement, RemotionGifProps>(
	(
		{
			src,
			width,
			height,
			onLoad,
			onError,
			loopBehavior = 'loop',
			playbackRate = 1,
			fit = 'fill',
			...props
		},
		ref,
	) => {
		const resolvedSrc = resolveGifSource(src);
		const [state, update] = useState<GifState>(() => {
			const parsedGif = volatileGifCache.get(resolvedSrc);

			if (parsedGif === undefined) {
				return {
					delays: [],
					frames: [],
					width: 0,
					height: 0,
				};
			}

			return parsedGif as GifState;
		});
		const [error, setError] = useState<Error | null>(null);

		const [id] = useState(() =>
			delayRender(`Rendering <Gif/> with src="${resolvedSrc}"`),
		);

		useEffect(() => {
			return () => {
				continueRender(id);
			};
		}, [id]);

		const index = useCurrentGifIndex({
			delays: state.delays,
			loopBehavior,
			playbackRate,
		});
		const currentOnLoad = useRef(onLoad);
		const currentOnError = useRef(onError);
		currentOnLoad.current = onLoad;
		currentOnError.current = onError;

		useEffect(() => {
			const controller = new AbortController();
			let done = false;
			let aborted = false;
			const newHandle = delayRender('Loading <Gif /> with src=' + resolvedSrc);

			parseGif({controller, src: resolvedSrc})
				.then((parsed) => {
					currentOnLoad.current?.(parsed);
					update(parsed);
					volatileGifCache.set(resolvedSrc, parsed);
					done = true;
					continueRender(newHandle);
					continueRender(id);
				})
				.catch((err) => {
					if (aborted) {
						continueRender(newHandle);
						return;
					}

					if (currentOnError.current) {
						currentOnError.current(err);
					} else {
						setError(err);
					}
				});

			return () => {
				if (!done) {
					aborted = true;
					controller.abort();
				}

				continueRender(newHandle);
			};
		}, [id, resolvedSrc]);

		if (error) {
			console.error(error.stack);
			if (isCorsError(error)) {
				throw new Error(
					`Failed to render GIF with source ${src}: "${error.message}". You must enable CORS for this URL.`,
				);
			}

			throw new Error(
				`Failed to render GIF with source ${src}: "${error.message}". Render with --log=verbose to see the full stack.`,
			);
		}

		if (index === -1) {
			return null;
		}

		return (
			<Canvas
				fit={fit}
				index={index}
				frames={state.frames}
				width={width}
				height={height}
				{...props}
				ref={ref}
			/>
		);
	},
);
