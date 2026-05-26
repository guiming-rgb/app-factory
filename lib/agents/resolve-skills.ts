import type { AgentSkillBindings } from "@/lib/agents/skill-bindings";
import type { Skill } from "@/lib/skills/server";

export type AgentSkillInjectionSnapshot = {
  agentCode: string;
  boundCodes: string[];
  injectedCodes: string[];
  missingCodes: string[];
  skills: Skill[];
};

export function resolveAgentSkillInjection(
  agentCode: string,
  bindings: AgentSkillBindings,
  skillsByCode: Map<string, Skill>
): AgentSkillInjectionSnapshot {
  const boundCodes = bindings[agentCode] ?? [];
  const injectedCodes: string[] = [];
  const missingCodes: string[] = [];
  const skills: Skill[] = [];

  for (const code of boundCodes) {
    const skill = skillsByCode.get(code);
    if (skill) {
      injectedCodes.push(code);
      skills.push(skill);
    } else {
      missingCodes.push(code);
    }
  }

  return {
    agentCode,
    boundCodes,
    injectedCodes,
    missingCodes,
    skills
  };
}
