import { SettingsCards } from "@daveyplate/better-auth-ui";

export default function Settings() {
  return (
    <div className="py-12 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex justify-center">
        <SettingsCards className="max-w-xl" />
      </div>
    </div>
  );
}
