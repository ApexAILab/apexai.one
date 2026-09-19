import clsx from "clsx";

type BrandMarkProps = {
  className?: string;
  title?: string;
};

export function BrandMark({ className, title }: BrandMarkProps) {
  return (
    <svg
      className={clsx("brand-mark", className)}
      viewBox="0 0 28 28"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M8.8 1.5 18.1 25H0L8.8 1.5Zm0 13.1L5.2 25h7.2L8.8 14.6Z"
        fill="currentColor"
        fillRule="evenodd"
      />
      <path d="M20 8.4 27.7 25H13.4L20 8.4Z" fill="currentColor" opacity=".48" />
    </svg>
  );
}
