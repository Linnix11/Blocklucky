import { currentUser, json, route } from "@/server/auth";

export const GET = route(null, async () => {
  const user = await currentUser();
  return json(user ? { role: user.role, email: user.email, cityId: user.cityId ?? null } : null);
});
