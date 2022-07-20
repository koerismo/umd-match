import bpy
from bpy_extras.io_utils import ExportHelper
from . import constants

def compile_worlds( self: bpy.types.Operator|ExportHelper, ctx: bpy.types.Context ):
	''' Read Blender context and compile into a droplet-compatible JSON. '''

	out_worlds = []
	ctx_worlds: list[bpy.types.Collection] = [ col for col in ctx.scene.collection.children if not col.name.startswith('_') ]
	print( f'Found {len(ctx_worlds)} worlds.' )

	for world in ctx_worlds:
		out_levels = []
		ctx_levels: list[bpy.types.Object] = [ obj for obj in world.objects if obj.parent == None ]
		
		for level in ctx_levels: out_levels.append( compile_level(level) )
		out_worlds.append({
			'name':		world.name,
			'levels':	out_levels,
		})

	return out_worlds


def compile_level( container: bpy.types.Object ):
	''' Read a level object and compile into a droplet-compatible JSON. '''
	
	levelinfo = { 'name': container.name }
	components = []

	component: bpy.types.Object
	for component in container.children:
		if component.name == '_START':	continue
		if component.name == '_END':	continue
		components.append( compile_component(component) )
	
	levelinfo['components'] = components
	return levelinfo


def compile_mesh( mesh: bpy.types.Mesh ):
	polygon = mesh.polygons[0]
	vertices	= [ mesh.vertices[i] for i in polygon.vertices ]
	compiled	= [ vert.co[:2] for vert in vertices ]
	return compiled

def compile_component( component: bpy.types.Object ):
	mesh: bpy.types.Mesh = component.data

	# Get shape
	if mesh is None: raise ValueError( f'Component {component.name} has no mesh!' )
	if len(mesh.polygons) != 1: raise ValueError( f'Component {component.name} must have one polygon!' )
	dest_polys	= compile_mesh( mesh )

	# Get position
	dest_pos	= component.location[:2]
	dest_rot	= component.rotation_euler[2]

	# Get movement information
	dest_movetype	= constants.MOVEMENT[component.droplet_movetype]
	dest_min	= None
	dest_max	= None
	
	if dest_movetype == constants.LINEAR:
		dest_min, dest_max = list(component.droplet_linear_min), list(component.droplet_linear_max)
	elif dest_movetype == constants.RADIAL:
		dest_min, dest_max = component.droplet_radial_min, component.droplet_radial_max

	# Get parent
	dest_parent = component.droplet_parent.name if component.droplet_parent else None

	# TODO:
	# [X] Detect handle(s)
	# [X] Get min/max, rotational type
	# [X] Handle parenting
	# [ ] springs and constraints

	# Get handles
	dest_handles	= []
	for child in component.children:
		if child.name.startswith('_HANDLE'):
			dest_handles.append(compile_mesh(child.data))
	
	# Put data into dict
	componentinfo = {
		'name':		component.name,
		'position':	dest_pos,
		'rotation':	dest_rot,
		'movement':	dest_movetype,
		'shape':	dest_polys,
	}

	if dest_movetype != constants.NONE:
		componentinfo['handles']	= dest_handles

		if dest_movetype != constants.DYNAMIC:
			componentinfo['parent']	= dest_parent
	
			if dest_min != dest_max:
				componentinfo['min']	= dest_min
				componentinfo['max']	= dest_max

	return componentinfo