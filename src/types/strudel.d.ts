declare module '@strudel/core' {
  export function repl(): any
  export function s(pattern: string): any
  export function stack(...patterns: any[]): any
  export function note(pattern: string): any
}
