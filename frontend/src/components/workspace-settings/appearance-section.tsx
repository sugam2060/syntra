import { ThemeToggleGroup } from "@/components/shared/theme-toggle-group";
import { SettingsSectionCard } from "@/components/workspace-settings/settings-section-card";

/** Theme choice for the signed-in person. It is saved in this browser, not on the workspace. */
export function AppearanceSection() {
  return (
    <SettingsSectionCard
      titleId="appearance-heading"
      title="Appearance"
      description="Choose how Syntra looks on this device. System follows your operating system."
    >
      <div className="p-4">
        <ThemeToggleGroup />
      </div>
    </SettingsSectionCard>
  );
}
