declare module 'papaparse' {
  export interface ParseMeta {
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    truncated: boolean;
    fields: string[];
  }

  export interface ParseError {
    type: string;
    code: string;
    message: string;
    row: number;
  }

  export interface ParseResult<T> {
    data: T[];
    errors: ParseError[];
    meta: ParseMeta;
  }

  export interface ParseConfig {
    header?: boolean;
    dynamicTyping?: boolean | Record<string, boolean>;
    skipEmptyLines?: boolean | 'greedy';
  }

  const Papa: {
    parse<T = any>(csvText: string, config?: ParseConfig): ParseResult<T>;
  };

  export default Papa;
}
