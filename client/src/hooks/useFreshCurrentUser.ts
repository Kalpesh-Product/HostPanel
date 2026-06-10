import useAuth from "./useAuth";

/**
 * Returns the current authenticated user object (kept fresh via auth context).
 * Drop-in replacement for the useFreshCurrentUser hook from the source project.
 */
export function useFreshCurrentUser(): Record<string, any> | null {
  const { auth } = useAuth();
  return auth?.user ?? null;
}
