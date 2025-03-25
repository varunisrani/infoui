export interface Project {
  id: string;
  name: string;
  json: string;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'canvas_projects';

export const storage = {
  getProjects: (): Project[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const projects = storage.getProjects();
    const newProject = {
      ...project,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    projects.push(newProject);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return newProject;
  },

  updateProject: (id: string, data: Partial<Project>) => {
    const projects = storage.getProjects();
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) return null;

    projects[index] = {
      ...projects[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return projects[index];
  },

  deleteProject: (id: string) => {
    const projects = storage.getProjects();
    const filtered = projects.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  getProject: (id: string) => {
    const projects = storage.getProjects();
    return projects.find(p => p.id === id) || null;
  }
}; 