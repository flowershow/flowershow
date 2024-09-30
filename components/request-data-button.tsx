"use client";
import { ReactNode } from "react";

import { useModal } from "@/components/modal/provider";
import { Button } from "@/components/button";

export default function RequestDataButton({
  children,
}: {
  children: ReactNode;
}) {
  const modal = useModal();
  return <Button onClick={() => modal?.show(children)}>Request Data</Button>;
}
