import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return ( 
    <div className="bg-muted h-full">
      <Sidebar />
      <div className="sm:pl-[300px] flex flex-col h-full">
        <Navbar />
        <main className="bg-white flex-1 overflow-auto p-4 sm:p-6 md:p-8 sm:rounded-tl-2xl">
          {children}
        </main>
      </div>
    </div>
  );
};
 
export default DashboardLayout;
