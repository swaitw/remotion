import {Upload} from '@aws-sdk/lib-storage';
import type {UploadDirProgress} from '@remotion/serverless';
import type {Privacy} from '@remotion/serverless/client';
import mimeTypes from 'mime-types';
import type {Dirent} from 'node:fs';
import {createReadStream, promises as fs} from 'node:fs';
import path from 'node:path';
import type {AwsRegion} from '../regions';
import {getS3Client} from '../shared/get-s3-client';
import {makeS3Key} from '../shared/make-s3-key';
import {pLimit} from '../shared/p-limit';

type FileInfo = {
	name: string;
	size: number;
};

export type MockFile = {
	name: string;
	content: string;
};

async function getFiles(
	directory: string,
	originalDirectory: string,
	toUpload: string[],
): Promise<FileInfo[]> {
	const dirents = await fs.readdir(directory, {withFileTypes: true});
	const _files = await Promise.all(
		dirents
			.map((dirent): [Dirent, string] => {
				const res = path.resolve(directory, dirent.name);
				return [dirent, res];
			})
			.filter(([dirent, res]) => {
				const relative = path.relative(originalDirectory, res);
				if (dirent.isDirectory()) {
					return true;
				}

				if (!toUpload.includes(relative)) {
					return false;
				}

				return true;
			})
			.map(async ([dirent, res]) => {
				const {size} = await fs.stat(res);
				return dirent.isDirectory()
					? getFiles(res, originalDirectory, toUpload)
					: [
							{
								name: res,
								size,
							},
						];
			}),
	);
	return _files.flat(1);
}

const limit = pLimit(15);

export const uploadDir = async ({
	bucket,
	region,
	localDir,
	onProgress,
	keyPrefix,
	privacy,
	toUpload,
	forcePathStyle,
}: {
	bucket: string;
	region: AwsRegion;
	localDir: string;
	keyPrefix: string;
	onProgress: (progress: UploadDirProgress) => void;
	privacy: Privacy;
	toUpload: string[];
	forcePathStyle: boolean;
}) => {
	const files = await getFiles(localDir, localDir, toUpload);
	const progresses: {[key: string]: number} = {};
	for (const file of files) {
		progresses[file.name] = 0;
	}

	const client = getS3Client({region, customCredentials: null, forcePathStyle});

	const uploadWithoutRetry = async (filePath: FileInfo) => {
		const Key = makeS3Key(keyPrefix, localDir, filePath.name);
		const Body = createReadStream(filePath.name);
		const ContentType = mimeTypes.lookup(Key) || 'application/octet-stream';
		const ACL =
			privacy === 'no-acl'
				? undefined
				: privacy === 'private'
					? 'private'
					: 'public-read';

		const paralellUploads3 = new Upload({
			client,
			queueSize: 4,
			partSize: 5 * 1024 * 1024,
			params: {
				Key,
				Bucket: bucket,
				Body,
				ACL,
				ContentType,
			},
		});
		paralellUploads3.on('httpUploadProgress', (progress) => {
			progresses[filePath.name] = progress.loaded ?? 0;
		});
		const prom = await paralellUploads3.done();
		return prom;
	};

	const uploadWithRetry = async (filePath: FileInfo) => {
		let error: Error | null = null;
		for (let i = 0; i < 3; i++) {
			try {
				return await uploadWithoutRetry(filePath);
			} catch (err) {
				error = err as Error;
			}
		}

		if (error) {
			throw error;
		}
	};

	const uploadAll = (async () => {
		const uploads = files.map((filePath) =>
			limit(async () => {
				await uploadWithRetry(filePath);
			}),
		);
		await Promise.all(uploads);
	})();

	const interval = setInterval(() => {
		onProgress({
			totalSize: files.map((f) => f.size).reduce((a, b) => a + b, 0),
			sizeUploaded: Object.values(progresses).reduce((a, b) => a + b, 0),
			totalFiles: files.length,
			filesUploaded: files.filter((f) => progresses[f.name] === f.size).length,
		});
	}, 1000);
	await uploadAll;
	clearInterval(interval);
};
