import type {AudioCodec, LogLevel} from '@remotion/renderer';

import fs from 'fs';
import {cleanupProps} from './cleanup-props';
import {concatVideos} from './concat-videos';
import type {
	CustomCredentials,
	DownloadBehavior,
	PostRenderData,
	Privacy,
	SerializedInputProps,
	ServerlessCodec,
} from './constants';
import {createPostRenderData} from './create-post-render-data';
import {inspectErrors} from './inspect-error';
import type {OverallProgressHelper} from './overall-render-progress';
import type {
	InsideFunctionSpecifics,
	ProviderSpecifics,
} from './provider-implementation';
import type {RenderMetadata} from './render-metadata';
import type {CloudProvider} from './types';

export const mergeChunksAndFinishRender = async <
	Provider extends CloudProvider,
>(options: {
	bucketName: string;
	renderId: string;
	expectedBucketOwner: string;
	numberOfFrames: number;
	codec: ServerlessCodec;
	chunkCount: number;
	fps: number;
	numberOfGifLoops: number | null;
	audioCodec: AudioCodec | null;
	renderBucketName: string;
	customCredentials: CustomCredentials<Provider> | null;
	downloadBehavior: DownloadBehavior;
	key: string;
	privacy: Privacy;
	inputProps: SerializedInputProps;
	serializedResolvedProps: SerializedInputProps;
	renderMetadata: RenderMetadata<Provider>;
	audioBitrate: string | null;
	logLevel: LogLevel;
	framesPerLambda: number;
	binariesDirectory: string | null;
	preferLossless: boolean;
	compositionStart: number;
	outdir: string;
	files: string[];
	overallProgress: OverallProgressHelper<Provider>;
	startTime: number;
	providerSpecifics: ProviderSpecifics<Provider>;
	insideFunctionSpecifics: InsideFunctionSpecifics;
	forcePathStyle: boolean;
}): Promise<PostRenderData<Provider>> => {
	const onProgress = (framesEncoded: number) => {
		options.overallProgress.setCombinedFrames(framesEncoded);
	};

	const encodingStart = Date.now();
	if (options.renderMetadata.type === 'still') {
		throw new Error('Cannot merge stills');
	}

	if (options.files.length === 0) {
		throw new Error('No files to merge');
	}

	const {outfile, cleanupChunksProm} = await concatVideos({
		onProgress,
		numberOfFrames: options.numberOfFrames,
		codec: options.codec,
		fps: options.fps,
		numberOfGifLoops: options.numberOfGifLoops,
		files: options.files,
		outdir: options.outdir,
		audioCodec: options.audioCodec,
		audioBitrate: options.audioBitrate,
		logLevel: options.logLevel,
		framesPerLambda: options.framesPerLambda,
		binariesDirectory: options.binariesDirectory,
		cancelSignal: undefined,
		preferLossless: options.preferLossless,
		muted: options.renderMetadata.muted,
		metadata: options.renderMetadata.metadata,
		insideFunctionSpecifics: options.insideFunctionSpecifics,
	});
	const encodingStop = Date.now();
	options.overallProgress.setTimeToCombine(encodingStop - encodingStart);

	const outputSize = fs.statSync(outfile).size;

	const writeToBucket = options.insideFunctionSpecifics.timer(
		`Writing to bucket (${outputSize} bytes)`,
		options.logLevel,
	);

	await options.providerSpecifics.writeFile({
		bucketName: options.renderBucketName,
		key: options.key,
		body: fs.createReadStream(outfile),
		region: options.providerSpecifics.getCurrentRegionInFunction(),
		privacy: options.privacy,
		expectedBucketOwner: options.expectedBucketOwner,
		downloadBehavior: options.downloadBehavior,
		customCredentials: options.customCredentials,
		forcePathStyle: options.forcePathStyle,
	});

	writeToBucket.end();

	const errorExplanations = inspectErrors({
		errors: options.overallProgress.get().errors,
	});

	const cleanupProm = cleanupProps({
		inputProps: options.inputProps,
		serializedResolvedProps: options.serializedResolvedProps,
		providerSpecifics: options.providerSpecifics,
		forcePathStyle: options.forcePathStyle,
	});

	const {url: outputUrl} = options.providerSpecifics.getOutputUrl({
		bucketName: options.renderBucketName,
		currentRegion: options.providerSpecifics.getCurrentRegionInFunction(),
		customCredentials: options.customCredentials,
		renderMetadata: options.renderMetadata,
	});

	const postRenderData = createPostRenderData({
		region: options.providerSpecifics.getCurrentRegionInFunction(),
		memorySizeInMb: options.insideFunctionSpecifics.getCurrentMemorySizeInMb(),
		renderMetadata: options.renderMetadata,
		errorExplanations,
		timeToDelete: (await cleanupProm).reduce((a, b) => Math.max(a, b), 0),
		outputFile: {
			url: outputUrl,
		},
		outputSize,
		timeToCombine: encodingStop - encodingStart,
		overallProgress: options.overallProgress.get(),
		timeToFinish: Date.now() - options.startTime,
		providerSpecifics: options.providerSpecifics,
	});

	options.overallProgress.setPostRenderData(postRenderData);

	await Promise.all([cleanupChunksProm, fs.promises.rm(outfile)]);
	return postRenderData;
};
