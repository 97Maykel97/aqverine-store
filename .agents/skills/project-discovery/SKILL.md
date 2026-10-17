---
name: project-discovery
description: Investigate an unfamiliar repository before a significant change without modifying it.
---

# Project Discovery

Use this skill before a significant implementation or architectural change in an unfamiliar repository.

## Procedure

1. Inspect repository guidance (`AGENTS.md`, project docs, package manifests, lockfiles, and configuration).
2. Collect factual evidence about the technology stack, scripts, routes, feature boundaries, data flows, environment-variable names, integrations, tests, and deployment assumptions.
3. Identify risks: missing documentation, untracked schema changes, exposed secrets, incompatible dependency choices, authorization gaps, and unverified payment flows.
4. Report findings with file references and clearly mark assumptions or unknowns.

## Constraints

- This skill is read-only. Do not change code, configuration, dependencies, or documentation without a separate user request.
- Do not print secret values. Report only environment-variable names and whether their configuration appears required.
- Do not infer runtime behavior without supporting repository evidence.
