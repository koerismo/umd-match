import bpy


class MinToCurrent( bpy.types.Operator ):
	bl_label		= 'Set Min'
	bl_idname		= 'droplet.set_min_current'
	bl_description	= 'Set the minimum to the current value.'

	def execute( self, ctx: bpy.types.Context ):
		object = bpy.context.object
		match object.droplet_movetype:
			case 'none':
				return {'CANCELLED'}
			case 'linear':
				object.droplet_linear_min = object.location[:2]
			case 'radial':
				object.droplet_radial_min = object.rotation_euler[2]
		
		return {'FINISHED'}

class MaxToCurrent( bpy.types.Operator ):
	bl_label		= 'Set Max'
	bl_idname		= 'droplet.set_max_current'
	bl_description	= 'Set the maximum to the current value.'

	def execute( self, ctx: bpy.types.Context ):
		object = bpy.context.object
		match object.droplet_movetype:
			case 'none':
				return {'CANCELLED'}
			case 'linear':
				object.droplet_linear_max = object.location[:2]
			case 'radial':
				object.droplet_radial_max = object.rotation_euler[2]
		
		return {'FINISHED'}


class DropletInfoPanel( bpy.types.Panel ):
	bl_idname		= 'OBJECT_PT_menu_droplet_info'
	bl_label		= 'Droplet Info'
	bl_category		= 'object'
	bl_space_type	= 'PROPERTIES'
	bl_region_type	= 'WINDOW'
	bl_context		= 'object'

	@classmethod
	def poll( cls, ctx: bpy.types.Context ):
		return not ctx.object.name.startswith('_')

	def draw( self, ctx: bpy.types.Context ):
		layout = self.layout
		collections = bpy.context.object.users_collection
		object = bpy.context.object

		if object.parent == None:
			layout.label(text='Level Info')
			layout.label(text='World: '+collections[0].name)
			layout.label(text='Level: '+object.name)
			return


		layout.prop( object, 'droplet_movetype', expand=True )

		if object.droplet_movetype == 'radial':
			layout.prop( object, 'droplet_radial_min', text='Angle Min' )
			layout.prop( object, 'droplet_radial_max', text='Angle Max' )

		if object.droplet_movetype == 'linear':
			layout.prop( object, 'droplet_linear_min', text='Position Min' )
			layout.prop( object, 'droplet_linear_max', text='Position Max' )

		if object.droplet_movetype not in { 'none', 'dynamic' }:
			row = layout.row()
			row.operator( 'droplet.set_min_current' )
			row.operator( 'droplet.set_max_current' )
			layout.prop( object, 'droplet_parent' )