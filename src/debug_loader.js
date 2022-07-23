'use strict';

/* =======================================
  Matter test script. Remove later!
======================================= */

import Matter, { Engine, Render, Runner, Bodies, Body, Composite, MouseConstraint, Mouse, World, Vector } from 'matter-js';
import MatterAttractors from 'matter-attractors';
import { listWorlds, listLevels, loadLevel } from './loader.js';

globalThis.listWorlds = listWorlds,
globalThis.listLevels = listLevels;

// Register attractors plugin and init canvas
Matter.use( MatterAttractors );
const canvas = document.querySelector('canvas#main');
const width = canvas.offsetWidth,
      height = canvas.offsetHeight;

// Init engine & renderer
const engine = Engine.create();
engine.gravity.scale = 0;

const render = Render.create({
	engine:	engine,
	canvas:	canvas,
	options: {
		width:	width,
		height:	height,
		wireframes: true,
		pixelRatio: 'auto',
		'showPositions': true,
		'showBounds': true,
		'showPerformance': true,
	}
});

Composite.add( engine.world, [
	Bodies.polygon( width/2, height/2, 0, 0, { // Gravity origin
		isStatic: true,
		plugin: {
			attractors: [
				/**
				 * 
				 * @param {Body} self 
				 * @param {Body} body 
				 * @returns 
				 */
				function(self, body) {
					let force = {
						x: (body.position.x - self.position.x),
						y: (body.position.y - self.position.y),
					};

					const mag = Vector.magnitude(force);
					if (mag < 5) {return null}

					const intensity = 0.03;
					const calculated_intensity = -Math.min(mag*0.002, 0.05)*intensity*body.mass;
					Body.applyForce( body, body.position, Vector.mult(Vector.normalise(force), calculated_intensity) );
				}
			]
		}
	}),
]);

//loadLevel( engine, 0, 0, width/2, height/2, 200 );

// Place a bunch of random shapes
const random_shapes = [];
for (let x=0; x<50; x++) random_shapes.push(Bodies.polygon( width*Math.random(), height*Math.random(), Math.round(Math.random()*8+3), Math.random()*20+5 ))
Composite.add( engine.world, random_shapes );

// Create mouse constraint
const mouse = Mouse.create( canvas );
const mousecon = MouseConstraint.create( engine, {mouse: mouse} );
mousecon.constraint.stiffness = 0.05; // TODO: Improve constraint tuning
mousecon.constraint.damping = 1.5;
World.add( engine.world, mousecon );

// Start renderer and engine runner
Render.run( render );
const runner = Runner.create();
Runner.run( runner, engine );