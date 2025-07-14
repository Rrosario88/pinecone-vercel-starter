import Image from "next/image";
import PineconeLogo from "../../../public/pinecone.svg";
import VercelLogo from "../../../public/vercel.svg";

export default function Header({ className }: { className?: string }) {
  return (
    <header
      className={`flex items-center justify-center text-gray-900 dark:text-gray-100 text-2xl transition-colors duration-200 ${className}`}
    >
      <div className="flex items-center gap-4 px-6 py-3 bg-gray-100 dark:bg-gray-800 backdrop-blur-sm rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm">
        <div className="logo-container">
          <Image
            src={PineconeLogo}
            alt="pinecone-logo"
            width="180"
            height="36"
            className="transition-all duration-200"
          />
        </div>
        <div className="text-2xl font-light text-gray-500 dark:text-gray-300">+</div>
        <div className="logo-container">
          <Image
            src={VercelLogo}
            alt="vercel-logo"
            width="120"
            height="36"
            className="transition-all duration-200"
          />
        </div>
      </div>
      
      <style jsx>{`
        .logo-container img {
          filter: brightness(0.4) contrast(1.1);
          transition: filter 0.2s ease;
        }
        
        :global(.dark) .logo-container img {
          filter: brightness(0.5) contrast(1.2) !important;
        }
        
        :global(html.dark) .logo-container img {
          filter: brightness(0.5) contrast(1.2) !important;
        }
        
        :global(html:not(.dark)) .logo-container img {
          filter: brightness(0.4) contrast(1.1) !important;
        }
      `}</style>
    </header>
  );
}
