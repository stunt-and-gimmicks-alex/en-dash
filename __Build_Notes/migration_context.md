# En-Dash Frontend Migration Context

## 🎯 **Migration Overview**

We're migrating en-dash frontend from old REST API + legacy patterns → new unified backend API + modern React patterns. Following a "green filename doctrine" - no progress until TypeScript errors are resolved.

## 📁 **Current State**

- ✅ **Completed**: App.tsx, AppLayout.tsx, pages (empty stubs)
- ✅ **New API Layer**: Created `newApiServices.ts` + `useNewApi.ts` hooks (running alongside old API)
- 🚧 **In Progress**: Navigation components (Sidebar, MobileNavbar)
- ⏳ **Next**: Sub-components, then individual page component migration

## 🔧 **Tech Stack Context**

- **ChakraUI v3** (vs v2 in training data) - check docs or ask for component examples
- **New Backend**: Unified stack processing + WebSockets for real-time data
- **Path Alias**: `@/` points to app home
- **Philosophy**: Backend handles data transformation, frontend just renders

## 📦 **New API Services Structure**

```typescript
// NEW (alongside old)
import { useStacks, useStack, useStackContainers } from "@/hooks/useNewApi";
import { newApiService } from "@/services/newApiServices";

// OLD (still running)
import { useDockgeStacks } from "@/hooks/useApi";
import { apiService } from "@/services/apiService";
```

## 🗂️ **File Structure Changes**

```
frontend/src/
├── types/navigation.ts           # 🆕 Centralized nav types
├── services/newApiServices.ts    # 🆕 Clean API layer
├── hooks/useNewApi.ts            # 🆕 Modern hooks
├── components/
│   ├── navigation/               # 🆕 Cleaned nav folder
│   │   ├── Sidebar.tsx          # 🆕 Clean desktop nav
│   │   ├── MobileNavbar.tsx     # 🆕 Clean mobile nav
│   │   └── [existing helpers]   # 📦 Move existing: Logo.tsx, SearchField.tsx, etc.
│   └── layout/AppLayout.tsx     # ✅ Updated
└── App.tsx                      # ✅ Updated
```

## 🎯 **Migration Strategy**

1. **Phase 1**: Navigation (current) - centralize types, clean components
2. **Phase 2**: Individual components (ContainerBlock, etc.) - update to use new hooks + ChakraUI v3
3. **Phase 3**: Remove old API layer once all components migrated

## 🚨 **Key Patterns**

### **Navigation Types** (centralized)

```typescript
import type { PageKey, NavigationProps } from "@/types/navigation";
// No more duplicated CurrentPage types!
```

### **New API Usage**

```typescript
// Component-ready data (no transformation needed)
const { containers } = useStackContainers(stackName);
const { stacks } = useStacks();

// Real-time updates
const { stats } = useRealtimeSystemStats();
```

### **ChakraUI v3 Patterns**

```typescript
// Use brand.* theme tokens
bg = "brand.surfaceContainerLowest";
color = "brand.onSurface";
borderColor = "brand.subtle";
```

## 📝 **Current Task**

Migrating navigation sub-components (Logo.tsx, SearchField.tsx, SidebarLink.tsx, etc.) from `components/sidebar/` → `components/navigation/` folder while ensuring they work with the new clean Sidebar.tsx.

## ⚡ **Next Steps**

1. Move navigation helper components to new folder
2. Update import paths
3. Test navigation functionality
4. Pick first page component to migrate (likely ContainerBlock)

---

_Copy this context when starting new conversations to maintain migration continuity._
