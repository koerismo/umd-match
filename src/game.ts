import { Vec2, i_Vec2, randint, Bitwise, Bytewise, randfloat, remap, constrain } from './math.js';
import { draw_sprite, load_sheet } from './image.js';
import * as sound from './sound.js';
import './howler.js';
import { EventSynchronizer } from './events.js';

//const assets = {};
export async function preload() {
	// const asset_sources = {
	// 	'bg_layer_00': '/assets/game/bg_layer_00.png',
	// 	'bg_layer_01': '/assets/game/bg_layer_01.png',
	// };

	// TODO: this has absolutely no error handling
	// for ( let source in asset_sources ) {
	// 	assets[source] = await load_image(asset_sources[source]);
	// }

	await load_sheet( '/assets/game/sprites_legacy.png' );
}




export function sleep( millis: number ){return new Promise(r=>{setTimeout(r,millis)})};

/*
	struct flags {
		char	color
		char	fill
		char	shape
	}
*/

sound.register_sounds([
	{
		name: 'connect_succeed',
		channel: 'sfx',
		sources: [
			['/assets/sound/connect_succeed1.mp3'],
			['/assets/sound/connect_succeed2.mp3'],
			['/assets/sound/connect_succeed3.mp3']],
		volume: 0.5
	},
	{
		name: 'connect_fail',
		channel: 'sfx',
		sources: [['/assets/sound/connect_fail.mp3']],
		volume: 0.5
	},
	{
		name: 'complete',
		channel: 'sfx',
		sources: [['/assets/sound/complete.mp3']],
		volume: 1
	},
	{
		name: 'click',
		channel: 'sfx',
		sources: [['/assets/sound/click.mp3']],
		volume: 0.4
	},
]);

sound.register_channels([
	{ name: 'sfx', volume: 0.5 },
	{ name: 'music', volume: 1 },
]);

const el_background = document.querySelector('#background');

const FLAGS_RANGE = 0x333;
const FLAGS_MAX = 0x222;

const ACT_IDLE = 0,
      ACT_GRAB = 1,
      ACT_PAUSE = 2;

const MOTION_FULL    = 0,
      MOTION_REDUCED = 1,
      MOTION_MINIMUM = 2;

interface iStar {
	velx:		number,
	vely:		number,

	x:			number,
	y:			number,

	visx:		number,
	visy:		number,
	vscale:		number,
	flags:		number,

	collected:	boolean,
	opacity:	number,
}

export class GameWrapper {

	stars:	Array<iStar> = [];
	canvas:	HTMLCanvasElement;
	ctx:	CanvasRenderingContext2D;

	space:	{ width: number, height: number } = { width: 0, height: 0 };
	dpi: number = devicePixelRatio;

	mouse = { x: 0, y: 0, star_id: null };
	selection: Array<number> = [];
	action = ACT_IDLE;

	collected_arr: Array<number> = [];
	collected = 0;
	difficulty = 0;

	__enable_score = true;
	score = 0;
	vscore = 0;

	__events = {};
	__pairstate: [Array<Uint8Array>,Uint8Array] = [[],new Uint8Array()]; // DEBUG

	level_size: [number, number, number] = [ 0, 5, 0 ];

	interactloop: EventSynchronizer;
	
	static gravity = 1;
	static gamescale = 1.75;
	static motion = MOTION_FULL;

	// this is obsolete now
	static colortable: Array<[number, number, number]> = [
		// H    S    L
		[168, 100,  77],	// Cyan
		[0,   	0, 500],	// White
		[327, 100,  68],	// Pink
	];

	static SetColorMode( mode: Array<[number, number, number]> ) {
		console.warn('SetColorMode is obsolete!');
		GameWrapper.colortable = mode;
	}

	static SetMusicVolume( volume: number ) {
		sound.set_channel_volume( 'music', volume );
	}

	static SetSFXVolume( volume: number ) {
		sound.set_channel_volume( 'sfx', volume );
	}

	static SetGameScale( scale: number ) {
		GameWrapper.gamescale = scale;
		console.warn('SetGameScale is non-functional!');
	}

	static SetMotionMode( mode: number ) {
		// 0 = full:	Everything is enabled
		// 1 = limited:	Main movement is disabled, but collection/completion movement is retained
		// 2 = minimal:	All movement is disabled and replaced with fades

		el_background.classList.toggle( 'no-motion', mode > MOTION_FULL );
		GameWrapper.motion = mode;
	}

