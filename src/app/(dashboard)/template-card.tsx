import Image from "next/image";
import { Crown } from "lucide-react";

import { cn } from "@/lib/utils";

interface TemplateCardProps {
  imageSrc: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  description: string;
  width: number;
  height: number;
  isPro: boolean | null;
};

export const TemplateCard = ({
  imageSrc,
  title,
  onClick,
  disabled,
  description,
  height,
  width,
  isPro
}: TemplateCardProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group text-left transition-all duration-200 flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md",
        disabled ? "cursor-not-allowed opacity-75" : "cursor-pointer hover:border-blue-300"
      )}
    >
      <div
        style={{ aspectRatio: `${width}/${height}` }}
        className="relative h-40 w-full overflow-hidden rounded-t-lg bg-gray-100"
      >
        {imageSrc ? (
          <Image
            fill
            src={imageSrc}
            alt={title}
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-100 to-gray-200">
            <div className="text-gray-400 text-center">
              <div className="w-8 h-8 mx-auto mb-2 bg-gray-300 rounded"></div>
              <p className="text-xs">No preview</p>
            </div>
          </div>
        )}
        {isPro && (
          <div className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center bg-black/70 rounded-full">
            <Crown className="size-4 fill-yellow-500 text-yellow-500" />
          </div>
        )}
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 absolute inset-0 bg-black/50 flex items-center justify-center rounded-t-lg">
          <p className="text-white font-medium text-sm">
            Open in editor
          </p>
        </div>
      </div>
      <div className="p-4 space-y-1">
        <p className="font-medium text-gray-900 text-sm truncate">
          {title}
        </p>
        <p className="text-xs text-gray-500">
          {description}
        </p>
      </div>
    </button>
  )
}