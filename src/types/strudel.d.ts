declare module '@strudel/core' {
  export function repl(config?: any): any
  export function s(pattern: string): any
  export function sound(pattern: string): any
  export function note(...args: any[]): any
  export function sequence(...args: any[]): any
  export function stack(...args: any[]): any
}

declare module '@strudel/webaudio' {
  export function getAudioContext(): AudioContext
  export function initAudioOnFirstClick(): Promise<void>
  export function webaudioOutput(options?: any): any
}
