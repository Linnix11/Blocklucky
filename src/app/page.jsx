"use client";

import { useApp } from "@/components/Shell";
import { HomePage } from "@/views/HomePage";

export default function Page() {
  return <HomePage cities={useApp().cities} />;
}
