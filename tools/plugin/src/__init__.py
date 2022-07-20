import bpy
from bpy_extras.io_utils import ExportHelper
from .compile import compile_worlds
from .interface import DropletInfoPanel, MinToCurrent, MaxToCurrent
import json

bl_info = {
	'name':			'Droplet Toolset',
	'description':	'A small set of tools for creating Droplet worlds.',
	'author':		'Jadon L',
	'version':		( 0, 0, 1 ),
	'blender':		( 3, 1, 2 ),
	'category':		'Import-Export',
}

class DropletExporter( bpy.types.Operator, ExportHelper ):
	bl_idname = 'droplet.level_export'
	bl_label  = 'Export Droplet Level'
	filename_ext = '.json'

	def execute( self, ctx ):
		try:
			worlds = compile_worlds( self, ctx )
			with open( self.filepath, 'w' ) as file:
				file.write( json.dumps(worlds) )
		except Exception as e:
			self.report(e)
			return {'FAILED'}
			
		return {'FINISHED'}


def draw_exporter_option( self: bpy.types.Menu, ctx: bpy.types.Context ):
	self.layout.operator( DropletExporter.bl_idname, text=DropletExporter.bl_label )


def register():
	try:
		bpy.utils.register_class(DropletExporter)
		bpy.utils.register_class(DropletInfoPanel)
		bpy.types.TOPBAR_MT_file_export.append(draw_exporter_option)
		bpy.types.Object.droplet_movetype = bpy.props.EnumProperty( name='Droplet Movetype', default=0, items=[
			( 'none',		'None',		'' ),
			( 'linear',		'Linear',	'' ),
			( 'radial',		'Radial',	'' ),
			( 'dynamic',	'Dynamic',	'' )
		])

		bpy.utils.register_class(MinToCurrent)
		bpy.utils.register_class(MaxToCurrent)

		bpy.types.Object.droplet_linear_min = bpy.props.FloatVectorProperty( name='Droplet Linear Min', default=(0,0), size=2 )
		bpy.types.Object.droplet_linear_max = bpy.props.FloatVectorProperty( name='Droplet Linear Max', default=(0,0), size=2 )

		bpy.types.Object.droplet_radial_min = bpy.props.FloatProperty( name='Droplet Radial Min' )
		bpy.types.Object.droplet_radial_max = bpy.props.FloatProperty( name='Droplet Radial Max' )

	except Exception as e:
		print('--- AN ERROR OCCURRED ---', e)
		unregister()

def unregister():
	bpy.types.TOPBAR_MT_file_export.remove(draw_exporter_option)
	bpy.utils.unregister_class(MinToCurrent)
	bpy.utils.unregister_class(MaxToCurrent)
	bpy.utils.unregister_class(DropletExporter)
	bpy.utils.unregister_class(DropletInfoPanel)


if __name__ == '__main__':
	register()