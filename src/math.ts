export interface i_Vec2 {
	x: number,
	y: number,
}

export function randint( min: number, max: number ): number {
	return min+Math.round(Math.random()*(max-min));
}

export function randfloat( min: number, max: number ): number {
	return min+Math.random()*(max-min);
}

export class Vec2 {
	static new( x: number, y: number ): i_Vec2 {
		return { x: x, y: y };
	}

	static from_angle( angle: number, magnitude: number=1 ) {
		return {
			x: Math.cos(angle) * magnitude,
			y: Math.sin(angle) * magnitude,
		}
	}

	static angle( vec: i_Vec2 ) {
		return Math.atan( vec.y/vec.x ) + Math.PI * (vec.x<0);
	}

	static add( vec: i_Vec2, x: number|i_Vec2, y: number|undefined=undefined ): void {
		if ( y === undefined ) {
			if ( typeof x == 'number' ) {
				vec.x += x;
				vec.y += x;
				return;
			}
			vec.x += x.x;
			vec.y += x.y;
			return;
		}
		vec.x += x;
		vec.y += y;
	}

	static sub( vec: i_Vec2, x: number|i_Vec2, y: number|undefined=undefined ): void {
		if ( y === undefined ) {
			if ( typeof x == 'number' ) {
				vec.x -= x;
				vec.y -= x;
				return;
			}
			vec.x -= x.x;
			vec.y -= x.y;
			return;
		}
		vec.x -= x;
		vec.y -= y;
	}

	static c_add( vec: i_Vec2, x: number|i_Vec2, y: number|undefined=undefined ): i_Vec2 {
		const v = Vec2.copy(vec);
		Vec2.add( v, x, y );
		return v;
	}

	static pow( vec: i_Vec2, x: number|i_Vec2, y: number|undefined=undefined ): void {
		if ( y === undefined ) {
			if ( typeof x == 'number' ) {
				vec.x **= x;
				vec.y **= x;
				return;
			}
			vec.x **= x.x;
			vec.y **= x.y;
			return;
		}

		vec.x **= x;
		vec.y **= y;
	}

	static mag( vec: i_Vec2 ) {
		return Math.sqrt(vec.x**2 + vec.y**2);
	}

	static norm( vec: i_Vec2, intensity: number = 1 ) {
		const d = Vec2.mag(vec) / intensity;
		vec.x /= d;
		vec.y /= d;
	}

	static mult( vec: i_Vec2, x: number|i_Vec2, y: number|undefined=undefined ): void {
		if ( y === undefined ) {
			if ( typeof x == 'number' ) {
				vec.x *= x;
				vec.y *= x;
				return;
			}
			vec.x *= x.x;
			vec.y *= x.y;
			return;
		}

		vec.x *= x;
		vec.y *= y;
	}

	static div( vec: i_Vec2, x: number|i_Vec2, y: number|undefined=undefined ): void {
		if ( y === undefined ) {
			if ( typeof x == 'number' ) {
				vec.x /= x;
				vec.y /= x;
				return;
			}
			vec.x /= x.x;
			vec.y /= x.y;
			return;
		}

		vec.x /= x;
		vec.y /= y;
	}

	static copy( vec: i_Vec2 ): i_Vec2 {
		return { x: vec.x, y: vec.y }
	}
}

export class Bytewise {
	/** Sets a value at the specified index. */
	static set( flags: number, index: number, value: number ) {
		if ( value < 0 || value > 15 || value%1 != 0 ) throw( `Expected int within range 0-15 for Bytewise.set(), received ${value} instead` );
		const bit_index = index*4;
		let out = flags;
		out -= flags & (0xf<<bit_index);
		out += value<<bit_index;
		return out;
	}

	/** Generates a per-byte-random number that always falls within the provided max. */
	static random( max: number ) {
		let out = 0;
		for ( let i=0; max>>i > 0; i+=4 ) {
			const digit = (max>>i) & 0xf;
			out += randint( 0, digit ) << i;
		}
		return out;
	}

	/** Gets a value at the specified index. */
	static get( flags: number, index: number ) {
		return (flags>>(index*4)) & 0xf;
 	}

	/** Increments the value at the specified index. */
	static inc( flags: number, index: number, max: number=0xf ) {
		// Currently, this function is just shorthand for get/set. Could be improved for speed later on.
		return Bytewise.set( flags, index, (Bytewise.get( flags, index )+1) % max );
	}
	
	/** Decrements the value at the specified index. */
	static dec( flags: number, index: number, max: number=0xf ) {
		// Currently, this function is just shorthand for get/set. Could be improved for speed later on.
		return Bytewise.set( flags, index, (Bytewise.get( flags, index )-1) % max );
	}

	/** Takes two sets of flags, and returns a bitwise comparison result. ex: (0xff0, 0x0f0) --> 0b010 */
	static eq( a: number, b: number ) {
		let out = 0;
		for ( let i=0; a>>i > 0; i+=4 ) {
			const digita = (a>>i) & 0xf;
			const digitb = (b>>i) & 0xf;
			out += +(digita===digitb) << (i/4);
		}
		return out;
	}

	/** THIS IS A SPECIALIZED FUNCTION! It does the following for each flag:
	 ** If A == B, OUT = A
	 ** If A != B, OUT != A != B
	 ** FLAGS_MAX is unused, as this function uses dirty hacks to make it work.
	*/
	static star_compare( a: number, b: number ) {
		let out = 0;
		const max = a|b;
		for ( let i=0; max>>i > 0; i+=4 ) {
			const digita = (a>>i) & 0xf;
			const digitb = (b>>i) & 0xf;
			let digitc: number = null;

			// this logic is REALLY bad, since it assumes that each flag only has 3 possible states.
			// DO NOT USE ANYWHERE OTHER THAN STAR COMPARISON!
			if (digita == digitb) { digitc = digita; }
			else {
				if ((digita == 0 && digitb == 1) || (digitb == 0 && digita == 1)) digitc = 2;
				if ((digita == 0 && digitb == 2) || (digitb == 0 && digita == 2)) digitc = 1;
				if ((digita == 1 && digitb == 2) || (digitb == 1 && digita == 2)) digitc = 0;
			}

			if (digitc === null) throw( `Star comparison critical error! DIGITA=${digita}, DIGITB=${digitb}` );
			out += digitc<<i;
		}
		return out;
	}
}

export class Bitwise {

	/** Generates a per-bit random number that always falls within the provided max. */
	static random( max: number ) {
		let out = 0;
		for ( let i=0; max>>i > 0; i++ ) {
			if (((max>>i) & 0b1) === 0) continue;
			out += Math.round(Math.random()) << i;
		}
		return out;
	}

	/** Inverts the number per-bit. ex: 0b1010 --> 0b0101 */
	static invert( value: number ) {
		let max = 0;
		for ( let i=0; value>>i > 0; i++ ) max += 1<<i;
		return value ^ max;
	}

}