import './howler.js';
import { randint } from './math.js';

export interface iSoundEntry {
	name:		string,
	channel:	string,
	sources:	Array<Array<string>>,
	volume:		number,
}

interface iProcessedSoundEntry {
	channel:	string,
	volume:		number,
	howls:		Array<Howl>,
}

export interface iChannelEntry {
	name:		string,
	volume:		number,
}

export const SOUNDS = {};
globalThis.SOUNDS = SOUNDS;
export const CHANNELS = {};
globalThis.CHANNELS = CHANNELS;

export function register_sounds( sounds: Array<iSoundEntry> ) {
	for ( let sound of sounds ) {
		const howls = new Array(sound.sources.length);
		for ( let s in sound.sources ) {
			howls[s] = new Howl({ src: sound.sources[s], volume: sound.volume });
		}
		SOUNDS[ sound.name ] = {
			channel: sound.channel,
			volume: sound.volume,
			howls: howls,
		};
	}
}

export function register_channels( channels: Array<iChannelEntry> ) {
	for ( let channel of channels ) {
		CHANNELS[channel.name] = channel.volume;
	}
}

export function set_sound_volume( name: string, volume: number ) {
	if (!( name in SOUNDS )) throw( `ValueError: Attempted to access non-existent sound ${name}` );
	if ( volume < 0 ) throw( `ValueError: Setting volume to invalid volume` )
	const sound: iProcessedSoundEntry = SOUNDS[name];
	for ( let howl of sound.howls ) howl.volume( volume * CHANNELS[sound.channel] );
	sound.volume = volume;
}

/** Set channel volume, and update all currently playing sounds. Warning: This is expensive! */
export function set_channel_volume( name: string, volume: number ) {
	if (!( name in CHANNELS )) throw( `ValueError: Attempted to access non-existent channel ${name}` );
	for ( let s in SOUNDS ) {
		if ( SOUNDS[s].channel !== name ) { continue }
		for ( let howl of SOUNDS[s].howls ) {
			if ( !howl.playing ) { continue }
			howl.volume( volume );
		}
	}
}

export function play_sound( name: string ) {
	if (!( name in SOUNDS )) throw( `ValueError: Attempted to play non-existent sound ${name}` );
	const sound: iProcessedSoundEntry = SOUNDS[name];
	if ( sound.volume * CHANNELS[sound.channel] === 0 ) { return }
	let volume	= sound.volume * CHANNELS[sound.channel];

	if ( sound.howls.length > 1 ) {
		let howl_id	= randint( 0, sound.howls.length-1 );
		sound.howls[howl_id].volume(volume);
		sound.howls[howl_id].play();
	}
	else {
		sound.howls[0].volume(volume);
		sound.howls[0].play();
	}
}