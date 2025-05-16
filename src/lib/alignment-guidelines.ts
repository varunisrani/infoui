import { fabric } from 'fabric';

interface AlignmentGuidelineOptions {
  snapToCenter?: boolean;
  snapToEdges?: boolean;
  threshold?: number;
  lineColor?: string;
  lineWidth?: number;
}

export class AlignmentGuidelines {
  private canvas: fabric.Canvas;
  private options: AlignmentGuidelineOptions;
  private verticalLines: fabric.Line[];
  private horizontalLines: fabric.Line[];

  constructor(canvas: fabric.Canvas, options: AlignmentGuidelineOptions = {}) {
    this.canvas = canvas;
    this.options = {
      snapToCenter: true,
      snapToEdges: true,
      threshold: 5,
      lineColor: 'rgba(255, 0, 128, 0.75)',
      lineWidth: 1,
      ...options
    };
    this.verticalLines = [];
    this.horizontalLines = [];
    this.init();
  }

  private init() {
    this.canvas.on('object:moving', this.handleObjectMoving.bind(this));
    this.canvas.on('object:scaling', this.handleObjectScaling.bind(this));
    this.canvas.on('mouse:up', this.clearGuidelines.bind(this));
  }

  private handleObjectMoving(event: fabric.IEvent) {
    const activeObject = event.target;
    if (!activeObject || !(activeObject instanceof fabric.Object)) return;

    this.clearGuidelines();
    
    const objectCenter = activeObject.getCenterPoint();
    const objectBounds = activeObject.getBoundingRect(true, true);
    const objectActualWidth = (activeObject.width || 0) * (activeObject.scaleX || 1);
    const objectActualHeight = (activeObject.height || 0) * (activeObject.scaleY || 1);

    const otherObjects = this.canvas.getObjects().filter(obj => obj !== activeObject);

    let potentialVerticalSnaps: { position: number; objectSnapValue: number; distance: number; type: string }[] = [];
    let potentialHorizontalSnaps: { position: number; objectSnapValue: number; distance: number; type: string }[] = [];

    const threshold = this.options.threshold || 5;

    otherObjects.forEach(other => {
      if (!(other instanceof fabric.Object)) return;
      
      const otherCenter = other.getCenterPoint();
      const otherBounds = other.getBoundingRect(true, true);
      const otherActualWidth = (other.width || 0) * (other.scaleX || 1);
      const otherActualHeight = (other.height || 0) * (other.scaleY || 1);

      if (this.options.snapToCenter) {
        const diff = Math.abs(objectCenter.x - otherCenter.x);
        if (diff < threshold) {
          potentialVerticalSnaps.push({
            position: otherCenter.x,
            objectSnapValue: otherCenter.x - objectActualWidth / 2 + (activeObject.left || 0) - objectBounds.left,
            distance: diff,
            type: "center"
          });
        }
      }

      if (this.options.snapToEdges) {
        let diff = Math.abs(objectBounds.left - otherBounds.left);
        if (diff < threshold) {
          potentialVerticalSnaps.push({
            position: otherBounds.left,
            objectSnapValue: otherBounds.left - objectBounds.left + (activeObject.left || 0),
            distance: diff,
            type: "left-left"
          });
        }
        diff = Math.abs(objectBounds.left + objectBounds.width - (otherBounds.left + otherBounds.width));
         if (diff < threshold) {
          potentialVerticalSnaps.push({
            position: otherBounds.left + otherBounds.width,
            objectSnapValue: (otherBounds.left + otherBounds.width) - objectActualWidth - objectBounds.left + (activeObject.left || 0),
            distance: diff,
            type: "right-right"
          });
        }
        diff = Math.abs(objectBounds.left - (otherBounds.left + otherBounds.width));
        if (diff < threshold) {
          potentialVerticalSnaps.push({
            position: otherBounds.left + otherBounds.width,
            objectSnapValue: (otherBounds.left + otherBounds.width) - objectBounds.left + (activeObject.left || 0),
            distance: diff,
            type: "left-right"
          });
        }
        diff = Math.abs(objectBounds.left + objectBounds.width - otherBounds.left);
        if (diff < threshold) {
          potentialVerticalSnaps.push({
            position: otherBounds.left,
            objectSnapValue: otherBounds.left - objectActualWidth - objectBounds.left + (activeObject.left || 0),
            distance: diff,
            type: "right-left"
          });
        }
      }
    });

    otherObjects.forEach(other => {
      if (!(other instanceof fabric.Object)) return;
      
      const otherCenter = other.getCenterPoint();
      const otherBounds = other.getBoundingRect(true, true);
      const otherActualHeight = (other.height || 0) * (other.scaleY || 1);

      if (this.options.snapToCenter) {
        const diff = Math.abs(objectCenter.y - otherCenter.y);
        if (diff < threshold) {
          potentialHorizontalSnaps.push({
            position: otherCenter.y,
            objectSnapValue: otherCenter.y - objectActualHeight / 2 + (activeObject.top || 0) - objectBounds.top,
            distance: diff,
            type: "center"
          });
        }
      }

      if (this.options.snapToEdges) {
        let diff = Math.abs(objectBounds.top - otherBounds.top);
        if (diff < threshold) {
          potentialHorizontalSnaps.push({
            position: otherBounds.top,
            objectSnapValue: otherBounds.top - objectBounds.top + (activeObject.top || 0),
            distance: diff,
            type: "top-top"
          });
        }
        diff = Math.abs(objectBounds.top + objectBounds.height - (otherBounds.top + otherBounds.height));
        if (diff < threshold) {
          potentialHorizontalSnaps.push({
            position: otherBounds.top + otherBounds.height,
            objectSnapValue: (otherBounds.top + otherBounds.height) - objectActualHeight - objectBounds.top + (activeObject.top || 0),
            distance: diff,
            type: "bottom-bottom"
          });
        }
        diff = Math.abs(objectBounds.top - (otherBounds.top + otherBounds.height));
        if (diff < threshold) {
          potentialHorizontalSnaps.push({
            position: otherBounds.top + otherBounds.height,
            objectSnapValue: (otherBounds.top + otherBounds.height) - objectBounds.top + (activeObject.top || 0),
            distance: diff,
            type: "top-bottom"
          });
        }
        diff = Math.abs(objectBounds.top + objectBounds.height - otherBounds.top);
        if (diff < threshold) {
          potentialHorizontalSnaps.push({
            position: otherBounds.top,
            objectSnapValue: otherBounds.top - objectActualHeight - objectBounds.top + (activeObject.top || 0),
            distance: diff,
            type: "bottom-top"
          });
        }
      }
    });
    
    let snapped = false;

    if (potentialVerticalSnaps.length > 0) {
      potentialVerticalSnaps.sort((a, b) => a.distance - b.distance);
      const bestVerticalSnap = potentialVerticalSnaps[0];
      activeObject.set('left', bestVerticalSnap.objectSnapValue);
      this.drawVerticalLine(bestVerticalSnap.position);
      snapped = true;
    }

    if (potentialHorizontalSnaps.length > 0) {
      potentialHorizontalSnaps.sort((a, b) => a.distance - b.distance);
      const bestHorizontalSnap = potentialHorizontalSnaps[0];
      activeObject.set('top', bestHorizontalSnap.objectSnapValue);
      this.drawHorizontalLine(bestHorizontalSnap.position);
      snapped = true;
    }

    if (snapped) {
      activeObject.setCoords();
      this.canvas.renderAll();
    }
  }

