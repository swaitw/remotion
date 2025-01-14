import {GetFunctionCommand} from '@aws-sdk/client-lambda';
import type {LogLevel} from '@remotion/renderer';
import type {FunctionInfo} from '@remotion/serverless';
import type {AwsRegion} from '../regions';
import {getLambdaClient} from '../shared/aws-clients';
import {DEFAULT_EPHEMERAL_STORAGE_IN_MB} from '../shared/constants';
import {getFunctionVersion} from '../shared/get-function-version';
import {validateAwsRegion} from '../shared/validate-aws-region';

export type GetFunctionInfoInput = {
	region: AwsRegion;
	functionName: string;
	logLevel?: LogLevel;
};

/*
 * @description Gets information about a function given its name and region.
 * @see [Documentation](https://remotion.dev/docs/lambda/getfunctioninfo)
 */
export const getFunctionInfo = async ({
	region,
	functionName,
	logLevel,
}: GetFunctionInfoInput): Promise<FunctionInfo> => {
	validateAwsRegion(region);

	const [functionInfo, version] = await Promise.all([
		getLambdaClient(region).send(
			new GetFunctionCommand({
				FunctionName: functionName,
			}),
		),
		getFunctionVersion({
			functionName,
			region,
			logLevel: logLevel ?? 'info',
		}),
	]);

	return {
		functionName,
		timeoutInSeconds: functionInfo.Configuration?.Timeout as number,
		memorySizeInMb: functionInfo.Configuration?.MemorySize as number,
		version,
		diskSizeInMb:
			functionInfo.Configuration?.EphemeralStorage?.Size ??
			DEFAULT_EPHEMERAL_STORAGE_IN_MB,
	};
};
