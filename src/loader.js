'use strict';

/* =======================================
  This script is used to read level data
  from the _worlds.json file and produce
  Matter scenes.
======================================= */

import _data from './_world_debug.json';
import * as constants from './constants.js';
import { Composite, Bodies, Body, World, Constraint, Vertices, Bounds, Vector } from 'matter-js';

export function listWorlds() {
	return _data.map( world=>world.name );
}

export function listLevels( worldID ) {
	return _data[worldID].levels.map( level=>level.name );
}

// This function *should* correct for the auto-recentering that the original performs.
// https://github.com/liabru/matter-js/blob/master/src/body/Body.js#L346-L369
function fromVertices( x, y, shape, opts ) {
	
	const body = Bodies.fromVertices( 0, 0, shape, opts );
	for (let part_id in body.parts) {
		let part = body.parts[part_id];

		const real_bounds = Bounds.create(shape[part_id]);
		const vec_diff = Vector.sub(real_bounds.min, part.bounds.min);
		Vertices.translate(part.vertices, vec_diff);
        Bounds.update(part.bounds, part.vertices, part.velocity);
	}
	Body.setPosition( body, { x:x, y:y } );
	return body;
}

function cX( v ) { return v*scale + offsetX }
function cY( v ) { return v*scale + offsetY }

var offsetX, offsetY, scale;
export function loadLevel( engine, worldID, levelID, aoffsetX, aoffsetY, ascale ) {
	offsetX = aoffsetX, offsetY = aoffsetY, scale = ascale;
	//Composite.clear( engine.world, false, true );

	const level = _data[worldID].levels[levelID];
	const bodies = [];

	function convertPolys( polys ) {
		return polys.map( poly => poly.map( vert => Object({ x: cX(vert[0]), y: cY(vert[1]) }) ))
	}

	for (let component of level.components) {
		const shape = fromVertices(
			...component.position,
			convertPolys(component.shape),
			{ 'droplet_name': component.name, 'isStatic': component.movement == constants.NONE || true },
		);

		// Handles
		//const handle = fromVertices(...component.position, convertPolys(component.handle));
		//Body.setParts( shape, [handle] );

		// Radial constraint
		if (component.movement == constants.RADIAL && false) {
			const pin = Constraint.create({
				'type': 'pin',
				'bodyA': null,
				'bodyB': shape,

				'pointA': { x: cX(component.position[0]), y: cY(component.position[1]) },
				'pointB': { x: 0, y: 0 },
				'length': 0,
			});
			bodies.push( pin );
		}

		// TODO: Linear constraints

		bodies.push( shape );
	}

	Composite.add( engine.world, bodies );
}