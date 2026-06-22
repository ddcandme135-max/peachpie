export default function Hero() {
  
  return (
    <div className="relative h-[600px] w-full">

      <img
        src="https://images.unsplash.com/photo-1524985069026-dd778a71c7b4"
        className="w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/60" />

      <div className="absolute bottom-20 left-10">
        <h1 className="text-5xl font-bold mb-4">
          Featured Content
        </h1>
        <p className="text-lg opacity-80">
          Some description here
        </p>
      </div>
    </div>
  );
}