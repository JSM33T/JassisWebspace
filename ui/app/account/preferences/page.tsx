"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useThemeSet } from "@/components/theme-provider";
import { useUser } from "@/contexts/UserContext";
import { buildAuthRequiredLoginHref, persistLoginRedirectTarget } from "@/lib/auth-redirect";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function PreferencesPage() {
  const { user, isInitialized } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { activeThemeSetId, setActiveThemeSetId, themeSets } = useThemeSet();
  const currentPathWithQuery = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (!user) {
      persistLoginRedirectTarget(currentPathWithQuery);
      router.replace(buildAuthRequiredLoginHref(currentPathWithQuery));
    }
  }, [currentPathWithQuery, isInitialized, router, user]);

  const handleSaveSettings = () => {
    toast.success("Settings saved successfully!");
  };
  if (!isInitialized || !user || !resolvedTheme) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          <motion.div variants={itemVariants}>
            <Link
              href="/account/profile"
              className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-2">
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account preferences and privacy settings
            </p>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <SettingsIcon className="mr-2 h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>Basic preferences for your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Theme Mode</label>
                    <p className="text-xs text-muted-foreground">
                      Choose between light and dark mode
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm capitalize">
                      {theme === "system" ? "System" : theme}
                    </span>
                    <Switch
                      checked={theme === "dark"}
                      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium">Theme Set</label>
                    <p className="text-xs text-muted-foreground">
                      Stored in <code>ui/themes</code>, independent of light/dark mode.
                    </p>
                  </div>
                  <Select value={activeThemeSetId} onValueChange={setActiveThemeSetId}>
                    <SelectTrigger className="w-full sm:w-[320px]">
                      <SelectValue placeholder="Select a theme set" />
                    </SelectTrigger>
                    <SelectContent>
                      {themeSets.map((themeSet) => (
                        <SelectItem key={themeSet.id} value={themeSet.id}>
                          {themeSet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Active set: {themeSets.find((themeSet) => themeSet.id === activeThemeSetId)?.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="flex justify-end space-x-4">
              <Button variant="outline" onClick={() => window.history.back()}>
                Cancel
              </Button>
              <Button onClick={handleSaveSettings}>Save Changes</Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}


