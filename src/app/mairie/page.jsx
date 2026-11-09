"use client";

import { Guard } from "@/components/Shell";
import { MairiePage } from "@/views/MairiePage";

export default function Page() {
  return (
    <Guard role="mairie">
      <MairiePage />
    </Guard>
  );
}
