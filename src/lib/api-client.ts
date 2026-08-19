export type SessionTokenGetter = () => Promise<string | null>;

export async function sessionAuthorizationHeader(
  getToken: SessionTokenGetter,
): Promise<Record<string, string>> {
  const token = await getToken();
  if (!token) throw new Error("Sign in to continue.");
  return { Authorization: `Bearer ${token}` };
}
