// UrlButton.tsx

import { Button } from "./Button";
import React, { FC } from "react";
import { IconContext } from "react-icons";
import { AiOutlineLink } from "react-icons/ai";
import Link from "next/link";

export interface IUrlEntry {
  url: string;
  title: string;
  seeded: boolean;
  loading: boolean;
}

interface IURLButtonProps {
  entry: IUrlEntry;
  onClick: () => Promise<void>;
}

const UrlButton: FC<IURLButtonProps> = ({ entry, onClick }) => (
  <div key={`${entry.url}-${entry.seeded}`} className="pr-2 lg:flex-grow">
    <Button
      className={`relative overflow-hidden w-full my-1 lg:my-2 mx-2 ${
        entry.loading ? "shimmer" : ""
      } ${
        entry.seeded 
          ? "!bg-green-600 hover:!bg-green-500 !text-white" 
          : "!bg-gray-200 !hover:bg-gray-300 dark:!bg-gray-700 dark:hover:!bg-gray-600 !text-gray-900 dark:!text-gray-100"
      }`}
      onClick={onClick}
    >
      <a
        href={entry.url}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 flex items-center justify-center rounded-full p-2 text-white transition duration-200 hover:cursor-pointer"
      >
        <AiOutlineLink
          fontSize={14}
          className="text-white"
        />
      </a>
      {entry.loading && (
        <div
          className="absolute inset-0"
          style={{
            zIndex: -1,
            background:
              "linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent)",
            animation: "shimmer 2s infinite",
          }}
        ></div>
      )}
      <div className="relative">{entry.title}</div>
    </Button>
  </div>
);

export default UrlButton;
