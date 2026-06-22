import { useState } from "react";

export default function TopNav() {
  const [hovered, setHovered] = useState(null);

  const menus = [
    { key: "home", label: "Home" },
    { key: "movies", label: "search" },
    { key: "tv", label: "project" },
    { key: "sports", label: "library" },
    { key: "stuff", label: "chat" },
  ];

  return (
    <div className="fixed top-0 left-0 w-full z-50 flex items-center px-10 py-4">

      <div className="text-white font-semibold text-[20px]">
        notel
      </div>

      <div className="flex items-center gap-5 ml-10">
        {menus.map((menu, index) => {
          const isActive = hovered === index;

          return (
            <span
              key={menu.key}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              className={`text-[17px] cursor-pointer
                transition-all duration-300 ease-out
                
                ${isActive ? "scale-125 text-white" : "text-white/60 hover:text-white"}
              `}
            >
              {menu.label}
            </span>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="w-10 h-10 bg-white/20 rounded-full" />
      </div>
    </div>
  );
}