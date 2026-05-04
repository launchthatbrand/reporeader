import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

const passwordProvider = Password({
  profile(params) {
    const email = typeof params.email === "string" ? params.email : "";
    const name = typeof params.name === "string" ? params.name : undefined;

    return {
      email,
      ...(name?.trim() ? { name: name.trim() } : {}),
      // RepoReader currently runs as a single-tenant operator workspace.
      isAdmin: true,
    };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [passwordProvider],
});
