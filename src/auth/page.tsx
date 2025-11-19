import { useParams } from "react-router-dom";
import { AuthCard } from "@daveyplate/better-auth-ui";

export default function AuthPage() {
  const { pathname } = useParams();

  return (
    <main className="flex min-h-screen items-center justify-center p-4 md:p-6">
      <AuthCard pathname={pathname} socialLayout="auto" />
    </main>
  );
}
