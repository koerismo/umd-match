'use strict';

/* =======================================
  This file contains information on every
  level in the game. This info is packed
  on compile.
======================================= */

export const NONE    = 0,
             LINEAR  = 1,
             RADIAL  = 2,
			 DYNAMIC = 3;

export const Levels = [
	// Example world marker
	{ world_id: 1, world_name: 'World 1' },

	// Example level marker
	{
		level_id: 0,
		level_name: 'A level',
		center: { x: 0, y: 0 },
		components: [
			{
				name:		'name',				// A unique identifier.				string
				parent:		'othername',		// This object's parent.			string|null
				movement:	LINEAR,				// The movement type.				NONE|LINEAR|RADIAL
				min:		{ x: 20, y: 20 },	// Minimum position.				Vector|float|null
				max:		{ x: 20, y: 50 },	// Maximum position.				Vector|float|null
				location:	{ x: 50, y: 50 },	// Position of object in level.		Vector
				rotation:	0.0,				// Rotation of object in level.		float


				// TODO: These won't be ready by the next meeting(s). Implement later!
				spring_enable:	true,			// Whether to pull/push the object to a certain point in its arc
				spring_force:	4,				// The force of the spring.
				spring_target:	0.5,			// The spring target

				shape:		[],					// An array of vert arrays.			Array<Array<Vec2>>
				handles:	[],					// An array of vert arrays.			Array<Array<Vec2>>
				children:	[],					// An array of child components.	Array<Object>
				
				// Each one of these components is translated into an obstacle in the active level.
				// TODO: Blender toolset for level creation?
			}
		]
	},

]