	constructor( element: HTMLCanvasElement ) {
		this.stars	= [];
		this.canvas	= element;

		//@ts-ignore possibly null
		this.ctx = this.canvas.getContext( '2d' );
		if (this.ctx === null) throw('Context is null! This should never happen.');

		this.interactloop = new EventSynchronizer();
		this.interactloop.add( 'mousemove', (e:MouseEvent)=>this.onmousemove(e) );
		this.interactloop.add( 'mousedown', (e:MouseEvent)=>this.onmousedown(e) );

		this.canvas.addEventListener( 'mousemove', e=>this.interactloop.emit('mousemove',e) );
		this.canvas.addEventListener( 'mousedown', e=>this.interactloop.emit('mousedown',e) );
	}

	resize() {
		const diffX = this.canvas.clientWidth - this.space.width;
		const diffY = this.canvas.clientHeight - this.space.height;
		const recenterVec = Vec2.new( diffX/2, diffY/2 );
		this.stars.forEach( star=>{ Vec2.add( star, recenterVec ) });
		this.canvas.width = this.canvas.clientWidth*this.dpi;
		this.canvas.height = this.canvas.clientHeight*this.dpi;
		this.space.width = this.canvas.clientWidth;
		this.space.height = this.canvas.clientHeight;
	}

	onmousemove( e: MouseEvent ) {
		this.mouse.x = e.x,
		this.mouse.y = e.y;
		this.mouse.star_id = this.nearest_star( this.mouse, -1, 24*GameWrapper.gamescale );
	}

	/**
	 * DEBUG FUNCTION
	 * @private
	 * @returns [List of Uint8Array star index pairs, Uint8Array of unpaired star indices]
	 */
	__analyze_pairs(): [Uint8Array[],Uint8Array] {
		const pairs_complete: Array<Uint8Array> = [];
		const stars_used = new Set();

		for ( let a_id=0; a_id<this.stars.length; a_id++ ) {
			let star_a = this.stars[a_id];
			if (star_a.collected) continue;

			for ( let b_id=a_id+1; b_id<this.stars.length; b_id++ ) {
				let star_b = this.stars[b_id];
				if (star_b.collected) continue;

				// For efficiency, we determine the type of match from the first two stars.
				// After that, we only have to check once to make sure that it fits.
				let target_flags = Bytewise.star_compare(star_a.flags, star_b.flags)

				for ( let c_id=b_id+1; c_id<this.stars.length; c_id++ ) {
					let star_c = this.stars[c_id];
					if (star_c.collected) continue;

					if ( star_c.flags !== target_flags ) continue;
					stars_used.add( a_id );
					stars_used.add( b_id );
					stars_used.add( c_id );
					pairs_complete.push(Uint8Array.of(a_id, b_id, c_id));
				}
			}
		}

		const pairs_single = new Uint8Array( this.stars.length-stars_used.size-this.collected );
		let unpairable_id = 0;
		for ( let id=0; id<this.stars.length; id++ ) {
			if (stars_used.has(id) || this.stars[id].collected) continue;
			pairs_single[unpairable_id] = id;
			unpairable_id ++;
		}

		this.__pairstate = [pairs_complete, pairs_single];
		return this.__pairstate;
	}

