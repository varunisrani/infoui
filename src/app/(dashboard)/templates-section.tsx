"use client";

import { useRouter } from "next/navigation";
import { Loader, TriangleAlert } from "lucide-react";

import { usePaywall } from "@/features/subscriptions/hooks/use-paywall";
import { useGetTemplates } from "@/features/projects/api/use-get-templates";
import { useCreateProject } from "@/features/projects/api/use-projects";

import { TemplateCard } from "./template-card";

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

export const TemplatesSection = () => {
  const { shouldBlock, triggerPaywall } = usePaywall();
  const router = useRouter();
  const mutation = useCreateProject();

  const { 
    data, 
    isLoading, 
    isError
  } = useGetTemplates({ page: "1", limit: "4" });

  const onClick = (template: Template) => {
    if (template.isPro && shouldBlock) {
      triggerPaywall();
      return;
    }

    mutation.mutate(
      {
        name: `${template.name} project`,
        json: template.json,
        width: template.width,
        height: template.height,
      },
      {
        onSuccess: (data) => {
          router.push(`/editor/${data.id}`);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Start from a template
            </h3>
            <p className="text-gray-600 mt-1">
              Choose from our collection of professional templates
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-48 animate-pulse">
              <div className="h-full flex items-center justify-center">
                <Loader className="size-6 text-gray-400 animate-spin" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }


  if (!data?.data?.length) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">
            Start from a template
          </h3>
          <p className="text-gray-600 mt-1">
            Choose from our collection of professional templates
          </p>
        </div>
        <div className="hidden sm:block">
          <p className="text-sm text-gray-500">
            {data.data.length} template{data.data.length !== 1 ? "s" : ""} available
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {data.data.map((template: Template) => (
          <TemplateCard
            key={template.id}
            title={template.name}
            imageSrc={template.thumbnailUrl || ""}
            onClick={() => onClick(template)}
            disabled={mutation.isPending}
            description={`${template.width} x ${template.height} px`}
            width={template.width}
            height={template.height}
            isPro={template.isPro}
          />
        ))}
      </div>
    </div>
  );
};
