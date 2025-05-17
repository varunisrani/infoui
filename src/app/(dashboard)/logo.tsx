import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";

const font = Space_Grotesk({
  weight: ["700"],
  subsets: ["latin"],
});

export const Logo = () => {
  return (
    <Link href="/">
      <div className="flex items-center gap-x-2 hover:opacity-75 transition h-[68px] px-4">
        <div className="w-8 h-8">
          <img src="https://i.ibb.co/xt4L65pK/Asset-13x.png" alt="Wrecked Labs" className="w-full h-full object-contain" />
        </div>
        <h1 className={cn(font.className, "text-xl font-bold")}>Wrecked Labs</h1>
      </div>
    </Link>
  );
};
