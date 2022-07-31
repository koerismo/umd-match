import { Vec2, randint, bitwise_random } from './math.js';
import { Sheet, draw_sprite } from './sheet.js';

/*
	struct flags {
		char	color
		char	fill
		char	shape
	}
*/

const FLAGS_RANGE = 0x332;
const FLAGS_MAX = 0x221;

interface iStar {
	vx:		number,
	vy:		number,

	x:		number,
	y:		number,
	flags:	number,
}

export class GameWrapper {

	stars:	Array<iStar> = [];
	canvas:	HTMLCanvasElement;
	ctx:	CanvasRenderingContext2D;
	mouse = { x: 0, y: 0 };
	
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

		this.canvas.addEventListener( 'mousemove', e=>{
			this.mouse.x = e.x,
			this.mouse.y = e.y;
		});
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
			star.x = Math.random()*canv.clientWidth;
			star.y = Math.random()*canv.clientHeight;
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

			const flags_unique		= randint( 0b000, 0b111 );
			let pair_flag_inds		= bitwise_random( FLAGS_MAX );
			console.log('Creating pair with start point ', pair_flag_inds.toString(16) )

			// This is some of the worst code i have written in a while.
			// Apologies to anyone that has to maintain this later down the line!
			function increment_flag_at_pos( pos: number ) {
				const f_orig_value	= (pair_flag_inds >> (pos*4)) & 0xf;
				const f_max_value	= (FLAGS_MAX >> (pos*4)) & 0xf;
				const f_new_value	= (f_orig_value+1) % f_max_value;
				pair_flag_inds += (f_new_value<<(pos*4)) - (f_orig_value<<(pos*4));
			}
			
			for ( let star=0; star<pair_size; star++ ) {
				console.log('Created star with flags ', pair_flag_inds.toString(16) )
				pair[star] = randpos({ x:0, y:0, flags:pair_flag_inds, vx:0, vy:0, });
				for ( let flag=0; flag<3; flag++ )
					if ( flags_unique>>flag & 0b1 )
						increment_flag_at_pos( flag );
			}

			paired.push( pair );
		}

		// Create random stars.
		const unpaired = new Array( num_unpaired );
		for ( let i=0; i<num_unpaired; i++ ) {
			unpaired[i] = randpos({ x:0, y:0, flags:bitwise_random(FLAGS_MAX), vx: 0, vy: 0, });
		}

		// Apply new
		if (num_paired) {
			const flat_paired = paired.reduce((a,b)=>a.concat(b));
			Array.prototype.push.apply( this.stars, flat_paired );
		}
		Array.prototype.push.apply( this.stars, unpaired );
	}

	physics( time: number ) {

		// shitty debug lines
		this.ctx.filter = 'none';
		this.ctx.strokeStyle = '#888';
		this.ctx.fillStyle = '#111';
		this.ctx.fillRect( 0, 0, this.canvas.width, this.canvas.height );

		for ( let star of this.stars ) {
			const v = Vec2.new( star.x-this.mouse.x, star.y-this.mouse.y );
			const mag = Vec2.mag(v);
			if (mag < 100) {
				Vec2.norm(v, (100-mag)**1.4/400);
				star.vx += v.x;
				star.vy += v.y;
				this.ctx.beginPath();
				this.ctx.moveTo( this.mouse.x, this.mouse.y );
				this.ctx.lineTo( star.x, star.y );
				this.ctx.stroke();
			}
			const v2 = Vec2.new( star.x-this.canvas.width/2, star.y-this.canvas.height/2 );
			Vec2.mult( v2, -0.001, -0.001 );
			star.vx += v2.x;
			star.vy += v2.y;

			star.vx *= 0.99;
			star.vy *= 0.99;
			star.x += star.vx * time + Math.random()-0.5,
			star.y += star.vy * time + Math.random()-0.5;
		}
	}

	render() {
		// this.ctx.fillStyle = '#111';
		// this.ctx.fillRect( 0, 0, this.canvas.clientWidth, this.canvas.clientHeight );
		this.ctx.fillStyle = '#fff';
		for ( let star of this.stars ) {

			// This is the part where things get awful
			let color = GameWrapper.colortable[ (star.flags>>8) & 0xf ];

			let infill = '';
			//console.log( 'color', (star.flags & 0xf00) >> 8, 'infill', (star.flags & 0x0f0) >> 4, 'shape', star.flags & 0x00f)
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

			this.ctx.filter = `hue-rotate(${color[0]}deg) saturate(${color[1]-(Math.min(color[2],50)-50)}%) brightness(${color[2]+100}%)`;
			draw_sprite( this.ctx, `${shape}-fill${infill}`, star.x-16, star.y-16, 32, 32 );
		}
	}
}