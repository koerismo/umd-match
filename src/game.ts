import { Vec2, i_Vec2, randint, Bitwise, Bytewise, randfloat } from './math.js';
import { Sheet, draw_sprite } from './sheet.js';
import * as sound from './sound.js';
import './howler.js';

function sleep( millis: number ){return new Promise(r=>{setTimeout(r,millis)})};

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

const FLAGS_RANGE = 0x332;
const FLAGS_MAX = 0x221;

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
	collected = 0;

	level_size: [number, number, number] = [ 0, 5, 0 ];
	
	static gravity = 1;
	static gamescale = 1;
	static motion = MOTION_FULL;

	static colortable: Array<[number, number, number]> = [
		// H    S    L
		[168, 100,  77],	// Cyan
		[0,   	0, 500],	// White
		[327, 100,  68],	// Pink
	];

	static SetColorMode( mode: Array<[number, number, number]> ) {
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
		GameWrapper.motion = mode;
		console.warn('SetMotionMode is non-functional!');
	}

	constructor( element: HTMLCanvasElement ) {
		this.stars	= [];
		this.canvas	= element;

		//@ts-ignore possibly null
		this.ctx = this.canvas.getContext('2d', { alpha: false });
		if (this.ctx === null) throw('Context is null! This should never happen.');

		this.canvas.addEventListener( 'mousemove', e=>{ this.onmousemove(e) });
		this.canvas.addEventListener( 'mousedown', e=>{ this.onmousedown(e) });
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
		this.mouse.star_id = this.nearest_colliding_star( this.mouse );
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

		let star_ind: number|null = this.nearest_colliding_star( this.mouse, -1, 24 );
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

				for ( let ind=0; ind<this.selection.length; ind++ ) {
					this.stars[this.selection[ind]].collected = true;

				}
				if ( this.collected == this.stars.length ) {
					sound.play_sound( 'complete' );
					this.next_stage();
				}
				else {
				}
				sound.play_sound( 'connect_succeed' );
				this.selection = [];
				this.action = ACT_IDLE;
			}
		}
		else {
			// Begin new selection
			sound.play_sound( 'click' );
			this.selection = [ star_ind ];
			this.action = ACT_GRAB;
		}
	}

	nearest_star( vec: i_Vec2, exclude: number=-1 ) {
		if ( this.stars.length == 0 ) return null;
		const indices	= Array.from(Array(this.stars.length),(_,i)=>i);
		const dists		= indices.map( i => Vec2.mag({ x: vec.x-this.stars[i].x, y: vec.y-this.stars[i].y }) );
		indices.sort( (a,b) => +(dists[b] < dists[a]) );
		const filtered = indices.filter( x => !this.stars[x].collected && x != exclude );
		if ( filtered.length == 0 ) return null;
		return filtered[0];
	}

	nearest_colliding_star( vec: i_Vec2, exclude: number=-1, radius: number=24 ) {
		const nearest = this.nearest_star( vec, exclude );
		if ( nearest === null ) { return nearest }
		if ( Vec2.mag({ x: vec.x-this.stars[nearest].x, y: vec.y-this.stars[nearest].y }) > radius ) { return null }
		return nearest;
	}

	async next_stage() {
		await sleep(500);
		this.stars = [];
		this.selection = [];
		this.collected = 0;
		this.generate_random( ...this.level_size );

		if ( GameWrapper.motion > MOTION_FULL ) {
			for ( let x=0; x<50; x++ ) {
				this.physics( 20, true );
			}
			this.settle_stars( GameWrapper.motion < MOTION_MINIMUM );
		} else this.settle_stars( true );
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
			star.visx = (star.x - csize.width/2)*1.4 + csize.width/2;
			star.visy = (star.y - csize.height/2)*1.4 + csize.height/2;
			return star;
		}

		// Will do later
		/*function find_unpaired_stars() {
			const unpaired = [];
			for ( let star_a=0; star_a<this.stars.length; star_a++ ) {
				for ( let star_b=0; star_b<this.stars.length; star_b++ ) {
					
				}
			}
		}

		// Attempt to create pairs for existing stars.
		// Repair. Re-pair. Ha-ha, get it?
		const repaired: Array<Array<iStar>> = [];
		for ( let i=0; i<num_repairs; i++ ) {
			// Attempt to locate num_repairs number of unpaired stars, and create pairs for them.
		}*/

		// Create paired stars.
		const paired: Array<Array<iStar>> = [];
		for ( let i=0; i<num_paired; i++ ) {

			// Create a new bunch of stars. For every flag, determine if the flag is all different or all the same.
			// Pick a random starting point for every flag, then increment the different ones for every star.
			const pair_size			= 3 // randint( 2, 3 );
			const pair				= new Array(pair_size);

			const flags_unique		= randint( 0b000, 0b111 ) & 0b110;
			let pair_flag_inds		= Bytewise.random( FLAGS_MAX );
			
			for ( let star=0; star<pair_size; star++ ) {
				pair[star] = randpos({ x:0, y:0, flags:pair_flag_inds, velx:0, vely:0, collected:false, visx:0, visy:0, vscale:2, opacity:100 });
				for ( let flag=0; flag<3; flag++ )
					if ( (flags_unique>>flag) & 0b1 )
						pair_flag_inds = Bytewise.inc( pair_flag_inds, flag, Bytewise.get(FLAGS_RANGE, flag) );
						
			}

			paired.push( pair );
		}

		// Create random stars.
		const unpaired = new Array( num_unpaired );
		for ( let i=0; i<num_unpaired; i++ ) {
			unpaired[i] = randpos({ x:0, y:0, flags:Bytewise.random(FLAGS_MAX), velx:0, vely:0, collected:false, visx:0, visy:0, vscale:2, opacity:100 });
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

	physics( time_raw: number, force_motion=false ) {

		const time = time_raw|0;
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
				const nstar = this.nearest_colliding_star( star, star_ind, 72 );
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
				star.x += star.velx * time,
				star.y += star.vely * time;
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

		// TODO: WHAT THE FUCK???
		// ctx.fillStyle = '#111';
		// ctx.fillRect( 0, 0, this.canvas.width, this.canvas.height );

		if ( this.selection.length ) {
			ctx.strokeStyle = '#888';
			//ctx.lineWidth = this.dpi;
			
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

		for ( let star_ind=0; star_ind<this.stars.length; star_ind++ ) {
			const star = this.stars[star_ind];
			if ( star.opacity <= 0 ) { continue }

			// This is the part where things get awful
			let color = GameWrapper.colortable[ (star.flags>>8) & 0xf ];

			let infill = '';
			switch(star.flags & 0x0f0) {
				case 0x000:	infill = '100'; break;
				case 0x010:	infill = '50'; break;
				case 0x020:	infill = '0'; break;
			}

			let shape = '';
			switch(star.flags & 0xf) {
				case 0: shape = 'crc'; break;
				case 1: shape = 'sqr'; break;
			}

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

			ctx.filter = `hue-rotate(${color[0]}deg) saturate(${color[1]-(Math.min(color[2],50)-50)}%) brightness(${color[2]+100}%) opacity(${star.opacity}%)`;

			const canvas_pos = Vec2.new( star.visx, star.visy );
			const canvas_scale = rscale * this.dpi * GameWrapper.gamescale;
			Vec2.mult( canvas_pos, this.dpi );

			draw_sprite( ctx, `${shape}-fill${infill}`, canvas_pos.x-canvas_scale/2, canvas_pos.y-canvas_scale/2, canvas_scale, canvas_scale );
		}
	}
}