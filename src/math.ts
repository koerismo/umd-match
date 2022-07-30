interface i_Vec2 {
	x: number,
	y: number,
}

export function randint( min: number, max: number ): number {
	return min+Math.round(Math.random()*(max-min));
}

export function bitwise_random( max: number ) {
	let out = 0;
	for ( let i=0; max>>i > 0; i+=4 ) {
		const digit = (max>>i) & 0xf;
		out += randint( 0, digit ) << i;
	}
	return out;
}

export class Vec2 {
	static new( x: number, y: number ): i_Vec2 {
		return { x: x, y: y };
	}

	static add( vec: i_Vec2, x: number|i_Vec2, y: number|undefined ): void {
		if ( y === undefined ) {
			vec.x += x.x;
			vec.y += x.y;
			return;
		}

		vec.x += x;
		vec.y += y;
	}

	static c_add( vec: i_Vec2, x: number|i_Vec2, y: number|undefined ): i_Vec2 {
		const v = Vec2.copy(vec);
		Vec2.add( v, x, y );
		return v;
	}

	static pow( vec: i_Vec2, x: number|i_Vec2, y: number|undefined ): void {
		if ( y === undefined ) {
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

	static mult( vec: i_Vec2, x: number|i_Vec2, y: number|undefined ): void {
		if ( y === undefined ) {
			vec.x *= x.x;
			vec.y *= x.y;
			return;
		}

		vec.x *= x;
		vec.y *= y;
	}

	static copy( vec: i_Vec2 ): i_Vec2 {
		return { x: vec.x, y: vec.y }
	}
}