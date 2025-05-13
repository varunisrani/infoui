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

    // Get all other objects
    const otherObjects = this.canvas.getObjects().filter(obj => obj !== activeObject);

    // Check vertical alignment
    otherObjects.forEach(other => {
      if (!(other instanceof fabric.Object)) return;
      
      const otherCenter = other.getCenterPoint();
      const otherBounds = other.getBoundingRect(true, true);

      // Center alignment
      if (this.options.snapToCenter) {
        if (Math.abs(objectCenter.x - otherCenter.x) < (this.options.threshold || 5)) {
          this.drawVerticalLine(otherCenter.x);
          if (typeof other.left === 'number') {
            activeObject.set('left', other.left);
            this.canvas.renderAll();
          }
        }
      }

      // Edge alignment
      if (this.options.snapToEdges) {
        // Left edge
        if (Math.abs(objectBounds.left - otherBounds.left) < (this.options.threshold || 5)) {
          this.drawVerticalLine(otherBounds.left);
          if (typeof other.left === 'number') {
            activeObject.set('left', other.left);
          }
        }
        // Right edge
        if (Math.abs(objectBounds.left + objectBounds.width - (otherBounds.left + otherBounds.width)) < (this.options.threshold || 5)) {
          this.drawVerticalLine(otherBounds.left + otherBounds.width);
          if (typeof other.left === 'number' && typeof otherBounds.width === 'number' && typeof objectBounds.width === 'number') {
            activeObject.set('left', other.left + otherBounds.width - objectBounds.width);
          }
        }
      }
    });

    // Similar logic for horizontal alignment
    otherObjects.forEach(other => {
      if (!(other instanceof fabric.Object)) return;
      
      const otherCenter = other.getCenterPoint();
      const otherBounds = other.getBoundingRect(true, true);

      if (this.options.snapToCenter) {
        if (Math.abs(objectCenter.y - otherCenter.y) < (this.options.threshold || 5)) {
          this.drawHorizontalLine(otherCenter.y);
          if (typeof other.top === 'number') {
            activeObject.set('top', other.top);
            this.canvas.renderAll();
          }
        }
      }

      if (this.options.snapToEdges) {
        // Top edge
        if (Math.abs(objectBounds.top - otherBounds.top) < (this.options.threshold || 5)) {
          this.drawHorizontalLine(otherBounds.top);
          if (typeof other.top === 'number') {
            activeObject.set('top', other.top);
          }
        }
        // Bottom edge
        if (Math.abs(objectBounds.top + objectBounds.height - (otherBounds.top + otherBounds.height)) < (this.options.threshold || 5)) {
          this.drawHorizontalLine(otherBounds.top + otherBounds.height);
          if (typeof other.top === 'number' && typeof otherBounds.height === 'number' && typeof objectBounds.height === 'number') {
            activeObject.set('top', other.top + otherBounds.height - objectBounds.height);
          }
        }
      }
    });
  }

  private handleObjectScaling(event: fabric.IEvent) {
    // Similar to moving but for scaling operations
    // This is a simplified version - you might want to add more complex scaling snapping
    this.handleObjectMoving(event);
  }

  private drawVerticalLine(x: number) {
    const canvasHeight = this.canvas.getHeight() || 1000;
    const line = new fabric.Line([x, -canvasHeight / 2, x, canvasHeight * 1.5], {
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
    const line = new fabric.Line([-canvasWidth / 2, y, canvasWidth * 1.5, y], {
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
    [...this.verticalLines, ...this.horizontalLines].forEach(line => {
      this.canvas.remove(line);
    });
    this.verticalLines = [];
    this.horizontalLines = [];
    this.canvas.renderAll();
  }

  public destroy() {
    this.canvas.off('object:moving', this.handleObjectMoving.bind(this));
    this.canvas.off('object:scaling', this.handleObjectScaling.bind(this));
    this.canvas.off('mouse:up', this.clearGuidelines.bind(this));
    this.clearGuidelines();
  }
} 