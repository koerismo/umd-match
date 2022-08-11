/* shit is JANK. FIX THIS BEFORE PRODUCTION! */
import { Bytewise } from './math.js';

let image: HTMLImageElement|null = null;
export async function load_sheet( url: string ) {
	image = await load_image( url ) as HTMLImageElement;
}

export async function load_image( url: string ) {
	return new Promise( (resolve,reject) => {
		let img = new Image();
		img.onload = ()=>{ resolve(img) };
		img.onerror = (e)=>{ reject(e) };
		img.src = url;
	});
}

const tilesize = 128;
export function draw_sprite( context: CanvasRenderingContext2D, flags: number, x: number, y: number, w: number, h: number ) {
	const pos_y = Bytewise.get(flags, 0) * tilesize;
	const pos_x = Bytewise.get(flags, 2) * tilesize*3 + Bytewise.get(flags, 1) * tilesize;
	if ( pos_y > tilesize*2 || pos_x > tilesize*8 ) throw( `ValueError: Star has invalid flags! Position resides outside boundaries (${pos_x},${pos_y})` );
	context.drawImage( image, pos_x, pos_y, tilesize, tilesize, x, y, w, h );
}