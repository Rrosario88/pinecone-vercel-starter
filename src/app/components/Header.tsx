import Image from "next/image";
import PineconeLogo from "../../../public/pinecone.svg";
import VercelLogo from "../../../public/vercel.svg";

export default function Header({ className }: { className?: string }) {
  return (
    <header
      className={`flex items-center justify-center text-gray-900 dark:text-gray-100 text-2xl transition-colors duration-200 ${className}`}
    >
      <div className="flex items-center gap-4 px-6 py-3 bg-gray-100 dark:bg-gray-800 backdrop-blur-sm rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm">
        <Image
          src={PineconeLogo}
          alt="pinecone-logo"
          width="180"
          height="36"
          className="dark:invert transition-all duration-200"
          style={{ filter: 'brightness(0.6) contrast(1.2)' }}
        />
        <div className="text-2xl font-light text-gray-500 dark:text-gray-400">+</div>
        <Image
          src={VercelLogo}
          alt="vercel-logo"
          width="120"
          height="36"
          className="dark:invert transition-all duration-200"
          style={{ filter: 'brightness(0.6) contrast(1.2)' }}
        />
      </div>
    </header>
  );
}
