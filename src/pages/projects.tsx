import Link from "next/link";

const Projects = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-4">Our Projects</h1>
      <p className="text-lg text-gray-400 mb-8">
        Here are some of our amazing projects.
      </p>
      <Link href="/" className="text-blue-500 hover:underline">
        Go back home
      </Link>
    </div>
  );
};

export default Projects;