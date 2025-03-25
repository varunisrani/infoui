"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { storage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Banner = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onClick = () => {
    setLoading(true);
    try {
      const project = storage.saveProject({
        name: "Untitled project",
        json: "",
        width: 1080,
        height: 1080,
      });
      
      toast.success("Project created!");
      router.push(`/editor/${project.id}`);
    } catch (error) {
      toast.error("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-x-2">
      <Button onClick={onClick} disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Start creating
            <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
};
