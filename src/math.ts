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
	static set( flags: number, index: number, value: number ) {
		if ( value < 0 || value > 15 || value%1 != 0 ) throw( `Expected int within range 0-15 for Bytewise.set(), received ${value} instead` );
		const bit_index = index*4;
		let out = flags;
		out -= flags & (0xf<<bit_index);
		out += value<<bit_index;
		return out;
	}

	static random( max: number ) {
		let out = 0;
		for ( let i=0; max>>i > 0; i+=4 ) {
			const digit = (max>>i) & 0xf;
			out += randint( 0, digit ) << i;
		}
		return out;
	}

	static get( flags: number, index: number ) {
		return (flags>>(index*4)) & 0xf;
 	}

	static inc( flags: number, index: number, max: number=0xf ) {
		// Currently, this function is just shorthand for get/set. Could be improved for speed later on.
		return Bytewise.set( flags, index, (Bytewise.get( flags, index )+1) % max );
	}
	
	static dec( flags: number, index: number, max: number=0xf ) {
		// Currently, this function is just shorthand for get/set. Could be improved for speed later on.
		return Bytewise.set( flags, index, (Bytewise.get( flags, index )-1) % max );
	}
}

export class Bitwise {

	static random( max: number ) {
		let out = 0;
		for ( let i=0; max>>i > 0; i++ ) {
			const digit = (max>>i) & 0b1;
			out += Math.round(Math.random()) << i;
		}
		return out;
	}

}