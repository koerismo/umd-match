export class EventSynchronizer {

	hlist: Array<string> = [];
	hooks: Object = {};
	info: Object = {};

	constructor() {}

	add( event:string, func:Function ) {
		this.hlist.push(event);
		this.hooks[event] = func;
		this.info[event] = null;
	}

	emit( event:string, args:Event ) {
		this.info[event] = args;
	}

	serve() {
		for ( let i=0; i<this.hlist.length; i++ ) {
			const hook = this.hlist[i];
			if (this.info[hook]) {
				this.hooks[hook](this.info[hook]);
				this.info[hook] = null;
			}
		}
	}
}