  private handleObjectScaling(event: fabric.IEvent) {
    this.handleObjectMoving(event);
  }

  private drawVerticalLine(x: number) {
    const canvasHeight = this.canvas.getHeight() || 1000;
    const line = new fabric.Line([x, 0, x, canvasHeight], {
      stroke: this.options.lineColor,
      strokeWidth: this.options.lineWidth,
      selectable: false,
      evented: false,
    });
    this.verticalLines.push(line);
    this.canvas.add(line);
    this.canvas.renderAll();
  }

  private drawHorizontalLine(y: number) {
    const canvasWidth = this.canvas.getWidth() || 1000;
    const line = new fabric.Line([0, y, canvasWidth, y], {
      stroke: this.options.lineColor,
      strokeWidth: this.options.lineWidth,
      selectable: false,
      evented: false,
    });
    this.horizontalLines.push(line);
    this.canvas.add(line);
    this.canvas.renderAll();
  }

  public clearGuidelines() {
    this.verticalLines.forEach(line => this.canvas.remove(line));
    this.horizontalLines.forEach(line => this.canvas.remove(line));
    this.verticalLines = [];
    this.horizontalLines = [];
  }

  public destroy() {
    this.canvas.off('object:moving', this.handleObjectMoving.bind(this));
    this.canvas.off('object:scaling', this.handleObjectScaling.bind(this));
    this.canvas.off('mouse:up', this.clearGuidelines.bind(this));
    this.clearGuidelines();
  }
} 