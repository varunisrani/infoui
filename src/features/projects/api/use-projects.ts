import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storage, type Project } from '@/lib/storage';
import { toast } from 'sonner';

export const useGetProjects = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['projects', page],
    queryFn: () => {
      const projects = storage.getProjects();
      const start = (page - 1) * limit;
      const end = start + limit;
      return {
        data: projects.slice(start, end),
        nextPage: projects.length > end ? page + 1 : null
      };
    }
  });
};

export const useGetProject = (id: string) => {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => storage.getProject(id)
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      return Promise.resolve(storage.saveProject(data));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully');
    },
    onError: () => {
      toast.error('Failed to create project');
    }
  });
};

export const useUpdateProject = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Project>) => {
      const result = storage.updateProject(id, data);
      if (!result) throw new Error('Project not found');
      return Promise.resolve(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    }
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      storage.deleteProject(id);
      return Promise.resolve(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete project');
    }
  });
}; 