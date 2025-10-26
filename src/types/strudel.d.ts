declare module '@strudel/core' {
  export function repl(config?: any): any
  export function sequence(...args: any[]): any
  export function stack(...args: any[]): any
}

declare module '@strudel/mini' {
  export function mini(pattern: string): any
  export function h(pattern: string): any
  export function m(pattern: string, position?: number): any
}

declare module '@strudel/webaudio' {
  export function getAudioContext(): AudioContext
  export function initAudioOnFirstClick(): Promise<void>
  export function webaudioOutput(options?: any): any
}
