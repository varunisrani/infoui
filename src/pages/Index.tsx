import Image from "next/image";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="mb-6 relative w-32 h-32 mx-auto">
          <Image 
            src="/Asset_13x.png" 
            alt="Wrecked Labs Logo" 
            fill
            className="object-contain"
          />
        </div>
        <h1 className="text-4xl font-bold mb-4">Wrecked Labs</h1>
        <p className="text-xl text-gray-600">Start building your amazing project here!</p>
      </div>
    </div>
  );
};

export default Index; 