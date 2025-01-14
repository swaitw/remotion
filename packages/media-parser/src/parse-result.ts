import type {BaseBox} from './boxes/iso-base-media/base-type';
import type {EsdsBox} from './boxes/iso-base-media/esds/esds';
import type {FtypBox} from './boxes/iso-base-media/ftyp';
import type {MdatBox} from './boxes/iso-base-media/mdat/mdat';
import type {MdhdBox} from './boxes/iso-base-media/mdhd';
import type {HdlrBox} from './boxes/iso-base-media/meta/hdlr';
import type {IlstBox} from './boxes/iso-base-media/meta/ilst';
import type {MoovBox} from './boxes/iso-base-media/moov/moov';
import type {MvhdBox} from './boxes/iso-base-media/mvhd';
import type {Av1CBox} from './boxes/iso-base-media/stsd/av1c';
import type {AvccBox} from './boxes/iso-base-media/stsd/avcc';
import type {ColorParameterBox} from './boxes/iso-base-media/stsd/colr';
import type {CttsBox} from './boxes/iso-base-media/stsd/ctts';
import type {HvccBox} from './boxes/iso-base-media/stsd/hvcc';
import type {KeysBox} from './boxes/iso-base-media/stsd/keys';
import type {MebxBox} from './boxes/iso-base-media/stsd/mebx';
import type {PaspBox} from './boxes/iso-base-media/stsd/pasp';
import type {StcoBox} from './boxes/iso-base-media/stsd/stco';
import type {StscBox} from './boxes/iso-base-media/stsd/stsc';
import type {StsdBox} from './boxes/iso-base-media/stsd/stsd';
import type {StssBox} from './boxes/iso-base-media/stsd/stss';
import type {StszBox} from './boxes/iso-base-media/stsd/stsz';
import type {SttsBox} from './boxes/iso-base-media/stsd/stts';
import type {TfdtBox} from './boxes/iso-base-media/tfdt';
import type {TfhdBox} from './boxes/iso-base-media/tfhd';
import type {TkhdBox} from './boxes/iso-base-media/tkhd';
import type {TrakBox} from './boxes/iso-base-media/trak/trak';
import type {TrunBox} from './boxes/iso-base-media/trun';
import type {VoidBox} from './boxes/iso-base-media/void-box';
import type {RiffBox} from './boxes/riff/riff-box';
import type {TransportStreamBox} from './boxes/transport-stream/boxes';
import type {MatroskaSegment} from './boxes/webm/segments';

export interface RegularBox extends BaseBox {
	boxType: string;
	boxSize: number;
	children: IsoBaseMediaBox[];
	offset: number;
	type: 'regular-box';
}

export type IsoBaseMediaBox =
	| RegularBox
	| FtypBox
	| MvhdBox
	| TkhdBox
	| StsdBox
	| MebxBox
	| KeysBox
	| MoovBox
	| TrakBox
	| SttsBox
	| MdhdBox
	| IlstBox
	| EsdsBox
	| MdatBox
	| StszBox
	| StcoBox
	| StscBox
	| AvccBox
	| HvccBox
	| VoidBox
	| StssBox
	| PaspBox
	| CttsBox
	| Av1CBox
	| TrunBox
	| HdlrBox
	| ColorParameterBox
	| TfdtBox
	| TfhdBox;

export type AnySegment =
	| MatroskaSegment
	| IsoBaseMediaBox
	| RiffBox
	| TransportStreamBox;

export type IsoBaseMediaStructure = {
	type: 'iso-base-media';
	boxes: IsoBaseMediaBox[];
};

export type RiffStructure = {
	type: 'riff';
	boxes: RiffBox[];
};

export type MatroskaStructure = {
	type: 'matroska';
	boxes: MatroskaSegment[];
};

export type TransportStreamStructure = {
	type: 'transport-stream';
	boxes: TransportStreamBox[];
};

export type Structure =
	| IsoBaseMediaStructure
	| RiffStructure
	| MatroskaStructure
	| TransportStreamStructure;

export type ParseResult =
	| {
			status: 'done';
	  }
	| {
			status: 'incomplete';
			skipTo: number | null;
			continueParsing: () => Promise<ParseResult>;
	  };

export type MatroskaParseResult =
	| {
			status: 'done';
	  }
	| {
			status: 'incomplete';
			skipTo: number | null;
			continueParsing: () => Promise<MatroskaParseResult>;
	  };

export type ExpectSegmentParseResult =
	| {
			status: 'done';
			segment: MatroskaSegment;
	  }
	| {
			status: 'incomplete';
			segment: MatroskaSegment | null;
			continueParsing: () => Promise<ExpectSegmentParseResult>;
	  };
