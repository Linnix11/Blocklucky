"use client";

import { useApp } from "@/components/Shell";
import { LoginPage } from "@/views/LoginPage";

export default function Page() {
  return <LoginPage onLogin={useApp().loadMe} />;
}
