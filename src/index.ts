'use strict';

import { GameWrapper } from './game.js';
import { load_sheet } from './sheet.js';
import { Bytewise, Vec2 } from './math.js';

globalThis.GameWrapper = GameWrapper;
globalThis.Bytewise = Bytewise;
globalThis.Vec2 = Vec2;

const canvas = document.querySelector('canvas');
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const game = globalThis.game = new GameWrapper(canvas);
(async ()=> {
	await load_sheet( '/assets/game/sprites.png' );
	game.generate_random( 0, 5, 0 );
	game.render();
})();

globalThis.renderloop_active = true;
let lasttime = Date.now();
function renderloop(time) {
	
	const timestep = time-lasttime;
	lasttime = time;

	if ( timestep < 800 ) {
		game.physics( timestep/10 );
		game.render();
	}

	if (!renderloop_active) { return }
	requestAnimationFrame( renderloop );
}
renderloop();