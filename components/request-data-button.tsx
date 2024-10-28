"use client";
import { ReactNode } from "react";

import { useModal } from "@/components/modal/provider";
import { Button } from "@/components/button";
import { cn } from "@/lib/utils";

export default function RequestDataButton({
  children,
  text,
  style = "button",
  className,
}: {
  children: ReactNode;
  text?: string;
  style?: "button" | "text";
  className?: string;
}) {
  const modal = useModal();

  return style === "button" ? (
    <Button className={className} onClick={() => modal?.show(children)}>
      {text || "Request Data"}
    </Button>
  ) : (
    <span
      className={cn("cursor-pointer", className)}
      onClick={() => modal?.show(children)}
    >
      {text || "Request Data"}
    </span>
  );
}