	/**
	 * @param {number} difficulty A 0-1 float of the difficulty level.
	 * TODO: Rewrite this to be more efficient!!
	 * 
	 * This function does several things:
	 ** Evaluates every star, and looks for pairs that are currently impossible.
	 ** Ranks the 'requested' stars in order of most requests
	 ** Picks three stars from the list of requested stars (which ones it picks are determined by difficulty)
	 ** Adds new stars created with the picked properties to the board
	 */
	replenish_pairs( difficulty: number ) {
		const req_stars_set: Set<number> = new Set();
		const req_stars_dic = {};
		const internal_used = new Set();

		// Step 1: Evaluate incomplete pairs and rank requested stars.
		for ( let a_id=0; a_id<this.stars.length; a_id++ ) {
			let star_a = this.stars[a_id];
			if (star_a.collected) continue;

			for ( let b_id=a_id+1; b_id<this.stars.length; b_id++ ) {
				let star_b = this.stars[b_id];
				if (star_b.collected || internal_used.has(b_id)) continue;
				let target_flags = Bytewise.star_compare(star_a.flags, star_b.flags)

				let found = false;
				for ( let c_id=b_id+1; c_id<this.stars.length; c_id++ ) {
					let star_c = this.stars[c_id];
					if (!star_c.collected && star_c.flags == target_flags && !internal_used.has(c_id) ) { found = true; break }
				}

				if ( found ) {
					internal_used.add(star_a);
					internal_used.add(star_b);
					internal_used.add(target_flags);
					continue;
				}
				internal_used.add(star_b);
				req_stars_set.add(target_flags);
				req_stars_dic[target_flags] = (req_stars_dic[target_flags]||0) + 1;
			}
		}

		// Step 2: Pick most requested stars.
		const base_index = Math.round(remap( difficulty, 0, 1, 1, req_stars_set.size ));
		//@ts-ignore typescript badness
		const req_stars = Array.from(req_stars_set).sort((a,b)=>{
			return req_stars_dic[b] > req_stars_dic[a];
		});

		// Visualization of difficulty float --> star choice
		// ———————————————————————————————————————————————————————————
		//           0            0.5                1
		//           |-|-|       |-|-|             |-|-|
		// usable: [ 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 ]
		// unusable:                               [ 0 1 2 3 4 5 6 7 ]
		// ———————————————————————————————————————————————————————————

		const new_stars = new Array(3);
		for ( let i=0; i<3; i++ ) {
			if ( i+base_index-1 < req_stars_set.size )
				new_stars[i] = this.__createStar( req_stars[i+base_index-1] );
			else
				new_stars[i] = this.__createStar( Bytewise.random(FLAGS_MAX) );
		}

		Array.prototype.push.apply( this.stars, new_stars );
		return new_stars;
	}

	/**
	 * Since this is checked every turn, there should be 3(n) unpaired stars at any given time.
	 * We are guaranteed full coverage by matching one to the first two and matching two to the remaining one.
	 * This function assumes that the pair analysis has already been run.
	 */
	repair_broken_pairs() {
		const in_count		= this.__pairstate[1].length;
		const add_count		= Math.floor(in_count/2) + (in_count%2)*2;
		const adding		= new Array( add_count );

		for ( let base_id=0; base_id<Math.floor(in_count/2); base_id++ ) {
			const a_id				= this.__pairstate[1][base_id*2+0];
			const b_id				= this.__pairstate[1][base_id*2+1];
			adding[base_id]			= this.__createStar(Bytewise.star_compare( this.stars[a_id].flags, this.stars[b_id].flags ));
		}

		if ( in_count%2 ) {
			const base_id			= add_count-2;
			const out_flagtypes		= Bytewise.random( 0x111 );
			const out_flaginit		= this.stars[base_id].flags;
			adding[base_id+1]		= this.__createStar(Bytewise.add( out_flaginit, out_flagtypes*1, 0x2 ));
			adding[base_id+2]		= this.__createStar(Bytewise.add( out_flaginit, out_flagtypes*2, 0x2 ));
		}

		Array.prototype.push.apply( this.stars, adding );
	}

	check_pair( pair: Array<number> ) {
		const flags = new Array(3);
		for ( let flag_ind=0; flag_ind<3; flag_ind++ ) {
			flags[flag_ind] = new Uint8Array(pair.length);
			for ( let star_ind=0; star_ind<pair.length; star_ind++ ) {
				flags[flag_ind][star_ind] = Bytewise.get( this.stars[this.selection[star_ind]].flags, flag_ind );
			}
			const flags_as_set = new Set(flags[flag_ind]);
			if (flags_as_set.size !== 1 && flags_as_set.size !== pair.length) {return false}
		}
		return true;
	}

	onmousedown( e: MouseEvent ) {
		this.mouse.x = e.x,
		this.mouse.y = e.y;

		let star_ind: number|null = this.nearest_star( this.mouse, -1, 24*GameWrapper.gamescale );
		if ( star_ind === null ) {
			this.selection = [];
			this.action = ACT_IDLE;
			return;
		}

		if ( this.action === ACT_GRAB ) {
			// Add to existing selection
			if ( this.selection.includes(star_ind) ) { return }
			sound.play_sound( 'click' );
			this.selection.push( star_ind );

			if ( this.selection.length == 3 ) {
				
				const is_valid = this.check_pair( this.selection );
				if ( !is_valid ) {
					this.selection = [];
					this.action = ACT_IDLE;
					sound.play_sound( 'connect_fail' );
					return;
				}

				this.collected += this.selection.length;
				Array.prototype.push.apply( this.collected_arr, this.selection );
				
				for ( let ind=0; ind<this.selection.length; ind++ ) {
					this.stars[this.selection[ind]].collected = true;
				}

				if ( this.collected == this.stars.length ) {
					sound.play_sound( 'complete' );
					if (this.__fire_event( 'pre_complete' )) this.next_stage();
					// TODO: Make something happen with the points here?
				}

				sound.play_sound( 'connect_succeed' );
				if (this.__enable_score) this.score += this.determine_score( this.selection );
				this.__analyze_pairs();
				this.selection = [];
				this.action = ACT_IDLE;

				if ( this.__pairstate[1].length ) this.repair_broken_pairs();
			}
		}
		else {
			// Begin new selection
			sound.play_sound( 'click' );
			this.selection = [ star_ind ];
			this.action = ACT_GRAB;
		}
	}

