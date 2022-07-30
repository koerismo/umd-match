'use strict';

import { GameWrapper } from './game.js';
import { load_sheet } from './sheet.js';
globalThis.GameWrapper = GameWrapper;
const canvas = document.querySelector('canvas');
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
const game = globalThis.game = new GameWrapper(canvas);
(async ()=> {
	await load_sheet( '/assets/game/sprites.png' );
	game.generate_random( 20, 0, 0 );
	game.render();
})();

globalThis.renderloop_active = true;
function renderloop() {

	const timestep = 1; // Figure out how to correct for frame skips
	game.physics( timestep );
	game.render();

	if (!renderloop_active) {return}
	requestAnimationFrame( renderloop );
}
renderloop();