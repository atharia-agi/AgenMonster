
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const npm_execpath: string;
	export const CHROME_CRASHPAD_PIPE_NAME: string;
	export const npm_config_node_gyp: string;
	export const npm_config_init_module: string;
	export const IOLIBS: string;
	export const NO_PROXY: string;
	export const NODE_ENV: string;
	export const ALLUSERSPROFILE: string;
	export const APPDATA: string;
	export const OPENCODE_SERVER_USERNAME: string;
	export const OPENAI_API_KEY: string;
	export const CLAUDE_CODE_USE_OPENAI: string;
	export const npm_package_json: string;
	export const CAMLIBS: string;
	export const XDG_STATE_HOME: string;
	export const CLOUDFLARE_ACCOUNT_ID: string;
	export const CPLUS_INCLUDE_PATH: string;
	export const CLOUDFLARE_API_KEY: string;
	export const COLOR: string;
	export const EDITOR: string;
	export const CommonProgramFiles: string;
	export const DASHSCOPE_API_KEY: string;
	export const npm_config_local_prefix: string;
	export const CommonProgramW6432: string;
	export const npm_config_userconfig: string;
	export const COMPUTERNAME: string;
	export const USERNAME: string;
	export const ComSpec: string;
	export const JD2_HOME: string;
	export const CUDA_VISIBLE_DEVICES: string;
	export const OneDrive: string;
	export const C_EM64T_REDIST11: string;
	export const C_INCLUDE_PATH: string;
	export const DriverData: string;
	export const FPS_BROWSER_APP_PROFILE_STRING: string;
	export const NPM_PREFIX_JS: string;
	export const npm_config_noproxy: string;
	export const NPM_CLI_JS: string;
	export const HERMES_HOME: string;
	export const FPS_BROWSER_USER_PROFILE_STRING: string;
	export const GOPATH: string;
	export const npm_config_globalconfig: string;
	export const HERMES_GIT_BASH_PATH: string;
	export const npm_config_global_prefix: string;
	export const HOME: string;
	export const npm_package_version: string;
	export const HOMEDRIVE: string;
	export const HOMEPATH: string;
	export const TAURI_ENV_PLATFORM: string;
	export const npm_lifecycle_event: string;
	export const Path: string;
	export const OPENCODE_CLIENT: string;
	export const INIT_CWD: string;
	export const INTEL_DEV_REDIST: string;
	export const npm_package_name: string;
	export const LIB: string;
	export const LOCALAPPDATA: string;
	export const LOGONSERVER: string;
	export const MIC_LD_LIBRARY_PATH: string;
	export const NODE: string;
	export const NODE_EXE: string;
	export const npm_command: string;
	export const npm_config_cache: string;
	export const npm_config_npm_version: string;
	export const NPM_PREFIX_NPM_CLI_JS: string;
	export const npm_config_prefix: string;
	export const npm_config_strict_ssl: string;
	export const npm_config_user_agent: string;
	export const npm_lifecycle_script: string;
	export const npm_node_execpath: string;
	export const NUMBER_OF_PROCESSORS: string;
	export const OLLAMA_MAX_VRAM: string;
	export const OPENAI_MODEL: string;
	export const OLLAMA_MODEL: string;
	export const OneDriveConsumer: string;
	export const OPENAI_BASE_URL: string;
	export const OPENCLAW_HOME: string;
	export const OPENCODE_DISABLE_EMBEDDED_WEB_UI: string;
	export const OPENCODE_EXPERIMENTAL_FILEWATCHER: string;
	export const OPENCODE_EXPERIMENTAL_ICON_DISCOVERY: string;
	export const OPENCODE_SERVER_PASSWORD: string;
	export const OS: string;
	export const PATHEXT: string;
	export const PROCESSOR_ARCHITECTURE: string;
	export const PROCESSOR_IDENTIFIER: string;
	export const PROCESSOR_LEVEL: string;
	export const PROCESSOR_REVISION: string;
	export const __PSLockDownPolicy: string;
	export const ProgramData: string;
	export const ProgramFiles: string;
	export const ProgramW6432: string;
	export const PROMPT: string;
	export const PSModulePath: string;
	export const PUBLIC: string;
	export const SESSIONNAME: string;
	export const SystemDrive: string;
	export const SystemRoot: string;
	export const TAURI_CLI_VERBOSITY: string;
	export const TAURI_ENV_ARCH: string;
	export const TAURI_ENV_FAMILY: string;
	export const TAURI_ENV_PLATFORM_VERSION: string;
	export const TAURI_ENV_TARGET_TRIPLE: string;
	export const TAURI_GLOBALSHORTCUT_PLUGIN_CONFIG: string;
	export const TAURI_SYSTEMTRAY_PLUGIN_CONFIG: string;
	export const TAURI_UPDATER_PLUGIN_CONFIG: string;
	export const TEMP: string;
	export const TMP: string;
	export const USERDOMAIN: string;
	export const USERDOMAIN_ROAMINGPROFILE: string;
	export const USERPROFILE: string;
	export const windir: string;
	export const SVELTEKIT_FORK: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		npm_execpath: string;
		CHROME_CRASHPAD_PIPE_NAME: string;
		npm_config_node_gyp: string;
		npm_config_init_module: string;
		IOLIBS: string;
		NO_PROXY: string;
		NODE_ENV: string;
		ALLUSERSPROFILE: string;
		APPDATA: string;
		OPENCODE_SERVER_USERNAME: string;
		OPENAI_API_KEY: string;
		CLAUDE_CODE_USE_OPENAI: string;
		npm_package_json: string;
		CAMLIBS: string;
		XDG_STATE_HOME: string;
		CLOUDFLARE_ACCOUNT_ID: string;
		CPLUS_INCLUDE_PATH: string;
		CLOUDFLARE_API_KEY: string;
		COLOR: string;
		EDITOR: string;
		CommonProgramFiles: string;
		DASHSCOPE_API_KEY: string;
		npm_config_local_prefix: string;
		CommonProgramW6432: string;
		npm_config_userconfig: string;
		COMPUTERNAME: string;
		USERNAME: string;
		ComSpec: string;
		JD2_HOME: string;
		CUDA_VISIBLE_DEVICES: string;
		OneDrive: string;
		C_EM64T_REDIST11: string;
		C_INCLUDE_PATH: string;
		DriverData: string;
		FPS_BROWSER_APP_PROFILE_STRING: string;
		NPM_PREFIX_JS: string;
		npm_config_noproxy: string;
		NPM_CLI_JS: string;
		HERMES_HOME: string;
		FPS_BROWSER_USER_PROFILE_STRING: string;
		GOPATH: string;
		npm_config_globalconfig: string;
		HERMES_GIT_BASH_PATH: string;
		npm_config_global_prefix: string;
		HOME: string;
		npm_package_version: string;
		HOMEDRIVE: string;
		HOMEPATH: string;
		TAURI_ENV_PLATFORM: string;
		npm_lifecycle_event: string;
		Path: string;
		OPENCODE_CLIENT: string;
		INIT_CWD: string;
		INTEL_DEV_REDIST: string;
		npm_package_name: string;
		LIB: string;
		LOCALAPPDATA: string;
		LOGONSERVER: string;
		MIC_LD_LIBRARY_PATH: string;
		NODE: string;
		NODE_EXE: string;
		npm_command: string;
		npm_config_cache: string;
		npm_config_npm_version: string;
		NPM_PREFIX_NPM_CLI_JS: string;
		npm_config_prefix: string;
		npm_config_strict_ssl: string;
		npm_config_user_agent: string;
		npm_lifecycle_script: string;
		npm_node_execpath: string;
		NUMBER_OF_PROCESSORS: string;
		OLLAMA_MAX_VRAM: string;
		OPENAI_MODEL: string;
		OLLAMA_MODEL: string;
		OneDriveConsumer: string;
		OPENAI_BASE_URL: string;
		OPENCLAW_HOME: string;
		OPENCODE_DISABLE_EMBEDDED_WEB_UI: string;
		OPENCODE_EXPERIMENTAL_FILEWATCHER: string;
		OPENCODE_EXPERIMENTAL_ICON_DISCOVERY: string;
		OPENCODE_SERVER_PASSWORD: string;
		OS: string;
		PATHEXT: string;
		PROCESSOR_ARCHITECTURE: string;
		PROCESSOR_IDENTIFIER: string;
		PROCESSOR_LEVEL: string;
		PROCESSOR_REVISION: string;
		__PSLockDownPolicy: string;
		ProgramData: string;
		ProgramFiles: string;
		ProgramW6432: string;
		PROMPT: string;
		PSModulePath: string;
		PUBLIC: string;
		SESSIONNAME: string;
		SystemDrive: string;
		SystemRoot: string;
		TAURI_CLI_VERBOSITY: string;
		TAURI_ENV_ARCH: string;
		TAURI_ENV_FAMILY: string;
		TAURI_ENV_PLATFORM_VERSION: string;
		TAURI_ENV_TARGET_TRIPLE: string;
		TAURI_GLOBALSHORTCUT_PLUGIN_CONFIG: string;
		TAURI_SYSTEMTRAY_PLUGIN_CONFIG: string;
		TAURI_UPDATER_PLUGIN_CONFIG: string;
		TEMP: string;
		TMP: string;
		USERDOMAIN: string;
		USERDOMAIN_ROAMINGPROFILE: string;
		USERPROFILE: string;
		windir: string;
		SVELTEKIT_FORK: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
