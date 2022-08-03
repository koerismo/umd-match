'use strict';

import { GameWrapper } from './game.js';
import { load_sheet } from './sheet.js';
import { Bytewise, Vec2 } from './math.js';
import './menu.js';

globalThis.GameWrapper = GameWrapper;
globalThis.Bytewise = Bytewise;
globalThis.Vec2 = Vec2;

const canvas = document.querySelector('canvas');
window.addEventListener( 'resize', ()=>{
	instance.resize();
})

export const instance = globalThis.game = new GameWrapper(canvas);
instance.resize();
(async ()=> {
	await load_sheet( '/assets/game/sprites.png' );
	instance.generate_random( 0, 5, 0 );
	renderloop( 0 );
})();

globalThis.renderloop_active = true;

let lasttime = 0;
function renderloop(time: number) {
	
	const timestep = time-lasttime;
	lasttime = time;

	// If the tab is not focused, pause the game.
	if ( timestep < 800 ) {
		instance.physics( timestep/10 );
		instance.render();
	}

	if (!globalThis.renderloop_active) { return }
	requestAnimationFrame( renderloop );
}