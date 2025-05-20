import { ChevronsLeft } from "lucide-react";

interface ToolSidebarCloseProps {
  onClick: () => void;
};

export const ToolSidebarClose = ({
  onClick,
}: ToolSidebarCloseProps) => {
  return (
    <button
      onClick={onClick}
      className="absolute -right-[1.5rem] sm:-right-[1.80rem] h-[50px] sm:h-[70px] bg-white top-1/2 transform -translate-y-1/2 flex items-center justify-center rounded-r-xl px-1 pr-1.5 sm:pr-2 border-r border-y group"
    >
      <ChevronsLeft className="size-3 sm:size-4 text-black group-hover:opacity-75 transition" />
    </button>
  );
};
