import Loading from "@/components/misc/loading";
import Layout from "@/layouts/App";
import {
  AuthLoading,
  RedirectToSignIn,
  SignedIn,
} from "@daveyplate/better-auth-ui";

export function ProtectedLayout() {
  return (
    <>
      <AuthLoading>
        <Loading />
      </AuthLoading>

      <RedirectToSignIn />

      <SignedIn>
        <Layout />
      </SignedIn>
    </>
  );
}
