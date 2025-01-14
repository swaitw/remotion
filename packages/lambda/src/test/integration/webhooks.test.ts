import {RenderInternals, ensureBrowser} from '@remotion/renderer';
import {ServerlessRoutines} from '@remotion/serverless/client';
import {beforeAll, beforeEach, describe, expect, mock, test} from 'bun:test';
import path from 'path';
import {VERSION} from 'remotion/version';
import {mockableHttpClients} from '../../functions/http-client';
import {mockImplementation} from '../mock-implementation';

const originalFetch = mockableHttpClients.http;
beforeEach(() => {
	// @ts-expect-error
	mockableHttpClients.http = mock(
		(
			_url: string,
			_options: unknown,
			cb: (a: {statusCode: number}) => void,
		) => {
			cb({
				statusCode: 201,
			});
			return {
				on: () => undefined,
				end: () => undefined,
			};
		},
	);
	return () => {
		mockableHttpClients.http = originalFetch;
	};
});

beforeAll(async () => {
	await ensureBrowser();
	return async () => {
		await RenderInternals.killAllBrowsers();
	};
});

const TEST_URL = 'http://localhost:8000';

describe('Webhooks', () => {
	test('Should call webhook upon completion', async () => {
		process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE = '2048';
		process.env.AWS_LAMBDA_FUNCTION_NAME = 'remotion-dev-lambda';

		const exampleBuild = path.join(process.cwd(), '..', 'example', 'build');

		const {port, close} = await RenderInternals.serveStatic(exampleBuild, {
			binariesDirectory: null,
			concurrency: 1,
			downloadMap: RenderInternals.makeDownloadMap(),
			indent: false,
			logLevel: 'error',
			offthreadVideoCacheSizeInBytes: null,
			port: null,
			remotionRoot: path.dirname(exampleBuild),
			forceIPv4: false,
		});

		const res = await mockImplementation.callFunctionSync({
			type: ServerlessRoutines.start,
			payload: {
				type: ServerlessRoutines.start,
				serveUrl: `http://localhost:${port}`,
				chromiumOptions: {},
				codec: 'h264',
				composition: 'react-svg',
				crf: 9,
				envVariables: {},
				frameRange: [0, 2],
				framesPerLambda: 8,
				imageFormat: 'png',
				inputProps: {
					type: 'payload',
					payload: '{}',
				},
				logLevel: 'warn',
				maxRetries: 3,
				outName: 'out.mp4',
				pixelFormat: 'yuv420p',
				privacy: 'public',
				proResProfile: undefined,
				x264Preset: null,
				jpegQuality: undefined,
				scale: 1,
				timeoutInMilliseconds: 40000,
				numberOfGifLoops: null,
				everyNthFrame: 1,
				concurrencyPerLambda: 1,
				downloadBehavior: {
					type: 'play-in-browser',
				},
				muted: false,
				version: VERSION,
				overwrite: true,
				webhook: {
					url: TEST_URL,
					secret: 'TEST_SECRET',
					customData: {
						customID: 123,
					},
				},
				audioBitrate: null,
				videoBitrate: null,
				encodingBufferSize: null,
				encodingMaxRate: null,
				forceHeight: null,
				forceWidth: null,
				rendererFunctionName: null,
				bucketName: null,
				audioCodec: null,
				offthreadVideoCacheSizeInBytes: null,
				deleteAfter: null,
				colorSpace: null,
				preferLossless: false,
				forcePathStyle: false,
				metadata: {Author: 'Lunar'},
			},
			functionName: 'remotion-dev-lambda',
			region: 'us-east-1',
			timeoutInTest: 120000,
		});
		const parsed = res;

		await mockImplementation.callFunctionSync({
			type: ServerlessRoutines.status,
			payload: {
				type: ServerlessRoutines.status,
				bucketName: parsed.bucketName,
				renderId: parsed.renderId,
				version: VERSION,
				logLevel: 'info',
				forcePathStyle: false,
				s3OutputProvider: null,
			},
			functionName: 'remotion-dev-lambda',
			region: 'us-east-1',
			timeoutInTest: 120000,
		});

		expect(mockableHttpClients.http).toHaveBeenCalledTimes(1);
		expect(mockableHttpClients.http).toHaveBeenCalledWith(
			TEST_URL,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Remotion-Signature': expect.stringContaining('sha512='),
					'X-Remotion-Status': 'success',
					'X-Remotion-Mode': 'production',
					'Content-Length': expect.any(Number),
				},
				timeout: 5000,
			},
			expect.anything(),
		);
		await close();
	});

	test('Should call webhook upon timeout', async () => {
		const exampleBuild = path.join(process.cwd(), '..', 'example', 'build');

		// Maybe this can use simulateLambdaRender instead
		const {port, close} = await RenderInternals.serveStatic(exampleBuild, {
			binariesDirectory: null,
			concurrency: 1,
			downloadMap: RenderInternals.makeDownloadMap(),
			indent: false,
			logLevel: 'error',
			offthreadVideoCacheSizeInBytes: null,
			port: null,
			remotionRoot: path.dirname(exampleBuild),
			forceIPv4: false,
		});

		await mockImplementation.callFunctionSync({
			functionName: 'remotion-dev-lambda',
			region: 'us-east-1',
			type: ServerlessRoutines.launch,
			payload: {
				type: ServerlessRoutines.launch,
				offthreadVideoCacheSizeInBytes: null,
				serveUrl: `http://localhost:${port}`,
				chromiumOptions: {},
				codec: 'h264',
				composition: 'react-svg',
				crf: 9,
				envVariables: {},
				frameRange: [0, 10],
				framesPerFunction: 8,
				imageFormat: 'png',
				inputProps: {
					type: 'payload',
					payload: '{}',
				},
				logLevel: 'warn',
				maxRetries: 3,
				outName: 'out.mp4',
				pixelFormat: 'yuv420p',
				privacy: 'public',
				proResProfile: null,
				x264Preset: null,
				jpegQuality: undefined,
				scale: 1,
				timeoutInMilliseconds: 3000,
				numberOfGifLoops: null,
				everyNthFrame: 1,
				concurrencyPerFunction: 1,
				downloadBehavior: {
					type: 'play-in-browser',
				},
				muted: false,
				overwrite: true,
				webhook: {
					url: TEST_URL,
					secret: 'TEST_SECRET',
					customData: {customID: 123},
				},
				audioBitrate: null,
				videoBitrate: null,
				encodingBufferSize: null,
				encodingMaxRate: null,
				bucketName: 'abc',
				renderId: 'abc',
				forceHeight: null,
				forceWidth: null,
				rendererFunctionName: null,
				audioCodec: null,
				deleteAfter: null,
				colorSpace: null,
				preferLossless: false,
				forcePathStyle: false,
				metadata: null,
			},
			timeoutInTest: 1000,
		});

		await new Promise((resolve) => {
			setTimeout(resolve, 2000);
		});
		expect(mockableHttpClients.http).toHaveBeenCalledTimes(1);
		expect(mockableHttpClients.http).toHaveBeenCalledWith(
			TEST_URL,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Remotion-Mode': 'production',
					'X-Remotion-Signature': expect.stringContaining('sha512='),
					'X-Remotion-Status': 'timeout',
					'Content-Length': 84,
				},
				timeout: 5000,
			},
			expect.anything(),
		);
		await close();
	});
});
