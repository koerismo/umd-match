/* Deprecated, but may be useful later on. */

export interface SpriteEntry {
	x1: number, y1: number,
	x2: number, y2: number,
	name: string,
}

export interface SpriteData extends SpriteEntry {
	data: ImageData
}

export class Sheet {

	static dissect( image: ImageData, entries: Array<SpriteEntry> ): Array<SpriteData> {
		const out = new Array( entries.length );
		for ( let sprite_id=0; sprite_id<entries.length; sprite_id++ ) {
			const sprite	= entries[sprite_id];
			const width		= sprite.x2 - sprite.x1;
			const area		= width * (sprite.y2-sprite.y1);
			const data		= new Uint8Array( area*4 );

			for ( let y=sprite.y1; y<sprite.y2; y++ ) {
				for ( let x=sprite.x1; x<sprite.x2; x++ ) {
					const i = (x+y*image.width) * 4;
					const o = ((x-sprite.x1)+(y-sprite.y1)*image.width) * 4;
					data[o] = image.data[i];
				}
			}

			out[sprite_id] = { ...sprite, data: data, };
		}

		return out;
	}
}