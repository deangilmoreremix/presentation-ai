# Agents

This project uses the Superpowers framework for agentic development.

## Setup

Superpowers skills are automatically loaded from `superpowers/skills/`. The agent will automatically invoke appropriate skills based on the task at hand.

## Workflow

The agent follows the Superpowers methodology:

1. **Brainstorming** - Refines ideas through questions before coding
2. **Writing plans** - Creates detailed implementation plans
3. **Test-driven development** - Enforces RED-GREEN-REFACTOR
4. **Subagent-driven development** - Parallel task execution with review
5. **Code review** - Reviews work against the plan
6. **Finishing branches** - Clean merge/release workflow

## Skills

The following Superpowers skills are available:

- test-driven-development
- systematic-debugging
- verification-before-completion
- brainstorming
- writing-plans
- executing-plans
- dispatching-parallel-agents
- requesting-code-review
- receiving-code-review
- using-git-worktrees
- finishing-a-development-branch
- subagent-driven-development
- writing-skills
- using-superpowers

See `superpowers/skills/` for detailed skill documentation.
