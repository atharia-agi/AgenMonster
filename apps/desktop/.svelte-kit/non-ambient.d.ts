
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>
		};
		Pathname(): "/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.ico" | "/favicon.png" | "/fonts/1up.ttf" | "/fonts/Players-Bold.ttf" | "/fonts/Players-BoldItalic.ttf" | "/fonts/Players-Italic.ttf" | "/fonts/Players.ttf" | "/fonts/PlayersCollege-Italic.ttf" | "/fonts/PlayersCollege.ttf" | "/img/sprites/frames.json" | "/img/sprites/seed.json" | "/img/sprites/stages/adult.json" | "/img/sprites/stages/baby.json" | "/img/sprites/stages/child.json" | "/img/sprites/stages/egg.json" | "/img/sprites/stages/hatchling.json" | "/img/sprites/stages/mega.json" | "/img/sprites/stages/teen.json" | "/img/sprites/stages.json" | "/img/sprites/stages.ts" | string & {};
	}
}