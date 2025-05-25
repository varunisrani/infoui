// This is a temporary file just to check if our type fix works
import { fabric } from "fabric";

// Simulate the canvas.toJSON() return type
const currentState = {} as ReturnType<fabric.Canvas['toJSON']>;

// Add the type assertion like in our fix
const fixedState = currentState as ReturnType<fabric.Canvas['toJSON']> & { _viewportTransform?: number[] };

// Test adding the property
if (true) {
    // This should now work with our type assertion
    fixedState._viewportTransform = [1, 0, 0, 1, 0, 0];
    
    console.log("TypeScript is happy with our fix!");
}