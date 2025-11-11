import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  currentPage: "settings" | "pdf-parsing";
  onNavigate: (page: "settings" | "pdf-parsing") => void;
}

export const Layout = ({ children, currentPage, onNavigate }: LayoutProps) => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <nav className="w-64 bg-gradient-to-b from-indigo-600 to-purple-700 text-white shadow-xl">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            📚 PDF Tarayıcı
          </h2>
          <div className="space-y-2">
          <button
              onClick={() => onNavigate("pdf-parsing")}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                currentPage === "pdf-parsing"
                  ? "bg-white text-indigo-600 shadow-lg font-medium"
                  : "hover:bg-indigo-500 text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                ⚙️ PDF Ayrıştırma
              </span>
            </button>
            <button
              onClick={() => onNavigate("settings")}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                currentPage === "settings"
                  ? "bg-white text-indigo-600 shadow-lg font-medium"
                  : "hover:bg-indigo-500 text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                📂 Ayarlar
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

