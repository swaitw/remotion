import {$} from 'bun';
import {NoReactInternals} from 'remotion/no-react';

if (process.env.NODE_ENV !== 'production') {
	throw new Error('This script must be run using NODE_ENV=production');
}

const nodeVersion =
	await $`node -e "console.log(typeof structuredClone)"`.text();
if (nodeVersion.trim() === 'undefined') {
	if (NoReactInternals.ENABLE_V5_BREAKING_CHANGES) {
		throw new Error(
			'Error: You are using Node.js without structuredClone. Please upgrade to Node.js 17 or newer.',
		);
	} else {
		console.log(
			'Node does not have structuredClone. Passing because we are not building the site.',
		);
		process.exit(0);
	}
}

await $`bunx tailwindcss -i src/index.css -o dist/tailwind.css`;

const result = await Bun.build({
	entrypoints: ['./src/components/Homepage.tsx'],
	experimentalCss: true,
	format: 'esm',
	external: ['react', 'react-dom', 'lottie-web', 'hls.js', 'plyr', 'zod'],
});

for (const output of result.outputs) {
	await Bun.write('dist/' + output.path, await output.text());
}

export {};
