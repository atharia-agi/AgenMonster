export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.ico","favicon.png","fonts/1up.ttf","fonts/Players-Bold.ttf","fonts/Players-BoldItalic.ttf","fonts/Players-Italic.ttf","fonts/Players.ttf","fonts/PlayersCollege-Italic.ttf","fonts/PlayersCollege.ttf","img/sprites/frames.json","img/sprites/seed.json","img/sprites/stages/adult.json","img/sprites/stages/baby.json","img/sprites/stages/child.json","img/sprites/stages/egg.json","img/sprites/stages/hatchling.json","img/sprites/stages/mega.json","img/sprites/stages/teen.json","img/sprites/stages.json","img/sprites/stages.ts"]),
	mimeTypes: {".png":"image/png",".ttf":"font/ttf",".json":"application/json",".ts":"video/mp2t"},
	_: {
		client: {start:"_app/immutable/entry/start.CtvxFM64.js",app:"_app/immutable/entry/app.xJXYUMOg.js",imports:["_app/immutable/entry/start.CtvxFM64.js","_app/immutable/chunks/D62m1UPn.js","_app/immutable/chunks/BNw52l3A.js","_app/immutable/chunks/Cj_U5Lu7.js","_app/immutable/chunks/DFp5Xer6.js","_app/immutable/chunks/CBVY9ev-.js","_app/immutable/entry/app.xJXYUMOg.js","_app/immutable/chunks/DFp5Xer6.js","_app/immutable/chunks/Cj_U5Lu7.js","_app/immutable/chunks/BNw52l3A.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js'))
		],
		remotes: {
			
		},
		routes: [
			
		],
		prerendered_routes: new Set(["/"]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
