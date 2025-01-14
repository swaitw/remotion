import type {CreateFunction} from '@remotion/serverless';
import {VERSION} from 'remotion/version';
import type {AwsProvider} from '../../functions/aws-implementation';
import {addFunction} from './mock-functions';

export const mockCreateFunction: CreateFunction<AwsProvider> = (input) => {
	if (!input.alreadyCreated) {
		addFunction(
			{
				functionName: input.functionName,
				memorySizeInMb: input.memorySizeInMb,
				timeoutInSeconds: input.timeoutInSeconds,
				version: VERSION,
				diskSizeInMb: input.ephemerealStorageInMb,
			},
			input.region,
		);
	}

	return Promise.resolve({
		FunctionName: input.functionName,
	});
};
