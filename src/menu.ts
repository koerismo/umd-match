'use strict';

import { GameWrapper } from './game.js';
import { instance as GameInstance } from './index.js';

const el_container: HTMLElement				= document.querySelector('#menu');
const el_settings_colormode: HTMLElement	= document.querySelector('#settings-colormode');
const el_settings_motion: HTMLElement		= document.querySelector('#settings-motion');

const el_volume_music: HTMLInputElement		= document.querySelector('#settings-volume-music');
const el_volume_sfx: HTMLInputElement		= document.querySelector('#settings-volume-sfx');

export let is_open = false;

const settings = {
	// color_mode:		0,
	volume_music:	1,
	volume_sfx:		1,
	motion:			0,
};

const proposed = {
	// color_mode:		0,
	volume_music:	1,
	volume_sfx:		1,
	motion:			0,
};

/* const color_modes = [
	{ name: 'Normal', table: [
		[168, 100,  77],	// Cyan
		[0,     0, 500],	// White
		[327, 100,  68],	// Pink
	] },
	{ name: 'Blue-Orange', table: [
		[222,  70,  68],	// Blue
		[0,     0, 500],	// White
		[40,   70, 206],	// Orange
	] },
	{ name: 'Green-Red', table: [
		[125,  50,  70],	// Green
		[0,     0, 500],	// White
		[3,    40,  90],	// Red
	] },
]; */

const motion_modes = [
	'Full', 'Reduced', 'Minimal',
];

const actions = {
	'enter-menu':		()=>{
		el_container.classList.add( 'main', 'active' );
		is_open = true;

		// Lower resolution to speed up rendering
		GameInstance.dpi = 0.5;
		GameInstance.resize();
	},
	'main-resume':		()=>{
		el_container.classList.remove( 'main', 'active' );
		is_open = false;

		// Return resolution to normal
		GameInstance.dpi = devicePixelRatio;
		GameInstance.resize();
	},
	'main-settings':	()=>{
		el_container.classList.remove( 'main' );
		el_container.classList.add( 'settings' );

		el_settings_motion.innerText = motion_modes[settings.motion];
		// el_settings_colormode.innerText = color_modes[settings.color_mode].name;
		el_volume_music.value = settings.volume_music.toString();
		el_volume_sfx.value = settings.volume_sfx.toString();
	},
	'main-exit':		()=>{},

	/* 'settings-colormode-prev':	()=>{
		proposed.color_mode -= 1;
		if (proposed.color_mode < 0) { proposed.color_mode = color_modes.length-1 }
		el_settings_colormode.innerText = color_modes[proposed.color_mode].name;
		GameWrapper.SetColorMode( color_modes[proposed.color_mode].table );
	},
	'settings-colormode-next':	()=>{
		proposed.color_mode += 1;
		proposed.color_mode %= color_modes.length;
		el_settings_colormode.innerText = color_modes[proposed.color_mode].name;
		GameWrapper.SetColorMode( color_modes[proposed.color_mode].table );
	}, */

	'settings-volume-music': (value: string)=>{
		proposed.volume_music = Number(value);
		GameWrapper.SetMusicVolume( proposed.volume_music );
	},
	'settings-volume-sfx': (value: string)=>{
		proposed.volume_sfx = Number(value);
		GameWrapper.SetSFXVolume( proposed.volume_sfx );
	},
	'settings-game-scale':	(value: string)=>{
		GameWrapper.SetGameScale( Number(value)+1 );
	},

	'settings-motion-prev': ()=>{
		if (proposed.motion > 0) proposed.motion --;
		else proposed.motion = motion_modes.length-1;
		el_settings_motion.innerText = motion_modes[proposed.motion];
		GameWrapper.SetMotionMode( proposed.motion );
	},
	'settings-motion-next': ()=>{
		if (proposed.motion < motion_modes.length-1) proposed.motion ++;
		else proposed.motion = 0;
		el_settings_motion.innerText = motion_modes[proposed.motion];
		GameWrapper.SetMotionMode( proposed.motion );
	},


	'settings-cancel':	()=>{
		el_container.classList.remove( 'settings' );
		el_container.classList.add( 'main' );

		Object.assign( proposed, settings );
		apply_settings();
	},
	'settings-apply':	()=>{
		el_container.classList.remove( 'settings' );
		el_container.classList.add( 'main' );

		Object.assign( settings, proposed );
		apply_settings();
	},
};

function apply_settings() {
	// GameWrapper.SetColorMode( color_modes[settings.color_mode].table );
	GameWrapper.SetMusicVolume( settings.volume_music );
	GameWrapper.SetSFXVolume( settings.volume_sfx );
	GameWrapper.SetMotionMode( settings.motion );
}

document.querySelectorAll( '*[data-action]' ).forEach( el=>{
	const action = el.getAttribute( 'data-action' );
	el.addEventListener( 'click', ()=>{
		actions[action]();
	});
});

document.querySelectorAll( '*[data-value]' ).forEach( el=>{
	const action = el.getAttribute( 'data-value' );
	el.addEventListener( 'input', ()=>{
		actions[action]( el.value );
	});
});