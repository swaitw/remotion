import {loadFonts} from './base';

export const getInfo = () => ({
	fontFamily: 'Noto Sans Pahawh Hmong',
	importName: 'NotoSansPahawhHmong',
	version: 'v18',
	url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Pahawh+Hmong:ital,wght@0,400',
	unicodeRanges: {
		'pahawh-hmong': 'U+200C-200D, U+25CC, U+16B00-16B8F',
		'latin-ext':
			'U+0100-02AF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
		latin:
			'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
	},
	fonts: {
		normal: {
			'400': {
				'pahawh-hmong':
					'https://fonts.gstatic.com/s/notosanspahawhhmong/v18/bWtp7e_KfBziStx7lIzKKaMUOBEA3UPQDW7kn7wUV4IjKw.woff2',
				'latin-ext':
					'https://fonts.gstatic.com/s/notosanspahawhhmong/v18/bWtp7e_KfBziStx7lIzKKaMUOBEA3UPQDW7knz41cr8a.woff2',
				latin:
					'https://fonts.gstatic.com/s/notosanspahawhhmong/v18/bWtp7e_KfBziStx7lIzKKaMUOBEA3UPQDW7knzA1cg.woff2',
			},
		},
	},
});

export const fontFamily = 'Noto Sans Pahawh Hmong' as const;

type Variants = {
	normal: {
		weights: '400';
		subsets: 'latin' | 'latin-ext' | 'pahawh-hmong';
	};
};

export const loadFont = <T extends keyof Variants>(
	style?: T,
	options?: {
		weights?: Variants[T]['weights'][];
		subsets?: Variants[T]['subsets'][];
		document?: Document;
	},
) => {
	return loadFonts(getInfo(), style, options);
};
