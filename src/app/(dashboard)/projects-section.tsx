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
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          Recent projects
        </h3>
        <div className="flex flex-col gap-y-4 items-center justify-center h-32">
          <Loader className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          Recent projects
        </h3>
        <div className="flex flex-col gap-y-4 items-center justify-center h-32">
          <AlertTriangle className="size-6 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            Failed to load projects
          </p>
        </div>
      </div>
    )
  }

  if (!data.data.length) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          Recent projects
        </h3>
        <div className="flex flex-col gap-y-4 items-center justify-center h-32">
          <Search className="size-6 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            No projects found
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4"> 
      <ConfirmDialog />
      <h3 className="font-semibold text-lg">
        Recent projects
      </h3>
      <Table>
        <TableBody>
          {data.data.map((project) => (
            <TableRow key={project.id}>
              <TableCell
                onClick={() => router.push(`/editor/${project.id}`)}
                className="font-medium flex items-center gap-x-2 cursor-pointer"
              >
                <FileIcon className="size-6" />
                {project.name}
              </TableCell>
              <TableCell
                onClick={() => router.push(`/editor/${project.id}`)}
                className="hidden md:table-cell cursor-pointer"
              >
                {project.width} x {project.height} px
              </TableCell>
              <TableCell
                onClick={() => router.push(`/editor/${project.id}`)}
                className="hidden md:table-cell cursor-pointer"
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
                      className="h-10 cursor-pointer"
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
      {data.nextPage && (
        <div className="w-full flex items-center justify-center pt-4">
          <Button
            variant="ghost"
            onClick={() => window.location.reload()}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
};
