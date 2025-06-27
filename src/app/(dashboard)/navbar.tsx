import { Bell, Search, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileMenu } from "@/components/mobile-menu";
import { MobileSearch } from "@/components/mobile-search";

export const Navbar = () => {
  return (
    <nav className="w-full flex items-center justify-between p-4 h-[68px] bg-white border-b border-gray-200" id="navigation">
      <div className="flex items-center gap-4">
        <MobileMenu />
        <h1 className="text-xl font-semibold text-gray-900">Wrecked Labs</h1>
        <div className="hidden md:flex relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search projects..." 
            className="pl-10 w-64"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <MobileSearch />
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <User className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
};
