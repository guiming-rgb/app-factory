"use client";

import type { AppSpec } from "./useSpecEditor";
import { ScreenSection } from "./ScreenSection";
import { EntitySection } from "./EntitySection";
import { NavigationSection } from "./NavigationSection";

type Props = {
  spec: AppSpec;
  editing: boolean;
  expandedSection: "screens" | "entities" | "nav" | null;
  setExpandedSection: (section: "screens" | "entities" | "nav" | null) => void;
  addScreen: () => void;
  removeScreen: (i: number) => void;
  updateScreen: (i: number, field: "id" | "title" | "type" | "entity", value: string) => void;
  addEntity: () => void;
  removeEntity: (i: number) => void;
  updateEntityName: (i: number, name: string) => void;
  addEntityField: (entityIndex: number) => void;
  updateEntityField: (entityIndex: number, fieldIndex: number, field: string, value: string) => void;
  removeEntityField: (entityIndex: number, fieldIndex: number) => void;
  updateTab: (i: number, value: string) => void;
};

/**
 * Spec 三组可展开编辑区：页面列表、实体定义、导航配置
 */
export function SpecSectionList({
  spec,
  editing,
  expandedSection,
  setExpandedSection,
  addScreen,
  removeScreen,
  updateScreen,
  addEntity,
  removeEntity,
  updateEntityName,
  addEntityField,
  updateEntityField,
  removeEntityField,
  updateTab,
}: Props) {
  return (
    <div className="mt-3 space-y-3">
      <ScreenSection
        editing={editing}
        screens={spec.screens}
        expanded={expandedSection === "screens"}
        onToggle={() => setExpandedSection(expandedSection === "screens" ? null : "screens")}
        onAdd={addScreen}
        onRemove={removeScreen}
        onUpdate={updateScreen}
      />

      <EntitySection
        editing={editing}
        entities={spec.entities ?? []}
        expanded={expandedSection === "entities"}
        onToggle={() => setExpandedSection(expandedSection === "entities" ? null : "entities")}
        onAdd={addEntity}
        onRemove={removeEntity}
        onUpdateName={updateEntityName}
        onAddField={addEntityField}
        onUpdateField={updateEntityField}
        onRemoveField={removeEntityField}
      />

      <NavigationSection
        editing={editing}
        tabs={spec.navigation?.tabs ?? []}
        expanded={expandedSection === "nav"}
        onToggle={() => setExpandedSection(expandedSection === "nav" ? null : "nav")}
        onUpdate={updateTab}
      />
    </div>
  );
}
