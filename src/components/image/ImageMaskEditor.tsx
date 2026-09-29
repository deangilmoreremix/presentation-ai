"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  PenTool,
  Eraser,
  Trash2,
  Download,
  Upload,
  Maximize2,
  Minimize2,
  X,
  Check,
} from "lucide-react";
import { usePresentationState } from "@/states/presentation-state";
import { type ImageMaskData } from "@/lib/image/types";

interface ImageMaskEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maskData: ImageMaskData | null;
  onMaskChange: (mask: ImageMaskData | null) => void;
}

export function ImageMaskEditor({ open, onOpenChange, maskData, onMaskChange }: ImageMaskEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(40);
  const [maskImage, setMaskImage] = useState<string | null>(null);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 512, height: 512 });
  const [zoom, setZoom] = useState(1);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (maskImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = maskImage;
    }
  }, [maskImage]);

  useEffect(() => {
    redraw();
  }, [redraw, maskImage]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    setLastPos(pos);
    setIsDrawing(true);
    draw(pos);
  };

  const draw = (pos: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawing) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (lastPos) {
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    setLastPos(pos);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      saveMask();
    }
    setIsDrawing(false);
    setLastPos(null);
  };

  const saveMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onMaskChange({
      id: `mask_${Date.now()}`,
      url: dataUrl,
      format: "base64",
    });
  };

  const handleClear = () => {
    setMaskImage(null);
    onMaskChange(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setMaskImage(dataUrl);
      onMaskChange({
        id: `mask_${Date.now()}`,
        url: dataUrl,
        format: "base64",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `mask_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenTool className="h-4 w-4" />
          <span className="text-sm font-medium">Mask Editor</span>
          {maskData && <Badge variant="secondary">Active</Badge>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs">Brush: {brushSize}px</Label>
        <Slider
          value={[brushSize]}
          onValueChange={([v]) => setBrushSize(v ?? 40)}
          min={5}
          max={100}
          step={5}
          className="flex-1"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
          <Minimize2 className="mr-2 h-3 w-3" />
          Zoom Out
        </Button>
        <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>
          <Maximize2 className="mr-2 h-3 w-3" />
          Zoom In
        </Button>
      </div>

      <div ref={containerRef} className="overflow-auto rounded-lg border bg-black">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="cursor-crosshair"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
          onMouseDown={startDrawing}
          onMouseMove={(e) => isDrawing && draw(getCanvasPos(e))}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleClear}>
            <Trash2 className="mr-2 h-3 w-3" />
            Clear
          </Button>
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
              <span>
                <Upload className="mr-2 h-3 w-3" />
                Upload
              </span>
            </Button>
          </label>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleDownload}>
            <Download className="mr-2 h-3 w-3" />
            Export
          </Button>
        </div>
        <Button size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>
          <Check className="mr-2 h-3 w-3" />
          Apply Mask
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        White areas will be edited. Black areas will be preserved. Upload a mask image or draw directly.
      </p>
    </div>
  );
}
