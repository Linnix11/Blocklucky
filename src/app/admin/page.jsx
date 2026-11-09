"use client";

import { Guard, useApp } from "@/components/Shell";
import { AdminPage } from "@/views/AdminPage";

export default function Page() {
  const { loadCities } = useApp();
  return (
    <Guard role="admin">
      <AdminPage onChange={loadCities} />
    </Guard>
  );
}
