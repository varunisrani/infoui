declare module 'svg-path-parser' {
  // Command is an array where the first element is the command code (string)
  // and subsequent elements are numbers (coordinates, radii, flags, etc.)
  export type ParsedCommandArray = [string, ...number[]];

  // More structured command object that makeAbsolute might return or work with
  export type Command = {
    code: string; // e.g., 'M', 'L', 'C', 'a', etc.
    command: string; // e.g., 'moveto', 'lineto', 'curveto', 'elliptical arc'
    relative?: boolean;
    x0?: number; // Start point x (added by makeAbsolute)
    y0?: number; // Start point y (added by makeAbsolute)
    x?: number;  // End point x
    y?: number;  // End point y
    x1?: number; // Control point 1 x
    y1?: number; // Control point 1 y
    x2?: number; // Control point 2 x
    y2?: number; // Control point 2 y
    rx?: number; // Arc radius x
    ry?: number; // Arc radius y
    xAxisRotation?: number;
    largeArc?: boolean;
    sweep?: boolean;
  };

  export function parseSVG(d: string): Command[];
  export function makeAbsolute(commands: Command[]): Command[]; // Modifies in place and returns the same array
  // Add other functions if you use them, e.g., a stringifier if the lib has one
} 