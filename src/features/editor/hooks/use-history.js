"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useHistory = void 0;
var react_1 = require("react");
var types_1 = require("@/features/editor/types");
;
var useHistory = function (_a) {
    var canvas = _a.canvas, saveCallback = _a.saveCallback;
    var _b = (0, react_1.useState)(0), historyIndex = _b[0], setHistoryIndex = _b[1];
    var canvasHistory = (0, react_1.useRef)([]);
    var skipSave = (0, react_1.useRef)(false);
    var canUndo = (0, react_1.useCallback)(function () {
        return historyIndex > 0;
    }, [historyIndex]);
    var canRedo = (0, react_1.useCallback)(function () {
        return historyIndex < canvasHistory.current.length - 1;
    }, [historyIndex]);
    var save = (0, react_1.useCallback)(function (skip) {
        if (skip === void 0) { skip = false; }
        if (!canvas)
            return;
        try {
            var currentState = canvas.toJSON(types_1.JSON_KEYS);
            // Add viewport transform data to the state
            if (canvas.viewportTransform) {
                // Save the current viewport transform (zoom and pan)
                currentState._viewportTransform = __spreadArray([], canvas.viewportTransform, true);
            }
            var json = JSON.stringify(currentState);
            if (!skip && !skipSave.current) {
                // If we're in the middle of the history stack, 
                // remove everything after the current index
                if (historyIndex < canvasHistory.current.length - 1) {
                    canvasHistory.current = canvasHistory.current.slice(0, historyIndex + 1);
                }
                // Add new state to history
                canvasHistory.current.push(json);
                setHistoryIndex(canvasHistory.current.length - 1);
            }
            var workspace = canvas
                .getObjects()
                .find(function (object) { return object.name === "clip"; });
            var height = (workspace === null || workspace === void 0 ? void 0 : workspace.height) || 0;
            var width = (workspace === null || workspace === void 0 ? void 0 : workspace.width) || 0;
            saveCallback === null || saveCallback === void 0 ? void 0 : saveCallback({ json: json, height: height, width: width });
        }
        catch (error) {
            console.error("Error saving canvas state:", error);
        }
    }, [
        canvas,
        saveCallback,
        historyIndex
    ]);
    var undo = (0, react_1.useCallback)(function () {
        if (canUndo()) {
            try {
                skipSave.current = true;
                // Get current viewport transform before making changes
                var currentViewportTransform = (canvas === null || canvas === void 0 ? void 0 : canvas.viewportTransform) || [1, 0, 0, 1, 0, 0];
                // Clear the canvas before loading new state
                canvas === null || canvas === void 0 ? void 0 : canvas.clear().renderAll();
                var previousIndex_1 = historyIndex - 1;
                var previousStateData_1 = JSON.parse(canvasHistory.current[previousIndex_1]);
                // Check if the state has viewport transform data
                var hasViewportData_1 = previousStateData_1._viewportTransform &&
                    Array.isArray(previousStateData_1._viewportTransform) &&
                    previousStateData_1._viewportTransform.length === 6;
                // Extract the previous canvas state (separate from viewport data)
                var previousState = previousStateData_1;
                // Load the previous state
                canvas === null || canvas === void 0 ? void 0 : canvas.loadFromJSON(previousState, function () {
                    // After loading the state, restore viewport if needed
                    if (hasViewportData_1 && canvas) {
                        canvas.setViewportTransform(previousStateData_1._viewportTransform);
                    }
                    // Make sure objects are positioned correctly
                    canvas === null || canvas === void 0 ? void 0 : canvas.getObjects().forEach(function (obj) {
                        if (obj.name !== "clip") { // Don't touch the workspace/clip object
                            // Re-set position to force proper positioning
                            if (obj.left !== undefined && obj.top !== undefined) {
                                obj.set({
                                    left: obj.left,
                                    top: obj.top
                                });
                            }
                        }
                    });
                    // Make sure canvas correctly renders
                    canvas === null || canvas === void 0 ? void 0 : canvas.renderAll();
                    setHistoryIndex(previousIndex_1);
                    skipSave.current = false;
                });
            }
            catch (error) {
                console.error("Error during undo operation:", error);
                skipSave.current = false;
            }
        }
    }, [canUndo, canvas, historyIndex]);
    var redo = (0, react_1.useCallback)(function () {
        if (canRedo()) {
            try {
                skipSave.current = true;
                // Get current viewport transform before making changes
                var currentViewportTransform = (canvas === null || canvas === void 0 ? void 0 : canvas.viewportTransform) || [1, 0, 0, 1, 0, 0];
                // Clear canvas before loading new state
                canvas === null || canvas === void 0 ? void 0 : canvas.clear().renderAll();
                var nextIndex_1 = historyIndex + 1;
                var nextStateData_1 = JSON.parse(canvasHistory.current[nextIndex_1]);
                // Check if the state has viewport transform data
                var hasViewportData_2 = nextStateData_1._viewportTransform &&
                    Array.isArray(nextStateData_1._viewportTransform) &&
                    nextStateData_1._viewportTransform.length === 6;
                // Extract the next canvas state
                var nextState = nextStateData_1;
                // Load the next state
                canvas === null || canvas === void 0 ? void 0 : canvas.loadFromJSON(nextState, function () {
                    // After loading the state, restore viewport if needed
                    if (hasViewportData_2 && canvas) {
                        canvas.setViewportTransform(nextStateData_1._viewportTransform);
                    }
                    // Make sure objects are positioned correctly
                    canvas === null || canvas === void 0 ? void 0 : canvas.getObjects().forEach(function (obj) {
                        if (obj.name !== "clip") { // Don't touch the workspace/clip object
                            // Re-set position to force proper positioning
                            if (obj.left !== undefined && obj.top !== undefined) {
                                obj.set({
                                    left: obj.left,
                                    top: obj.top
                                });
                            }
                        }
                    });
                    // Make sure canvas correctly renders
                    canvas === null || canvas === void 0 ? void 0 : canvas.renderAll();
                    setHistoryIndex(nextIndex_1);
                    skipSave.current = false;
                });
            }
            catch (error) {
                console.error("Error during redo operation:", error);
                skipSave.current = false;
            }
        }
    }, [canvas, historyIndex, canRedo]);
    return {
        save: save,
        canUndo: canUndo,
        canRedo: canRedo,
        undo: undo,
        redo: redo,
        setHistoryIndex: setHistoryIndex,
        canvasHistory: canvasHistory,
    };
};
exports.useHistory = useHistory;
