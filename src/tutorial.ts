import { GameWrapper, sleep } from './game.js';
import { instance } from './index.js';

const el_container = document.querySelector('#tutorial');

const tutorial = [
	{	'1': 'Hello, this is a game about connecting dots.',
		'2': '', '3': 'The rules are simple -',
		'4': '', '5': 'A set is composed of three stars that,',
		'6': 'for every charactaristic,',
		'7': 'are all equal or are all not equal.',

		'ACT0': function() {
			instance.clear_stage();
			
			// Forcing the pair to make sure the user gets a pair with different properties
			instance.stars = [
				instance.__createStar( 0x000 ),
				instance.__createStar( 0x111 ),
				instance.__createStar( 0x222 ),
			];
			instance.settle_stars(true);
			instance.hook('pre_complete', next );
		}
	},
	{
		'1': 'There it is!',
		'2': 'It\'s easy, you\'ll get the hang of it.',
		'ACT0': async function() {
			await sleep(200);
			instance.clear_stage();
			
			// Forcing the pair to make sure the user gets a pair with different properties
			instance.stars = [
				instance.__createStar( 0x012 ),
				instance.__createStar( 0x012 ),
				instance.__createStar( 0x012 ),
			];
			instance.settle_stars(true);
		}
	},
	{
		'1': 'Who am I to keep you waiting?',
		'2': 'You can do this at your own pace.',
		'ACT0': async function() {
			await sleep(300);
			instance.generate_random( 0, 2, 0 );
			instance.settle_stars( true );
			instance.hook( 'pre_complete', end_tutorial );
		}
	},
]

function next() {
	slide++;
	while (el_container.firstChild) el_container.removeChild(el_container.firstChild);
	
	let lind = 0;
	for ( let key in tutorial[slide] ) {
		if (key.startsWith('ACT')) { tutorial[slide][key](); continue }
		
		lind++;
		const line = document.createElement('span');
		line.innerText = tutorial[slide][key];

		el_container.appendChild(line);
		setTimeout(()=>{line.classList.add('active')}, lind*500);
	}

	return false;
}

let slide = 0;
export function begin_tutorial() {
	el_container.classList.add('active');
	slide = -1;
	instance.__enable_score = false;
	next();
}

function end_tutorial() {
	el_container.classList.remove('active');
	instance.__enable_score = true;
	instance.score = 0;
	instance.unhook( 'pre_complete' );
	return true;
}
