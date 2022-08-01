import { Vec2, i_Vec2, randint, Bitwise, Bytewise, randfloat } from './math.js';
import { Sheet, draw_sprite } from './sheet.js';
import './howler.js';

function sleep( millis: number ){return new Promise(r=>{setTimeout(r,millis)})};

/*
	struct flags {
		char	color
		char	fill
		char	shape
	}
*/

const sounds = {
	connect_succeed:	[
		new Howl({ src: '/assets/sound/connect_succeed1.mp3', volume: 0.5 }),
		new Howl({ src: '/assets/sound/connect_succeed2.mp3', volume: 0.5 }),
		new Howl({ src: '/assets/sound/connect_succeed3.mp3', volume: 0.5 }),
	],
	connect_fail:		new Howl({ src: '/assets/sound/connect_fail.mp3', volume: 0.5 }),
	complete:			new Howl({ src: '/assets/sound/complete.mp3' }),
	click:				new Howl({ src: '/assets/sound/click.mp3', volume: 0.2 }),
};

Howler.volume(0.4);
globalThis.sounds = sounds;

const FLAGS_RANGE = 0x332;
const FLAGS_MAX = 0x221;

const ACT_IDLE = 0,
      ACT_GRAB = 1,
      ACT_PAUSE = 2;

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

	mouse = { x: 0, y: 0, star_id: null };
	selection: Array<number> = [];
	action = ACT_IDLE;
	collected = 0;

	level_size: [number, number, number] = [ 0, 5, 0 ];
	
	static colortable: Array<[number, number, number]> = [
		// H    S    L
		[168, 100,  77],	// Cyan
		[0,   	0, 500],	// White
		[327, 100,  68],	// Pink
	];

	constructor( element: HTMLCanvasElement ) {
		this.stars	= [];
		this.canvas	= element;

		//@ts-ignore possibly null
		this.ctx = this.canvas.getContext('2d');
		if (this.ctx === null) throw('Context is null! This should never happen.');

		this.canvas.addEventListener( 'mousemove', e=>{ this.onmousemove(e) });
		this.canvas.addEventListener( 'mousedown', e=>{ this.onmousedown(e) });
	}

	onmousemove( e: MouseEvent ) {
		this.mouse.x = e.x,
		this.mouse.y = e.y;
		this.mouse.star_id = this.nearest_colliding_star( e );
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

	check_selected_pair() {
		const flags = Array(3);
		for ( let flag_ind=0; flag_ind<3; flag_ind++ ) {
			flags[flag_ind] = Array(this.selection.length);
			for ( let star_ind=0; star_ind<this.selection.length; star_ind++ ) {
				flags[flag_ind][star_ind] = Bytewise.get( this.stars[this.selection[star_ind]].flags, flag_ind );
			}
			const flags_as_set = new Set(flags[flag_ind]);
			if (flags_as_set.size !== 1 && flags_as_set.size !== this.selection.length) {return false}
		}
		return true;
	}

	onmousedown( e: MouseEvent ) {
		this.mouse.x = e.x,
		this.mouse.y = e.y;

		let star_ind: number|null = this.nearest_colliding_star( e );
		if ( star_ind === null ) {
			this.selection = [];
			this.action = ACT_IDLE;
			return;
		}

		if ( this.action === ACT_GRAB ) {
			// Add to existing selection
			if ( this.selection.includes(star_ind) ) { return }
			sounds.click.play();
			this.selection.push( star_ind );

			if ( this.selection.length == 3 ) {
				
				const is_valid = this.check_selected_pair();
				if ( !is_valid ) {
					this.selection = [];
					this.action = ACT_IDLE;
					sounds.connect_fail.play();
					return;
				}

				this.collected += this.selection.length;

				for ( let ind=0; ind<this.selection.length; ind++ ) {
					this.stars[this.selection[ind]].collected = true;

				}
				if ( this.collected == this.stars.length ) {
					sounds.complete.play();
					this.next_stage();
				}
				else {
				}
				sounds.connect_succeed[randint(0,sounds.connect_succeed.length-1)].play();
				this.selection = [];
				this.action = ACT_IDLE;
			}
		}
		else {
			// Begin new selection
			sounds.click.play();
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

		const canv = this.canvas;
		function randpos( star: iStar ) {
			star.x = randfloat(0.1,0.9)*canv.width;
			star.y = randfloat(0.1,0.9)*canv.height;
			star.visx = (star.x - canv.width/2)*1.4 + canv.width/2;
			star.visy = (star.y - canv.height/2)*1.4 + canv.height/2;
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
				pair[star] = randpos({ x:0, y:0, flags:pair_flag_inds, velx:0, vely:0, collected:false, visx:0, visy:0, vscale:2, opacity:1 });
				for ( let flag=0; flag<3; flag++ )
					if ( (flags_unique>>flag) & 0b1 )
						pair_flag_inds = Bytewise.inc( pair_flag_inds, flag, Bytewise.get(FLAGS_RANGE, flag) );
						
			}

			paired.push( pair );
		}

		// Create random stars.
		const unpaired = new Array( num_unpaired );
		for ( let i=0; i<num_unpaired; i++ ) {
			unpaired[i] = randpos({ x:0, y:0, flags:Bytewise.random(FLAGS_MAX), velx:0, vely:0, collected:false, visx:0, visy:0, vscale:2, opacity:1 });
		}

		// Apply new
		if (num_paired) {
			const flat_paired = paired.reduce((a,b)=>a.concat(b));
			Array.prototype.push.apply( this.stars, flat_paired );
		}
		Array.prototype.push.apply( this.stars, unpaired );
	}

	physics( time_raw: number ) {

		const time = time_raw|0;

		// shitty debug lines
		this.ctx.filter = 'none';
		this.ctx.strokeStyle = '#888';
		this.ctx.fillStyle = '#111';
		this.ctx.fillRect( 0, 0, this.canvas.width, this.canvas.height );

		for ( let star_ind=0; star_ind<this.stars.length; star_ind++ ) {
			const star = this.stars[star_ind];
			if ( !star.collected ) {
				const grav = Vec2.new( star.x-this.canvas.width/2, star.y-this.canvas.height/2 );
				const swirl_strength = 0.2 / Vec2.mag( grav )**0.6 + 0.03;
				Vec2.mult( grav, -0.0001, -0.0001 );
				star.velx += grav.x;
				star.vely += grav.y;

				const grav_swirl = Vec2.from_angle(Vec2.angle(grav)+1.571+0.2, swirl_strength);
				star.velx += grav_swirl.x;
				star.vely += grav_swirl.y;

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

			star.x = (star.x*6 + this.canvas.width/2) / 7;
			star.y = (star.y*6 + this.canvas.height/2) / 7;
			star.opacity *= 0.8;

			// const v = Vec2.new( star.x-this.mouse.x, star.y-this.mouse.y );
			// const mag = Vec2.mag(v);
			// if (mag < 100) {
			// 	Vec2.norm(v, (100-mag)**1.4/400);
			// 	star.velx += v.x;
			// 	star.vely += v.y;
			// }
			// const v2 = Vec2.new( star.x-this.canvas.width/2, star.y-this.canvas.height/2 );
			// Vec2.mult( v2, -0.001, -0.001 );
			// star.velx += v2.x;
			// star.vely += v2.y;

			// star.velx *= 0.99;
			// star.vely *= 0.99;
			// star.x += star.velx * time + Math.random()-0.5,
			// star.y += star.vely * time + Math.random()-0.5;
		}
	}

	render() {
		this.ctx.fillStyle = '#111';
		this.ctx.fillRect( 0, 0, this.canvas.width, this.canvas.height );

		if ( this.selection.length ) {
			this.ctx.strokeStyle = '#888';
			this.ctx.beginPath();
			const first = this.selection[0];
			this.ctx.moveTo( this.stars[first].visx, this.stars[first].visy );
			for ( let i=1; i<this.selection.length; i++ ) {
				this.ctx.lineTo( this.stars[this.selection[i]].visx, this.stars[this.selection[i]].visy );
			}
			if ( this.mouse.star_id === null ) {
				this.ctx.lineTo( this.mouse.x, this.mouse.y );
			} else {
				this.ctx.lineTo( this.stars[this.mouse.star_id].x, this.stars[this.mouse.star_id].y );
			}

			this.ctx.stroke();
		}

		for ( let star_ind=0; star_ind<this.stars.length; star_ind++ ) {
			const star = this.stars[star_ind];

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

			this.ctx.filter = `hue-rotate(${color[0]}deg) saturate(${color[1]-(Math.min(color[2],50)-50)}%) brightness(${color[2]+100}%) opacity(${star.opacity})`;
			draw_sprite( this.ctx, `${shape}-fill${infill}`, star.visx-rscale/2, star.visy-rscale/2, rscale, rscale );
		}
	}
}