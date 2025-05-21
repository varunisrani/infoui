import { useEffect } from "react";
import { Loader } from "lucide-react";
import Image from "next/image";

import { usePaywall } from "@/features/subscriptions/hooks/use-paywall";
import { useGetTemplates } from "@/features/projects/api/use-get-templates";
import { Editor, ActiveTool } from "@/features/editor/types";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface Template {
  id: string;
  name: string;
  json: string;
  width: number;
  height: number;
  thumbnailUrl: string | null;
  isPro: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateSidebarProps {
  editor: Editor | undefined;
  onClose: () => void;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const TemplateSidebar = ({
  editor,
  onClose,
  activeTool,
  onChangeActiveTool,
}: TemplateSidebarProps) => {
  const { shouldBlock, triggerPaywall } = usePaywall();

  const { 
    data, 
    isLoading,
  } = useGetTemplates({ page: "1", limit: "4" });

  const onClick = (template: Template) => {
    if (template.isPro && shouldBlock) {
      triggerPaywall();
      return;
    }

    if (!editor) {
      return;
    }

    editor.loadJson(template.json);
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      <ToolSidebarHeader
        title=""
        description=""
      />
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 gap-4 p-4">
          {data?.data.map((template: Template) => (
            <div
              key={template.id}
              className="group relative aspect-[1.6/1] rounded-lg overflow-hidden"
            >
              <Image
                src={template.thumbnailUrl || ""}
                alt={template.name}
                className="object-cover"
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
              />
              <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onClick(template)}
                >
                  Use template
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center p-4">
          {isLoading && (
            <Loader className="size-4 animate-spin" />
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
