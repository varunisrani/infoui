"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { 
  AlertTriangle, 
  CopyIcon, 
  FileIcon, 
  Loader, 
  MoreHorizontal, 
  Search,
  Trash
} from "lucide-react";

import { useGetProjects, useDeleteProject, useCreateProject } from "@/features/projects/api/use-projects";
import { storage } from "@/lib/storage";

import {
  DropdownMenuContent,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Table,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";

export const ProjectsSection = () => {
  const [ConfirmDialog, confirm] = useConfirm(
    "Are you sure?",
    "You are about to delete this project.",
  );
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const router = useRouter();

  const onCopy = (id: string) => {
    const project = storage.getProject(id);
    if (project) {
      createProject.mutate({
        name: `${project.name} (Copy)`,
        json: project.json,
        width: project.width,
        height: project.height
      });
    }
  };

  const onDelete = async (id: string) => {
    const ok = await confirm();

    if (ok) {
      deleteProject.mutate(id);
    }
  };

  const { data, isLoading, isError } = useGetProjects();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Recent projects
            </h3>
            <p className="text-gray-600 mt-1">
              Continue working on your designs
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center justify-center">
              <Loader className="size-8 animate-spin text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Recent projects
            </h3>
            <p className="text-gray-600 mt-1">
              Continue working on your designs
            </p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-8">
          <div className="flex flex-col items-center text-center">
            <AlertTriangle className="size-8 text-red-500 mb-4" />
            <h4 className="text-lg font-medium text-red-900 mb-2">
              Failed to load projects
            </h4>
            <p className="text-red-700">
              We&apos;re having trouble loading your projects. Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!data.data.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Recent projects
            </h3>
            <p className="text-gray-600 mt-1">
              Continue working on your designs
            </p>
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12">
          <div className="flex flex-col items-center text-center">
            <Search className="size-12 text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              No projects yet
            </h4>
            <p className="text-gray-600 mb-6">
              Start creating your first design project to see it here.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6"> 
      <ConfirmDialog />
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">
            Recent projects
          </h3>
          <p className="text-gray-600 mt-1">
            Continue working on your designs
          </p>
        </div>
        <div className="hidden sm:block">
          <p className="text-sm text-gray-500">
            {data.data.length} project{data.data.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableBody>
            {data.data.map((project) => (
              <TableRow key={project.id} className="hover:bg-gray-50 transition-colors">
                <TableCell
                  onClick={() => router.push(`/editor/${project.id}`)}
                  className="font-medium flex items-center gap-x-3 cursor-pointer py-4"
                >
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <FileIcon className="size-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{project.name}</p>
                    <p className="text-sm text-gray-500 md:hidden">
                      {project.width} x {project.height} px
                    </p>
                  </div>
                </TableCell>
                <TableCell
                  onClick={() => router.push(`/editor/${project.id}`)}
                  className="hidden md:table-cell cursor-pointer text-gray-600"
                >
                  {project.width} x {project.height} px
                </TableCell>
                <TableCell
                  onClick={() => router.push(`/editor/${project.id}`)}
                  className="hidden md:table-cell cursor-pointer text-gray-600"
                >
                  {formatDistanceToNow(new Date(project.updatedAt), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell className="flex items-center justify-end">
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        disabled={false}
                        size="icon"
                        variant="ghost"
                        className="hover:bg-gray-100"
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60">
                      <DropdownMenuItem
                        className="h-10 cursor-pointer"
                        disabled={createProject.isPending}
                        onClick={() => onCopy(project.id)}
                      >
                        <CopyIcon className="size-4 mr-2" />
                        Make a copy
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="h-10 cursor-pointer text-red-600 focus:text-red-600"
                        disabled={deleteProject.isPending}
                        onClick={() => onDelete(project.id)}
                      >
                        <Trash className="size-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {data.nextPage && (
        <div className="w-full flex items-center justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="hover:bg-gray-50"
          >
            Load more projects
          </Button>
        </div>
      )}
    </div>
  );
};
