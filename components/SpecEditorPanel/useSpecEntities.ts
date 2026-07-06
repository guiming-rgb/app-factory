"use client";

import { useCallback } from "react";
import type { AppSpec } from "./useSpecEditor";

export function useSpecEntities(
  editSpec: AppSpec | null,
  setEditSpec: (s: AppSpec) => void
) {
  const addEntity = useCallback(() => {
    if (!editSpec) return;
    const entities = editSpec.entities ?? [];
    setEditSpec({ ...editSpec, entities: [...entities, { name: `entity_${entities.length + 1}`, fields: [{ name: "id", type: "uuid", primary: true }] }] });
  }, [editSpec, setEditSpec]);

  const removeEntity = useCallback((index: number) => {
    if (!editSpec) return;
    setEditSpec({ ...editSpec, entities: (editSpec.entities ?? []).filter((_, i) => i !== index) });
  }, [editSpec, setEditSpec]);

  const updateEntityName = useCallback((index: number, name: string) => {
    if (!editSpec) return;
    const entities = [...(editSpec.entities ?? [])];
    entities[index] = { ...entities[index], name };
    setEditSpec({ ...editSpec, entities });
  }, [editSpec, setEditSpec]);

  const addEntityField = useCallback((entityIndex: number) => {
    if (!editSpec) return;
    const entities = [...(editSpec.entities ?? [])];
    const fields = [...entities[entityIndex].fields];
    fields.push({ name: `field_${fields.length + 1}`, type: "string" });
    entities[entityIndex] = { ...entities[entityIndex], fields };
    setEditSpec({ ...editSpec, entities });
  }, [editSpec, setEditSpec]);

  const updateEntityField = useCallback((entityIndex: number, fieldIndex: number, field: string, value: string) => {
    if (!editSpec) return;
    const entities = [...(editSpec.entities ?? [])];
    const fields = [...entities[entityIndex].fields];
    if (field === "primary") {
      fields[fieldIndex] = { ...fields[fieldIndex], primary: !fields[fieldIndex].primary };
    } else {
      fields[fieldIndex] = { ...fields[fieldIndex], [field]: value };
    }
    entities[entityIndex] = { ...entities[entityIndex], fields };
    setEditSpec({ ...editSpec, entities });
  }, [editSpec, setEditSpec]);

  const removeEntityField = useCallback((entityIndex: number, fieldIndex: number) => {
    if (!editSpec) return;
    const entities = [...(editSpec.entities ?? [])];
    const fields = entities[entityIndex].fields.filter((_, i) => i !== fieldIndex);
    if (fields.length === 0) return;
    entities[entityIndex] = { ...entities[entityIndex], fields };
    setEditSpec({ ...editSpec, entities });
  }, [editSpec, setEditSpec]);

  return { addEntity, removeEntity, updateEntityName, addEntityField, updateEntityField, removeEntityField };
}
