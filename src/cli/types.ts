/**
CLI types and interfaces
*/

export interface BenchOptions
{
  targets: string[];
  quick?: boolean;
  somethingElse?: boolean;
}

export interface CompareOptions
{
  update?: boolean;
  files: string[];
}

export type Command = 'bench' | 'compare';

export interface ParsedArgs
{
  command?: Command;
  options?: BenchOptions | CompareOptions;
  inputs?: string;
  help?: boolean;
}
