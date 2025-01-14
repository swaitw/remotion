import {RenderInternals, getVideoMetadata} from '@remotion/renderer';
import {rendersPrefix} from '@remotion/serverless/client';
import {afterAll, expect, test} from 'bun:test';
import {createWriteStream, unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'path';
import {internalDeleteRender} from '../../../api/delete-render';
import {mockImplementation} from '../../mock-implementation';
import {simulateLambdaRender} from '../simulate-lambda-render';

afterAll(async () => {
	await RenderInternals.killAllBrowsers();
});

test('Should make muted render audio', async () => {
	const {close, file, progress, renderId} = await simulateLambdaRender({
		codec: 'h264',
		composition: 'framer',
		frameRange: [100, 110],
		imageFormat: 'jpeg',
		logLevel: 'error',
		region: 'eu-central-1',
		inputProps: {},
		muted: true,
	});

	const tmpfile = path.join(tmpdir(), 'out.mp4');

	await new Promise<void>((resolve) => {
		file.pipe(createWriteStream(tmpfile)).on('close', () => resolve());
	});

	// Make sure Faststart is supported
	const {supportsSeeking} = await getVideoMetadata(tmpfile);
	expect(supportsSeeking).toBe(true);

	const out = await RenderInternals.callFf({
		bin: 'ffprobe',
		args: [tmpfile],
		indent: false,
		binariesDirectory: null,
		cancelSignal: undefined,
		logLevel: 'error',
	});

	expect(out.stdout).not.toContain('Audio');

	unlinkSync(tmpfile);

	const files = await mockImplementation.listObjects({
		bucketName: progress.outBucket as string,
		region: 'eu-central-1',
		expectedBucketOwner: 'abc',
		prefix: rendersPrefix(renderId),
		forcePathStyle: false,
	});

	expect(files.length).toBe(2);

	await internalDeleteRender({
		bucketName: progress.outBucket as string,
		region: 'eu-central-1',
		renderId,
		providerSpecifics: mockImplementation,
		forcePathStyle: false,
	});

	const expectFiles = await mockImplementation.listObjects({
		bucketName: progress.outBucket as string,
		region: 'eu-central-1',
		expectedBucketOwner: 'abc',
		prefix: rendersPrefix(renderId),
		forcePathStyle: false,
	});

	expect(expectFiles.length).toBe(0);

	await close();
});