	nearest_star( vec: i_Vec2, exclude: number=-1, max_radius: number=0 ): number|null {
		if ( this.stars.length == 0 ) return null;

		const dists	= new Uint16Array(this.stars.length);
		let min_dist = null;
		for ( let i=0; i<this.stars.length; i++ ) {

			dists[i] = Math.min((vec.x-this.stars[i].x)**2 + (vec.y-this.stars[i].y)**2, 0xffff);
			// Is not excluded,   is minimum OR the first item,                 is not collected
			if ( exclude !== i && (dists[i] < min_dist || min_dist === null) && !this.stars[i].collected ) { min_dist = dists[i] };
		}

		if ( min_dist === null || (max_radius && min_dist > max_radius**2) ) { return null }
		return dists.indexOf( min_dist );
	}

	clear_stage() {
		this.stars = [];
		this.selection = [];
		this.collected = 0;
		this.collected_arr = [];
	}

	hook( name: string, func: Function ) {
		this.__events[name] = func;
	}

	unhook( name: string ) {
		if (name in this.__events) delete this.__events[name];
	}

	__fire_event( name: string ) {
		/* If this returns true, it means that it should continue with the normal next event. */
		if ( name in this.__events ) return this.__events[name](this);
		return true;
	}

	/**
	 * Determines the score that a pair should earn. This is an arbitrary number that means nothing.
	 * min=50, max=140
	 */
	determine_score( pair: Array<number> ) {

		/*	struct flags {
			char	color
			char	fill
			char	shape
		} */

		let score = 50;
		const diff = Bytewise.eq(this.stars[pair[0]].flags, this.stars[pair[1]].flags);
		if (!((diff>>2)&&1)) score += 20
		if (!((diff>>1)&&1)) score += 30
		if (!((diff>>0)&&1)) score += 40
		return score;
	}

	async next_stage() {
		await sleep(500);
		this.clear_stage();
		this.generate_random( ...this.level_size );
		this.__pairstate[1] = new Uint8Array();

		if ( GameWrapper.motion > MOTION_FULL ) {
			for ( let x=0; x<50; x++ ) {
				this.physics( 20, true );
			}
			this.settle_stars( GameWrapper.motion < MOTION_MINIMUM );
		} else this.settle_stars( true );
	}

	__createStar( flags: number ) {
		const csize = this.space;
		function randpos( star: iStar ) {
			star.x = randfloat(0.1,0.9)*csize.width;
			star.y = randfloat(0.1,0.9)*csize.height;
			return star;
		}

		return randpos({ x:0, y:0, flags:flags, velx:0, vely:0, collected:false, visx:0, visy:0, vscale:2, opacity:100 });
	}

