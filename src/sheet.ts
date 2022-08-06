/* shit is JANK. FIX THIS BEFORE PRODUCTION! */

export const Sheet = {
	"sqr-fill100": { "x1": 0,	"y1": 0, "x2": 128,	"y2": 128 },
	"sqr-fill50":  { "x1": 128,	"y1": 0, "x2": 256,	"y2": 128 },
	"sqr-fill0":   { "x1": 256,	"y1": 0, "x2": 384,	"y2": 128 },

	"crc-fill100": { "x1": 0,	"y1": 128, "x2": 128,	"y2": 256 },
	"crc-fill50":  { "x1": 128,	"y1": 128, "x2": 256,	"y2": 256 },
	"crc-fill0":   { "x1": 256,	"y1": 128, "x2": 384,	"y2": 256 },

	"tri-fill100": { "x1": 0,	"y1": 256, "x2": 128,	"y2": 384 },
	"tri-fill50":  { "x1": 128,	"y1": 256, "x2": 256,	"y2": 384 },
	"tri-fill0":   { "x1": 256,	"y1": 256, "x2": 384,	"y2": 384 },
};

let image: HTMLImageElement|null = null;
export async function load_sheet( url: string ) {
	return new Promise( (resolve,reject) => {
		image = new Image();
		image.onload = ()=>{ resolve(null) };
		image.onerror = (e)=>{ reject(e) };
		image.src = url;
	});
}

export function draw_sprite( context: CanvasRenderingContext2D, name: string, x: number, y: number, w: number, h: number ) {
	const sprite = Sheet[name];
	if (sprite === undefined) {throw(`ValueError: Unrecognized sprite ${name}`)}
	context.drawImage( image, sprite.x1, sprite.y1, sprite.x2-sprite.x1, sprite.y2-sprite.y1, x, y, w, h );
}