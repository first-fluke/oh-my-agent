# PM Agent - Examples

The first two plans illustrate executable acceptance contracts for a sample
project that already has Bun test scripts. Before dispatch, replace the sample
paths and commands with the target project's existing checks and confirm that
they cover the stated criteria. Preserve injected session IDs and freeze the
contract at first dispatch; these commands are not universal toolchain defaults.

## Example 1: Simple TODO App

**Input**: "Build a TODO app with JWT authentication"

**Output**:
```json
{
  "project_name": "TODO App with JWT Auth",
  "tech_stack": {
    "frontend": "resolve from oma-frontend/resources/tech-stack.md at planning time",
    "backend": "resolve from oma-backend/variants/{node,python,rust}/tech-stack.md at planning time",
    "mobile": "",
    "database": "resolve from oma-db guidance at planning time",
    "infrastructure": ""
  },
  "tasks": [
    {
      "id": "task-1",
      "agent": "backend",
      "title": "JWT authentication API",
      "priority": 1,
      "dependencies": [],
      "estimated_complexity": "high",
      "scope": [
        "src/api/auth/",
        "tests/api/auth.test.ts"
      ],
      "test_approach": "tdd",
      "test_scope": [
        "unit",
        "integration"
      ],
      "test_approach_rationale": "Deterministic authorization rules with clear inputs and outputs.",
      "acceptance_criteria": [
        {
          "id": "AC1",
          "description": "POST /api/auth/register with email + password"
        },
        {
          "id": "AC2",
          "description": "POST /api/auth/login returns access + refresh tokens"
        },
        {
          "id": "AC3",
          "description": "Password hashed with Argon2id"
        },
        {
          "id": "AC4",
          "description": "Authentication rate limiting matches the declared project policy"
        }
      ],
      "task": "Implement registration/login within src/api/auth and its tests using the agreed auth contract. Validate unauthorized access, credential storage, token handling, and the configured rate limit. Run the pinned auth check.",
      "required_checks": [
        {
          "id": "check-task-1",
          "criteria": [
            "AC1",
            "AC2",
            "AC3",
            "AC4"
          ],
          "command": [
            "bun",
            "run",
            "test",
            "--",
            "tests/api/auth.test.ts"
          ],
          "cwd": "."
        }
      ],
      "retry_policy": "manual"
    },
    {
      "id": "task-2",
      "agent": "backend",
      "title": "TODO CRUD API",
      "priority": 1,
      "dependencies": [],
      "estimated_complexity": "medium",
      "scope": [
        "src/api/todos/",
        "tests/api/todos.test.ts"
      ],
      "acceptance_criteria": [
        {
          "id": "AC1",
          "description": "CRUD endpoints for /api/todos"
        },
        {
          "id": "AC2",
          "description": "User-scoped (JWT required)"
        },
        {
          "id": "AC3",
          "description": "Pagination on list endpoint"
        }
      ],
      "task": "Implement authenticated, user-scoped TODO CRUD and pagination within src/api/todos and its tests using the agreed API contract. Run the pinned todos check.",
      "required_checks": [
        {
          "id": "check-task-2",
          "criteria": [
            "AC1",
            "AC2",
            "AC3"
          ],
          "command": [
            "bun",
            "run",
            "test",
            "--",
            "tests/api/todos.test.ts"
          ],
          "cwd": "."
        }
      ],
      "retry_policy": "manual"
    },
    {
      "id": "task-3",
      "agent": "frontend",
      "title": "Login + Register UI",
      "priority": 1,
      "dependencies": [],
      "estimated_complexity": "medium",
      "scope": [
        "src/web/auth/",
        "tests/web/auth.test.ts"
      ],
      "acceptance_criteria": [
        {
          "id": "AC1",
          "description": "Login and register forms with validation"
        },
        {
          "id": "AC2",
          "description": "JWT token storage"
        },
        {
          "id": "AC3",
          "description": "Redirect to /todos after login"
        }
      ],
      "task": "Implement login/register forms, validated submission, session handling, and navigation within src/web/auth and its tests using the agreed auth contract. Run the pinned auth UI check.",
      "required_checks": [
        {
          "id": "check-task-3",
          "criteria": [
            "AC1",
            "AC2",
            "AC3"
          ],
          "command": [
            "bun",
            "run",
            "test",
            "--",
            "tests/web/auth.test.ts"
          ],
          "cwd": "."
        }
      ],
      "retry_policy": "manual"
    },
    {
      "id": "task-4",
      "agent": "frontend",
      "title": "TODO List UI",
      "priority": 2,
      "dependencies": [
        "task-2",
        "task-3"
      ],
      "estimated_complexity": "medium",
      "scope": [
        "src/web/todos/",
        "tests/web/todos.test.ts"
      ],
      "acceptance_criteria": [
        {
          "id": "AC1",
          "description": "Add, toggle, delete todos"
        },
        {
          "id": "AC2",
          "description": "Loading and empty states"
        },
        {
          "id": "AC3",
          "description": "Responsive design"
        }
      ],
      "task": "Implement adding, toggling, and deleting todos plus loading/empty and responsive states within src/web/todos and its tests. Reuse task-2 and task-3 contracts. Run the pinned todos UI check.",
      "required_checks": [
        {
          "id": "check-task-4",
          "criteria": [
            "AC1",
            "AC2",
            "AC3"
          ],
          "command": [
            "bun",
            "run",
            "test",
            "--",
            "tests/web/todos.test.ts"
          ],
          "cwd": "."
        }
      ],
      "retry_policy": "manual"
    },
    {
      "id": "task-5",
      "agent": "qa",
      "title": "Security & Performance Review",
      "priority": 3,
      "dependencies": [
        "task-1",
        "task-2",
        "task-3",
        "task-4"
      ],
      "estimated_complexity": "medium",
      "scope": [],
      "acceptance_criteria": [
        {
          "id": "AC1",
          "description": "OWASP Top 10 audit passed"
        },
        {
          "id": "AC2",
          "description": "Changed UI paths meet the declared project performance targets"
        },
        {
          "id": "AC3",
          "description": "No N+1 queries"
        }
      ],
      "task": "Review the changed auth, TODO API, and UI paths against the project security/performance requirements. Run the existing test:review check and record confirmed findings separately from verification gaps. Do not claim checks that were not run.",
      "required_checks": [
        {
          "id": "check-task-5",
          "criteria": [
            "AC1",
            "AC2",
            "AC3"
          ],
          "command": [
            "bun",
            "run",
            "test:review"
          ],
          "cwd": "."
        }
      ],
      "retry_policy": "manual"
    }
  ],
  "session_id": "sample-todo-plan"
}
```

