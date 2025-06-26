import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <header className="p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Image 
            src="/Asset_13x.png" 
            alt="Wrecked Labs Logo" 
            width={40}
            height={40}
          />
          <span className="text-xl font-bold">Wrecked Labs</span>
        </div>
        <nav>
          <Link href="/about" className="text-gray-400 hover:text-white mr-4">
            About
          </Link>
          <Link href="/contact" className="text-gray-400 hover:text-white">
            Contact
          </Link>
        </nav>
      </header>

      <main className="flex flex-col items-center justify-center text-center px-4 pt-20">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
          Build the Future with Wrecked Labs
        </h1>
        <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl">
          We are a team of passionate developers and designers dedicated to building innovative and high-quality software solutions. Let&apos;s create something amazing together.
        </p>
        <div className="space-x-4">
          <Button asChild>
            <Link href="/projects">Our Work</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/contact">Get in Touch</Link>
          </Button>
        </div>
      </main>

      <footer className="text-center p-4 mt-20">
        <p className="text-gray-500">&copy; 2025 Wrecked Labs. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Index; 