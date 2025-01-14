import {errorIsOutOfSpaceError} from './error-category';
import type {FileNameAndSize} from './get-files-in-folder';
import type {ProviderSpecifics} from './provider-implementation';
import type {CloudProvider} from './types';

export type FunctionErrorInfo = {
	type: 'renderer' | 'browser' | 'stitcher' | 'webhook' | 'artifact';
	message: string;
	name: string;
	stack: string;
	frame: number | null;
	chunk: number | null;
	isFatal: boolean;
	attempt: number;
	willRetry: boolean;
	totalAttempts: number;
	tmpDir: {files: FileNameAndSize[]; total: number} | null;
};

export const getTmpDirStateIfENoSp = <Provider extends CloudProvider>(
	err: string,
	providerSpecifics: ProviderSpecifics<Provider>,
): FunctionErrorInfo['tmpDir'] => {
	if (!errorIsOutOfSpaceError(err)) {
		return null;
	}

	const files = providerSpecifics.getFolderFiles('/tmp');
	return {
		files: files
			.slice(0)
			.sort((a, b) => a.size - b.size)
			.reverse()
			.slice(0, 100),
		total: files.reduce((a, b) => a + b.size, 0),
	};
};

export type EnhancedErrorInfo = FunctionErrorInfo & {
	/**
	 * @deprecated Will always be an empty string.
	 */
	s3Location: string;
	explanation: string | null;
};