## Example 2: Feature Addition to Existing App

**Input**: "Add a comment system to the blog posts"

**Output**:
```json
{
  "project_name": "Blog Comments Feature",
  "tasks": [
    {
      "id": "task-1",
      "agent": "backend",
      "title": "Comments API",
      "priority": 1,
      "dependencies": [],
      "estimated_complexity": "medium",
      "scope": [
        "src/api/comments/",
        "migrations/",
        "tests/api/comments.test.ts"
      ],
      "acceptance_criteria": [
        {
          "id": "AC1",
          "description": "POST /api/posts/{id}/comments (auth required)"
        },
        {
          "id": "AC2",
          "description": "GET /api/posts/{id}/comments (public, paginated)"
        },
        {
          "id": "AC3",
          "description": "DELETE /api/comments/{id} (owner only)"
        },
        {
          "id": "AC4",
          "description": "Nested replies (1 level deep)"
        }
      ],
      "task": "Implement paginated comments, one-level replies, and authenticated creation/owner-only deletion within the comments API, migrations, and tests using the agreed API contract. Run the pinned comments API check.",
      "required_checks": [
        {
          "id": "check-task-1",
          "criteria": [
            "AC1",
            "AC2",
            "AC3",
            "AC4"
          ],
          "command": [
            "bun",
            "run",
            "test",
            "--",
            "tests/api/comments.test.ts"
          ],
          "cwd": "."
        }
      ],
      "retry_policy": "manual"
    },
    {
      "id": "task-2",
      "agent": "frontend",
      "title": "Comment Section UI",
      "priority": 2,
      "dependencies": [
        "task-1"
      ],
      "estimated_complexity": "medium",
      "scope": [
        "src/web/comments/",
        "tests/web/comments.test.ts"
      ],
      "acceptance_criteria": [
        {
          "id": "AC1",
          "description": "Comment list with pagination (load more)"
        },
        {
          "id": "AC2",
          "description": "Add comment form (auth required)"
        },
        {
          "id": "AC3",
          "description": "Reply to comment"
        },
        {
          "id": "AC4",
          "description": "Delete own comment"
        },
        {
          "id": "AC5",
          "description": "Real-time count update"
        }
      ],
      "task": "Implement paginated comment display, authenticated creation, replies, owner deletion, and count updates within src/web/comments and its tests using the task-1 API contract. Run the pinned comments UI check.",
      "required_checks": [
        {
          "id": "check-task-2",
          "criteria": [
            "AC1",
            "AC2",
            "AC3",
            "AC4",
            "AC5"
          ],
          "command": [
            "bun",
            "run",
            "test",
            "--",
            "tests/web/comments.test.ts"
          ],
          "cwd": "."
        }
      ],
      "retry_policy": "manual"
    }
  ],
  "session_id": "sample-comments-plan"
}
```

## Example 3: Standards-Aligned Metadata Fragment

This is governance metadata to append to an existing plan, not a complete
executable plan. Executable tasks still need the acceptance/check/replay
contract shown above. Include controls only when the delivery context needs them.

**Input**: "Plan this enterprise release with risk and governance considerations"

**Output**:
```json
{
  "project_name": "Enterprise Release Plan",
  "architecture_decisions": [
    {
      "decision": "Use phased rollout with feature flags",
      "rationale": "Reduces operational risk during release",
      "alternatives_considered": ["big bang release", "tenant-by-tenant rollout"]
    }
  ],
  "project_controls": {
    "iso_21500": {
      "scope_defined": true,
      "stakeholders_identified": ["product", "security", "operations"],
      "dependencies_mapped": true
    },
    "iso_31000": {
      "top_risks": [
        "migration rollback failure",
        "auth regression on legacy users"
      ],
      "treatments": [
        "pre-release restore drill",
        "shadow auth validation"
      ]
    },
    "iso_38500": {
      "decision_owner": "engineering manager",
      "approval_required_for": ["prod migration", "feature-flag enablement"]
    }
  }
}
```
