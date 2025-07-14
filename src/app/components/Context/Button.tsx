export function Button({ className, ...props }: any) {
  return (
    <button
      className={
        "group relative inline-flex items-center gap-2 justify-center rounded-md py-2 px-3 text-sm outline-offset-2 transition-all duration-300 ease-in-out hover:scale-110 active:scale-95 active:transition-none bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 font-semibold text-white active:bg-gray-700 dark:active:bg-gray-800 active:text-white/70 " +
        className
      }
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-70 transition-opacity duration-300 blur-md rounded-md"></div>
      <span className="relative flex items-center gap-2">{props.children}</span>
    </button>
  );
}
