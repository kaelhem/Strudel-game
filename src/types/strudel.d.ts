declare module '@strudel/core' {
  export function repl(pattern: string): any
  export function evalScope(...args: any[]): any
}

declare module '@strudel/webaudio' {
  export function getAudioContext(): AudioContext
  export function initAudioOnFirstClick(): Promise<void>
  export function webaudioOutput(): any
}
