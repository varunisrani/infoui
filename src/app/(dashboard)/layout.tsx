import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return ( 
    <div className="bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="bg-gray-50 flex-1 overflow-auto" role="main">
          <div className="px-4 py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
 
export default DashboardLayout;
