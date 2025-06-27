import { Banner } from "./banner";
import { ProjectsSection } from "./projects-section";
import { TemplatesSection } from "./templates-section";

export default function Home() {
  return (
    <div className="min-h-full">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 px-8 py-12 mb-8 rounded-2xl">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Create Amazing Designs
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Start from scratch or choose from our collection of professional templates
            </p>
          </div>
          <div className="flex justify-center">
            <Banner />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 space-y-12">
        <TemplatesSection />
        <ProjectsSection />
      </div>
    </div>
  );
};