	/**
	 * 
	 * @param num_unpaired	The number of unpaired stars to generate.
	 * @param num_pairs		The number of paired stars to generate.
	 * @param num_repair	The number of attempts to create pairs for existing stars.
	 */
	generate_random( num_unpaired: number, num_paired: number, num_repairs: number ) {
		// Generate a number of new stars, with a percentage of pairable ones.
		// If there are any non-paired ones from the previous round, attempt to make them pairable to keep the game fair.
		// They should probably generate mostly out of bounds, so that they can be pulled inwards.

		// Gather actual canvas coords
		const csize = this.space;
		function randpos( star: iStar ) {
			star.x = randfloat(0.1,0.9)*csize.width;
			star.y = randfloat(0.1,0.9)*csize.height;
			return star;
		}

		// Create paired stars.
		const paired: Array<Array<iStar>> = [];
		for ( let i=0; i<num_paired; i++ ) {

			// Create a new bunch of stars. For every flag, determine if the flag is all different or all the same.
			// Pick a random starting point for every flag, then increment the different ones for every star.
			const pair_size			= 3 // randint( 2, 3 );
			const pair				= new Array(pair_size);

			const flags_unique		= randint( 0b000, 0b111 );
			let pair_flag_inds		= Bytewise.random( FLAGS_MAX );
			
			for ( let star=0; star<pair_size; star++ ) {
				pair[star] = this.__createStar(pair_flag_inds);
				for ( let flag=0; flag<3; flag++ )
					if ( (flags_unique>>flag) & 0b1 )
						pair_flag_inds = Bytewise.inc( pair_flag_inds, flag, Bytewise.get(FLAGS_RANGE, flag) );
						
			}

			paired.push( pair );
		}

		// Create random stars.
		const unpaired = new Array( num_unpaired );
		for ( let i=0; i<num_unpaired; i++ ) {
			unpaired[i] = this.__createStar(Bytewise.random(FLAGS_MAX));
		}

		// Apply new
		if (num_paired) {
			const flat_paired = paired.reduce((a,b)=>a.concat(b));
			Array.prototype.push.apply( this.stars, flat_paired );
		}
		Array.prototype.push.apply( this.stars, unpaired );
	}

	settle_stars( zoom: boolean ) {
		const center = Vec2.new( this.space.width/2, this.space.height/2 );
		const zoomscale = 1.4;

		if ( zoom ) {
			for ( let star of this.stars ) {
				star.visx = (star.x-center.x)*zoomscale + center.x;
				star.visy = (star.y-center.y)*zoomscale + center.y;
			}
		}
		else {
			for ( let star of this.stars ) {
				star.visx = star.x;
				star.visy = star.y;
			}
		}
		
	}

	physics( deltatime: number, force_motion=false ) {

		this.interactloop.serve();

		const is_full_motion = GameWrapper.motion == MOTION_FULL || force_motion;
		const center = Vec2.new( this.space.width/2, this.space.height/2 );

		// Lazily collect stars (used when motion is disabled)
		if ( GameWrapper.motion == MOTION_MINIMUM && !force_motion ) {
			for ( let star of this.stars ) {
				if ( star.collected && star.opacity > 0 ) { star.opacity -= 5 }
			}
			return;
		}

		for ( let star_ind=0; star_ind<this.stars.length; star_ind++ ) {
			const star = this.stars[star_ind];
			if ( !star.collected ) {
				if ( !is_full_motion ) { continue }
				
				// Gravity & swirl
				const grav = Vec2.new( star.x-this.space.width/2, star.y-this.space.height/2 );
				const swirl_strength = 0.2 / Vec2.mag( grav )**0.6 + 0.03;
				Vec2.mult( grav, -0.0001*GameWrapper.gravity );
				star.velx += grav.x;
				star.vely += grav.y;

				const grav_swirl = Vec2.from_angle(Vec2.angle(grav)+1.571+0.2, swirl_strength);
				star.velx += grav_swirl.x;
				star.vely += grav_swirl.y;

				// Star collision
				const nstar = this.nearest_star( star, star_ind, 72 );
				if ( nstar !== null ) {
					const inverse = Vec2.copy( star );
					Vec2.sub( inverse, this.stars[nstar] );
					const mag = Vec2.mag( inverse );
					Vec2.norm(inverse, (96-mag)/400 );

					star.velx += inverse.x;
					star.vely += inverse.y;
				}
	
				star.velx *= 0.9;
				star.vely *= 0.9;
				star.x += star.velx * deltatime,
				star.y += star.vely * deltatime;
				continue;
			}

			// Bring collected stars to center
			if ( star.opacity > 0 ) { star.opacity = star.opacity*0.85 - 1; }
			else continue;
			star.x = (star.x*6 + center.x) / 7;
			star.y = (star.y*6 + center.y) / 7;
		}
	}

	render() {

		const ctx = this.ctx;
		ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );

		if ( this.selection.length ) {
			ctx.strokeStyle = '#888';
			ctx.lineWidth = this.dpi;
			
			ctx.beginPath();
			const first = this.selection[0];
			ctx.moveTo( this.stars[first].visx*this.dpi, this.stars[first].visy*this.dpi );
			for ( let i=1; i<this.selection.length; i++ ) {
				ctx.lineTo( this.stars[this.selection[i]].visx*this.dpi, this.stars[this.selection[i]].visy*this.dpi );
			}
			if ( this.mouse.star_id === null ) {
				ctx.lineTo( this.mouse.x*this.dpi, this.mouse.y*this.dpi );
			} else {
				ctx.lineTo( this.stars[this.mouse.star_id].x*this.dpi, this.stars[this.mouse.star_id].y*this.dpi );
			}

			ctx.stroke();
		}

