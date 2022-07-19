'use strict';

/* =======================================
  This file contains information on every
  level in the game. This info is packed
  on compile.
======================================= */

export const NONE   = 0,
             LINEAR = 1,
             RADIAL = 2;

export const Levels = [
	// Example world marker
	{ world_id: 1, world_name: 'World 1' },

	// Example level marker
	{
		level_id: 0,
		level_name: 'A level',
		centerpoint: { x: 0, y: 0 },
		components: [
			{
				movement:	LINEAR,				// The movement type.				NONE|LINEAR|RADIAL
				min:		{ x: 20, y: 20 },	// Minimum position.				Vector|number|undefined
				max:		{ x: 20, y: 50 },	// Maximum position.				Vector|number|undefined

				shape:		[],					// An array of vert arrays.			Array<Array<Vec2>>
				handles:	[],					// An array of vert arrays.			Array<Array<Vec2>>|undefined
				children:	[],					// An array of child components.	Array<Object>|undefined
				
				// Each one of these components is translated into an obstacle in the active level.
				// TODO: Blender toolset for level creation?
			}
		]
	},

]