"use client";

import { useCallback } from "react";
import type { AppSpec, SpecScreen } from "./useSpecEditor";

export function useSpecScreens(
  editSpec: AppSpec | null,
  setEditSpec: (s: AppSpec) => void
) {
  const updateScreen = useCallback((index: number, field: keyof SpecScreen, value: string) => {
    if (!editSpec) return;
    const screens = [...editSpec.screens];
    screens[index] = { ...screens[index], [field]: value };
    setEditSpec({ ...editSpec, screens });
  }, [editSpec, setEditSpec]);

  const addScreen = useCallback(() => {
    if (!editSpec) return;
    const newId = `screen_${editSpec.screens.length + 1}`;
    setEditSpec({
      ...editSpec,
      screens: [...editSpec.screens, { id: newId, title: `新页面 ${editSpec.screens.length + 1}`, type: "placeholder" }]
    });
  }, [editSpec, setEditSpec]);

  const removeScreen = useCallback((index: number) => {
    if (!editSpec || editSpec.screens.length <= 1) return;
    setEditSpec({ ...editSpec, screens: editSpec.screens.filter((_, i) => i !== index) });
  }, [editSpec, setEditSpec]);

  return { updateScreen, addScreen, removeScreen };
}