		/*
		if ( this.__pairstate ) {
			const pairable = this.__pairstate[0];
			const single = this.__pairstate[1];

			if ( pairable.length ) {
				ctx.strokeStyle = 'rgb(0,255,0)';
				ctx.beginPath();
				for ( let pair of pairable ) {
					ctx.moveTo( this.stars[pair[0]].visx*this.dpi, this.stars[pair[0]].visy*this.dpi );
					ctx.lineTo( this.stars[pair[1]].visx*this.dpi, this.stars[pair[1]].visy*this.dpi );
					ctx.lineTo( this.stars[pair[2]].visx*this.dpi, this.stars[pair[2]].visy*this.dpi );
					ctx.lineTo( this.stars[pair[0]].visx*this.dpi, this.stars[pair[0]].visy*this.dpi );
				}
				ctx.stroke();
			}
			
			if ( single.length ) {
				ctx.strokeStyle = '#f00';
				ctx.beginPath();
				for ( let pair of single ) {
					if ( this.stars[pair].collected ) continue;
					const x = this.stars[pair].visx*this.dpi;
					const y = this.stars[pair].visy*this.dpi;
					ctx.moveTo( x, y )
					ctx.ellipse( x, y, 30, 30, 0, 0, 360 );
				}
				ctx.stroke();
			}
		}
		*/

		/*
		// Connect nearby stars with subtle lines. Looks cool, but will probably misguide players.
		ctx.lineWidth = this.dpi/2;
		ctx.strokeStyle = '#fff3';
		ctx.beginPath();
		for ( let a_id=0; a_id<this.stars.length; a_id++ ) {
			let star_a = this.stars[a_id];
			if ( star_a.collected ) continue;

			for ( let b_id=a_id+1; b_id<this.stars.length; b_id++ ) {
				let star_b = this.stars[b_id];
				if ( star_b.collected ) continue;

				if ( ((star_a.x-star_b.x)**2 + (star_a.y-star_b.y)**2)**0.5 > 100 ) continue;
				ctx.moveTo( star_a.visx*this.dpi, star_a.visy*this.dpi );
				ctx.lineTo( star_b.visx*this.dpi, star_b.visy*this.dpi );
			}
		}
		ctx.stroke();
		*/
		

		for ( let star_ind=0; star_ind<this.stars.length; star_ind++ ) {
			const star = this.stars[star_ind];
			if ( star.opacity <= 0 ) { continue }

			let mdir = Vec2.new( star.x-this.mouse.x, star.y-this.mouse.y );
			Vec2.mult( mdir, -0.04 * (this.mouse.star_id!==null && this.mouse.star_id!==star_ind) );
			let pos = Vec2.new( star.x, star.y );
			let scale = 1;
			if ( this.selection.includes(star_ind) ) {
				scale = 1.3;
				Vec2.add( pos, mdir );
			}

			star.visx = (star.visx*2 + pos.x) / 3;
			star.visy = (star.visy*2 + pos.y) / 3;
			star.vscale = (star.vscale*2 + scale) / 3;
			const rscale = star.vscale * 32;
			ctx.globalAlpha = star.opacity/100;

			const canvas_pos = Vec2.new( star.visx, star.visy );
			const canvas_scale = rscale * this.dpi * GameWrapper.gamescale;
			Vec2.mult( canvas_pos, this.dpi );

			draw_sprite( ctx, star.flags, canvas_pos.x-canvas_scale/2, canvas_pos.y-canvas_scale/2, canvas_scale, canvas_scale );
		}

		if ( this.__enable_score ) {
			if ( this.vscore < this.score ) this.vscore++;
			if ( this.vscore > this.score ) this.vscore = this.score;

			const centerx = this.canvas.width/2;
			ctx.globalAlpha = 1;
			ctx.textBaseline = 'top';
			ctx.fillStyle = '#888';
	
			ctx.textAlign = 'right';
			ctx.font = `bold ${15*this.dpi}px "Helvetica Neue"`;
			ctx.fillText( 'SCORE', centerx-5, 10*this.dpi );
	
			ctx.textAlign = 'left';
			ctx.font = `lighter ${15*this.dpi}px "Helvetica Neue"`;
			ctx.fillText( this.vscore.toFixed(0), centerx+5, 10*this.dpi );
		}
	}
}