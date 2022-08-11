'use strict';

import { GameWrapper, preload } from './game.js';
import { Bytewise, Vec2 } from './math.js';
import { begin_tutorial } from './tutorial.js';
import './menu.js';

// remove this later, debug!!!
globalThis.GameWrapper = GameWrapper;
globalThis.Bytewise = Bytewise;
globalThis.Vec2 = Vec2;
globalThis.begin_tutorial = begin_tutorial;

const canvas = document.querySelector('canvas');
// const el_fps = document.querySelector('span#fps');
window.addEventListener( 'resize', ()=>{
	instance.resize();
})

export const instance = globalThis.game = new GameWrapper(canvas);
instance.resize();
(async ()=> {
	await preload();
	begin_tutorial();
	renderloop( 0 );
})();

globalThis.renderloop_active = true;

let lasttime = 0;
let avg_delta = 500;
function renderloop(time_raw: number) {
	
	const time = time_raw|0;
	const delta = time-lasttime;
	lasttime = time;
	
	avg_delta += (delta - avg_delta)/40;
	// el_fps.innerText = (Math.round(1000/avg_delta*10)/10).toFixed(1);

	// If the tab is not focused, pause the game.
	if ( delta < 800 ) {
		instance.physics( delta/10 );
		instance.render();
	}

	if (!globalThis.renderloop_active) { return }
	requestAnimationFrame( renderloop );
}