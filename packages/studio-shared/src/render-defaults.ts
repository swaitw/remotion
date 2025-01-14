import type {
	AudioCodec,
	ChromeMode,
	Codec,
	ColorSpace,
	LogLevel,
	OpenGlRenderer,
	PixelFormat,
	ProResProfile,
	StillImageFormat,
	VideoImageFormat,
	X264Preset,
} from '@remotion/renderer';
import type {HardwareAccelerationOption} from '@remotion/renderer/client';
import type {GitSource} from './git-source';
import type {InstallablePackage} from './installable-packages';
import type {PackageManager} from './package-manager';

export type RenderDefaults = {
	jpegQuality: number;
	scale: number;
	logLevel: LogLevel;
	codec: Codec;
	concurrency: number;
	minConcurrency: number;
	muted: boolean;
	maxConcurrency: number;
	stillImageFormat: StillImageFormat;
	videoImageFormat: VideoImageFormat;
	audioCodec: AudioCodec | null;
	enforceAudioTrack: boolean;
	proResProfile: ProResProfile;
	x264Preset: X264Preset;
	pixelFormat: PixelFormat;
	audioBitrate: string | null;
	videoBitrate: string | null;
	encodingBufferSize: string | null;
	encodingMaxRate: string | null;
	userAgent: string | null;
	everyNthFrame: number;
	numberOfGifLoops: number | null;
	delayRenderTimeout: number;
	disableWebSecurity: boolean;
	openGlRenderer: OpenGlRenderer | null;
	ignoreCertificateErrors: boolean;
	offthreadVideoCacheSizeInBytes: number | null;
	headless: boolean;
	colorSpace: ColorSpace;
	multiProcessOnLinux: boolean;
	beepOnFinish: boolean;
	repro: boolean;
	forSeamlessAacConcatenation: boolean;
	metadata: Record<string, string> | null;
	hardwareAcceleration: HardwareAccelerationOption;
	chromeMode: ChromeMode;
};

declare global {
	interface Window {
		remotion_renderDefaults: RenderDefaults | undefined;
		remotion_gitSource: GitSource | null;
		remotion_installedPackages: InstallablePackage[] | null;
		remotion_packageManager: PackageManager | 'unknown';
	}
}
