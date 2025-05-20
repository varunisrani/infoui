interface ToolSidebarHeaderProps {
  title: string;
  description?: string;
};

export const ToolSidebarHeader = ({
  title,
  description
}: ToolSidebarHeaderProps) => {
  return (
    <div className="p-3 sm:p-4 border-b space-y-0.5 sm:space-y-1 h-[60px] sm:h-[68px]">
      <p className="text-sm font-medium">
        {title}
      </p>
      {description && (
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
};
