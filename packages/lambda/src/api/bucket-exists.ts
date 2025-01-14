import {GetBucketLocationCommand} from '@aws-sdk/client-s3';
import type {ProviderSpecifics} from '@remotion/serverless';
import type {AwsProvider} from '../functions/aws-implementation';
import {getS3Client} from '../shared/get-s3-client';

export const bucketExistsInRegionImplementation: ProviderSpecifics<AwsProvider>['bucketExists'] =
	async ({bucketName, region, expectedBucketOwner, forcePathStyle}) => {
		try {
			const bucket = await getS3Client({
				region,
				customCredentials: null,
				forcePathStyle,
			}).send(
				new GetBucketLocationCommand({
					Bucket: bucketName,
					ExpectedBucketOwner: expectedBucketOwner ?? undefined,
				}),
			);

			return (bucket.LocationConstraint ?? 'us-east-1') === region;
		} catch (err) {
			if ((err as {Code: string}).Code === 'NoSuchBucket') {
				return false;
			}

			throw err;
		}
	};
