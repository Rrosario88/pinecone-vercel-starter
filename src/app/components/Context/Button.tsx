export function Button({ className, ...props }: any) {
  return (
    <button
      className={
        "inline-flex items-center gap-2 justify-center rounded-md py-2 px-3 text-sm outline-offset-2 transition active:transition-none bg-gray-600 dark:bg-gray-600 font-semibold text-white hover:bg-gray-500 dark:hover:bg-gray-500 active:bg-gray-700 dark:active:bg-gray-700 active:text-white/70 " +
        className
      }
      {...props}
    />
  );
}
