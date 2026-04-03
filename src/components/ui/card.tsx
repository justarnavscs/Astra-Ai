import * as React from "react";
import clsx from "clsx";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return <div className={clsx("mb-4 flex items-center justify-between gap-3", className)} {...props} />;
}

export type CardTitleProps = React.HTMLAttributes<HTMLParagraphElement>;

export function CardTitle({ className, ...props }: CardTitleProps) {
  return <p className={clsx("text-sm font-semibold text-white", className)} {...props} />;
}

export type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return <p className={clsx("text-xs text-slate-300", className)} {...props} />;
}

export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

export function CardContent({ className, ...props }: CardContentProps) {
  return <div className={clsx("space-y-3", className)} {...props} />;
}
