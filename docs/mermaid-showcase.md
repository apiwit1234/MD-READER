# Mermaid Showcase

Open this file in **MD Reader** (MD mode) to verify every Mermaid diagram type
renders. Each diagram is interactive — scroll to zoom, middle-click to pan, and
use the ⛶ button for fullscreen.

## 1. Flowchart

```mermaid
flowchart TD
  A[Start] --> B{Is it working?}
  B -->|Yes| C[Ship it]
  B -->|No| D[Debug]
  D --> B
  C --> E([Done])
```

## 2. Sequence Diagram

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant A as App
  participant S as Server
  U->>A: Click "Save"
  A->>S: POST /save
  S-->>A: 200 OK
  A-->>U: Saved ✓
  Note over A,S: Retries on failure
```

## 3. Class Diagram

```mermaid
classDiagram
  class Animal {
    +String name
    +int age
    +makeSound() void
  }
  class Dog {
    +fetch() void
  }
  class Cat {
    +scratch() void
  }
  Animal <|-- Dog
  Animal <|-- Cat
```

## 4. State Diagram

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Loading: fetch
  Loading --> Success: ok
  Loading --> Error: fail
  Success --> Idle: reset
  Error --> Idle: retry
  Success --> [*]
```

## 5. Entity Relationship Diagram

```mermaid
erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  CUSTOMER {
    string name
    string email
  }
  ORDER {
    int id
    date createdAt
  }
```

## 6. User Journey

```mermaid
journey
  title My Working Day
  section Morning
    Make coffee: 5: Me
    Check email: 3: Me
  section Afternoon
    Write code: 4: Me, Team
    Review PRs: 2: Me
```

## 7. Gantt Chart

```mermaid
gantt
  title Project Plan
  dateFormat YYYY-MM-DD
  section Design
    Spec      :done,    des1, 2026-05-01, 5d
    Mockups   :active,  des2, after des1, 4d
  section Build
    Implement :         dev1, after des2, 10d
    Test      :         dev2, after dev1, 5d
```

## 8. Pie Chart

```mermaid
pie title Time Spent
  "Coding" : 45
  "Meetings" : 20
  "Reviews" : 15
  "Coffee" : 20
```

## 9. Git Graph

```mermaid
gitGraph
  commit
  branch develop
  checkout develop
  commit
  commit
  checkout main
  merge develop
  commit
```

## 10. Mindmap

```mermaid
mindmap
  root((MD Reader))
    Modes
      MD
      Code
      Terminal
    Git
      Commit
      Branch
      Diff
    Themes
      Light
      Dark
```

## 11. Timeline

```mermaid
timeline
  title Release History
  2026-05 : Markdown reader
          : Multi-folder
  2026-06 : Work modes
          : Git panel
```

## 12. Quadrant Chart

```mermaid
quadrantChart
  title Reach vs Engagement
  x-axis Low Reach --> High Reach
  y-axis Low Engagement --> High Engagement
  quadrant-1 Promote
  quadrant-2 Improve
  quadrant-3 Drop
  quadrant-4 Maintain
  Campaign A: [0.3, 0.6]
  Campaign B: [0.7, 0.8]
```

## 13. Requirement Diagram

```mermaid
requirementDiagram
  requirement test_req {
    id: 1
    text: the system shall read markdown
    risk: high
    verifymethod: test
  }
  element test_entity {
    type: simulation
  }
  test_entity - satisfies -> test_req
```

## 14. Sankey

```mermaid
sankey-beta

Source,Process,10
Process,Output A,6
Process,Output B,4
```

## 15. XY Chart

```mermaid
xychart-beta
  title "Monthly Revenue"
  x-axis [jan, feb, mar, apr, may]
  y-axis "Revenue ($k)" 0 --> 100
  bar [30, 50, 45, 80, 70]
  line [30, 50, 45, 80, 70]
```

> **Note:** `block-beta` is intentionally omitted — mermaid 11.15.0 throws an
> internal "Converting circular structure to JSON" error when rendering block
> diagrams, so it cannot be displayed in any host. Remove this note if a future
> mermaid release fixes it.

## 16. C4 Context

```mermaid
C4Context
  title System Context — MD Reader
  Person(user, "User", "Reads docs & code")
  System(app, "MD Reader", "Desktop reader")
  System_Ext(git, "Git", "Version control")
  Rel(user, app, "Uses")
  Rel(app, git, "Runs commands")
```

## 17. Packet

```mermaid
packet-beta
  0-15: "Source Port"
  16-31: "Destination Port"
  32-63: "Sequence Number"
```
