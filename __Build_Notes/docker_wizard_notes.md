# En-Dash Wizard Validation Rules

> Real-world validation rules discovered during development and testing

## 🎯 Why This Matters: Docker's User Experience Problem

Docker Compose provides powerful functionality but terrible error messages and user experience. Every error we encounter during development represents a pain point that En-Dash should solve with better validation and helpful messaging.

### **Real Examples from SurrealDB Deployment:**

| Docker's Unhelpful Message                                                                             | En-Dash's Better Message                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Error response from daemon: invalid pool request: Pool overlaps with other one on this address space` | ⚠️ **Network conflict**: Subnet `172.20.0.0/24` conflicts with existing `localweb` network. **Try**: `172.22.0.0/24` instead. [Auto-fix]                                                |
| `failed to bind host port for 127.0.0.1:8000:172.21.0.6:8000/tcp: address already in use`              | ⚠️ **Port conflict**: Port `8000` is already in use. **Options**: Use different port `8080`, auto-assign `::8000`, or stop conflicting service. [Show options]                          |
| `container surrealdb-database-1 is unhealthy` _(70 second timeout)_                                    | ❌ **Health check failed**: Command `curl -f http://localhost:8000/health` failed - `curl` not found in `surrealdb/surrealdb` container. **Fix**: Use `wget` instead? [Auto-fix]        |
| `error: unexpected argument '--path' found`                                                            | ❌ **Version incompatibility**: SurrealDB v1.5+ doesn't support `--path` argument. **Fix**: Use `file:///data/database.db` instead of `--path /data/database.db`. [Auto-fix]            |
| `dependency failed to start: container surrealdb-database-1 has no healthcheck configured`             | ⚠️ **Dependency issue**: Service `backup` expects health check from `database` but none configured. **Fix**: Add health check or change to `condition: service_started`. [Show options] |

### **Why En-Dash Validation Matters:**

1. **Immediate feedback** instead of cryptic runtime failures
2. **Contextual solutions** instead of generic error codes
3. **Auto-fix suggestions** instead of manual troubleshooting
4. **Educational messages** that teach best practices
5. **Prevention** of common homelab pitfalls

**Every validation rule comes from real pain points.** This document captures the lessons learned from actual deployment failures, ensuring En-Dash users never experience the same frustrations.

## 🚨 Critical Errors (Block Deployment)

### **1. Image Version Compatibility**

**Issue**: Different image versions have incompatible command arguments
**Example**: SurrealDB v1.5+ changed from `--path` to `file://` syntax

```yaml
# ❌ Broken (old syntax)
command: start --path /data/db.db

# ✅ Fixed (new syntax)
command: start file:///data/db.db
```

**Validation**:

```typescript
if (
  service.image?.includes("surrealdb:v1.5") &&
  service.command?.includes("--path")
) {
  errors.push({
    service: serviceName,
    issue: "SurrealDB v1.5+ doesn't support --path argument",
    fix: "Use 'file:///data/database.db' instead of '--path /data/database.db'",
    severity: "error",
    docs: "https://surrealdb.com/docs/surrealql/statements/define/database",
  });
}
```

### **2. Port Conflicts**

**Issue**: Trying to bind to ports already in use on the host
**Example**: Port 8000 already used by another service

```yaml
# ❌ Broken
ports:
  - "8000:8000"  # Port already in use

# ✅ Fixed
ports:
  - "::8000"     # Let Docker pick available port
```

**Validation**:

```typescript
const usedPorts = await getUsedPorts();
if (usedPorts.includes(extractHostPort(portMapping))) {
  errors.push({
    service: serviceName,
    issue: `Port ${hostPort} already in use`,
    fix: "Use different port or auto-assignment (::containerPort)",
    severity: "error",
  });
}
```

### **3. Network Subnet Conflicts**

**Issue**: Custom network subnet overlaps with existing Docker networks
**Example**: Trying to use 172.20.0.0/24 when 172.20.0.0/16 exists

```yaml
# ❌ Broken
networks:
  my-network:
    ipam:
      config:
        - subnet: 172.20.0.0/24  # Conflicts with existing 172.20.0.0/16

# ✅ Fixed
networks:
  my-network:
    ipam:
      config:
        - subnet: 172.22.0.0/24  # Non-conflicting range
```

**Validation**:

```typescript
const existingNetworks = await docker.listNetworks();
if (hasSubnetOverlap(newSubnet, existingNetworks)) {
  errors.push({
    network: networkName,
    issue: `Subnet ${subnet} conflicts with existing network`,
    fix: "Choose different subnet range (e.g., 172.22.0.0/24)",
    severity: "error",
  });
}
```

### **4. Health Check Dependencies Missing**

**Issue**: Health checks reference tools not installed in the container
**Example**: Using `curl` in health check when container only has `wget`

```yaml
# ❌ Broken (curl not installed)
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]

# ✅ Fixed (use available tool)
healthcheck:
  test: ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost:8000/health || exit 1"]
  # Or basic port check
  test: ["CMD-SHELL", "nc -z localhost 8000 || exit 1"]
```

**Validation**:

```typescript
const healthcheckTools = extractToolsFromHealthcheck(service.healthcheck);
const availableTools = await getAvailableToolsInImage(service.image);
const missingTools = healthcheckTools.filter(
  (tool) => !availableTools.includes(tool)
);

if (missingTools.length > 0) {
  errors.push({
    service: serviceName,
    issue: `Health check uses unavailable tools: ${missingTools.join(", ")}`,
    fix: "Use available tools or install dependencies",
    severity: "error",
    suggestions: generateAlternativeHealthchecks(service),
  });
}
```

### **5. Missing Required Directories**

**Issue**: Bind mounts reference directories that don't exist
**Example**: Volume mount to non-existent host directory

```yaml
# ❌ Broken
volumes:
  - ./data/database:/data  # ./data/database doesn't exist

# ✅ Fixed (wizard should create or warn)
volumes:
  - database_data:/data    # Use named volume instead
```

**Validation**:

```typescript
if (isBindMount(volume) && !hostPathExists(volume.source)) {
  errors.push({
    service: serviceName,
    issue: `Host directory ${volume.source} does not exist`,
    fix: "Create directory or use named volume",
    severity: "error",
  });
}
```

## ⚠️ Warnings (Allow but Warn)

### **5. Container Names Prevent Scaling**

**Issue**: Explicit container names prevent `docker-compose scale`
**Reference**: Docker Compose docs

```yaml
# ❌ Prevents scaling
services:
  database:
    container_name: my-db

# ✅ Allows scaling
services:
  database:
    # No container_name - Docker generates unique names
```

**Validation**:

```typescript
if (service.container_name) {
  warnings.push({
    service: serviceName,
    issue: "container_name prevents scaling",
    fix: "Remove container_name to enable 'docker-compose up --scale service=N'",
    severity: "warning",
    autoFix: () => delete service.container_name,
  });
}
```

### **6. Missing Health Checks for Critical Services**

**Issue**: Database/critical services without health checks cause dependency issues

```yaml
# ❌ No health check
services:
  database:
    image: postgres:15

# ✅ With health check
services:
  database:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3
```

**Validation**:

```typescript
if (isCriticalService(service) && !service.healthcheck) {
  warnings.push({
    service: serviceName,
    issue: "Critical service missing health check",
    fix: "Add healthcheck for better orchestration",
    severity: "warning",
    suggestion: generateHealthCheck(service.image),
  });
}
```

### **7. Insecure Port Bindings**

**Issue**: Binding sensitive services to all interfaces

```yaml
# ❌ Exposed to all interfaces
ports:
  - "5432:5432"  # Database accessible from anywhere

# ✅ Localhost only
ports:
  - "127.0.0.1:5432:5432"  # Only accessible locally
```

**Validation**:

```typescript
if (isDatabasePort(port) && !isLocalhostBound(portMapping)) {
  warnings.push({
    service: serviceName,
    issue: "Database port exposed to all interfaces",
    fix: "Bind to localhost only: '127.0.0.1:port:port'",
    severity: "warning",
  });
}
```

### **8. Obsolete Compose File Version**

**Issue**: Using deprecated `version` field in compose files

```yaml
# ❌ Obsolete
version: "3.8" # Not needed in modern Docker Compose

# ✅ Modern
# No version field needed
```

**Validation**:

```typescript
if (composeData.version) {
  warnings.push({
    issue: "version field is obsolete in modern Docker Compose",
    fix: "Remove version field entirely",
    severity: "warning",
    autoFix: () => delete composeData.version,
  });
}
```

## 💡 Suggestions (Nice to Have)

### **9. Suggest Using Existing Networks**

**Issue**: Creating isolated networks when integration would be better

```yaml
# 🤔 Creates isolation
networks:
  my-network:
    driver: bridge

# 💡 Better integration
networks:
  localweb:
    external: true  # Use existing Caddy network
```

**Validation**:

```typescript
const existingNetworks = await getExistingNetworks();
if (existingNetworks.includes("localweb") && !usesNetwork(stack, "localweb")) {
  suggestions.push({
    suggestion:
      "Consider using existing 'localweb' network for Caddy integration",
    benefit: "Enables automatic HTTPS and domain routing",
  });
}
```

### **10. Resource Limits Recommendations**

**Issue**: Services without resource constraints can impact system stability

```yaml
# 🤔 No limits
services:
  database:
    image: postgres:15

# 💡 With sensible limits
services:
  database:
    image: postgres:15
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

**Validation**:

```typescript
if (!service.deploy?.resources?.limits) {
  suggestions.push({
    service: serviceName,
    suggestion: "Add resource limits for system stability",
    benefit: "Prevents runaway processes from affecting other services",
  });
}
```

### **11. Backup Strategy Suggestions**

**Issue**: Stateful services without backup consideration

```yaml
# 🤔 No backup strategy
services:
  database:
    volumes:
      - db_data:/var/lib/postgresql/data

# 💡 With backup service
services:
  database:
    volumes:
      - db_data:/var/lib/postgresql/data
  backup:
    image: postgres:15
    # Automated backup configuration
```

## 🎯 Wizard Enhancement: Pre-built Health Checks

### **Health Check Templates**

Instead of users writing custom health checks, provide tested templates:

```typescript
const HEALTHCHECK_TEMPLATES = {
  postgres: {
    test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"],
    interval: "30s",
    timeout: "10s",
    retries: 3,
    description: "PostgreSQL ready check",
  },

  mysql: {
    test: ["CMD-SHELL", "mysqladmin ping -h localhost"],
    interval: "30s",
    timeout: "10s",
    retries: 3,
    description: "MySQL ping check",
  },

  redis: {
    test: ["CMD-SHELL", "redis-cli ping"],
    interval: "30s",
    timeout: "5s",
    retries: 3,
    description: "Redis ping check",
  },

  surrealdb: {
    test: [
      "CMD-SHELL",
      "wget --quiet --tries=1 --spider http://localhost:8000/health || exit 1",
    ],
    interval: "30s",
    timeout: "10s",
    retries: 3,
    description: "SurrealDB HTTP health check",
  },

  nginx: {
    test: ["CMD-SHELL", "curl -f http://localhost:80/ || exit 1"],
    interval: "30s",
    timeout: "10s",
    retries: 3,
    description: "Nginx HTTP check",
  },

  "generic-http": {
    test: [
      "CMD-SHELL",
      "wget --quiet --tries=1 --spider http://localhost:${PORT:-8080}/health || exit 1",
    ],
    interval: "30s",
    timeout: "10s",
    retries: 3,
    description: "Generic HTTP health endpoint",
  },

  "port-check": {
    test: ["CMD-SHELL", "nc -z localhost ${PORT:-8080}"],
    interval: "30s",
    timeout: "5s",
    retries: 3,
    description: "Simple port connectivity check",
  },
};

// Wizard UI Component
const HealthCheckSelector = ({ service, onChange }) => {
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customHealthcheck, setCustomHealthcheck] = useState("");

  const suggestedTemplates = getSuggestedHealthchecks(service.image);

  return (
    <Stack gap="4">
      <Text fontWeight="semibold">Health Check Configuration</Text>

      {/* Suggested templates based on image */}
      {suggestedTemplates.length > 0 && (
        <Stack gap="2">
          <Text fontSize="sm" color="gray.600">
            Recommended for {service.image}:
          </Text>
          {suggestedTemplates.map((template) => (
            <Button
              key={template}
              variant="outline"
              size="sm"
              onClick={() => setSelectedTemplate(template)}
              colorScheme={selectedTemplate === template ? "blue" : "gray"}
            >
              {HEALTHCHECK_TEMPLATES[template].description}
            </Button>
          ))}
        </Stack>
      )}

      {/* All available templates */}
      <Stack gap="2">
        <Text fontSize="sm">All Templates:</Text>
        <Select
          placeholder="Choose a health check template"
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
        >
          {Object.entries(HEALTHCHECK_TEMPLATES).map(([key, template]) => (
            <option key={key} value={key}>
              {template.description}
            </option>
          ))}
        </Select>
      </Stack>

      {/* Custom health check */}
      <Stack gap="2">
        <Text fontSize="sm">Or write custom:</Text>
        <Textarea
          placeholder="CMD-SHELL command or script"
          value={customHealthcheck}
          onChange={(e) => setCustomHealthcheck(e.target.value)}
        />
      </Stack>

      {/* Preview */}
      {selectedTemplate && (
        <Stack gap="2" p="3" bg="gray.50" rounded="md">
          <Text fontSize="sm" fontWeight="semibold">
            Preview:
          </Text>
          <Code>
            {JSON.stringify(HEALTHCHECK_TEMPLATES[selectedTemplate], null, 2)}
          </Code>
        </Stack>
      )}
    </Stack>
  );
};

// Smart suggestions based on image name
const getSuggestedHealthchecks = (imageName: string): string[] => {
  const suggestions = [];

  if (imageName.includes("postgres")) suggestions.push("postgres");
  if (imageName.includes("mysql") || imageName.includes("mariadb"))
    suggestions.push("mysql");
  if (imageName.includes("redis")) suggestions.push("redis");
  if (imageName.includes("surrealdb")) suggestions.push("surrealdb");
  if (imageName.includes("nginx")) suggestions.push("nginx");

  // Always suggest generic options
  suggestions.push("generic-http", "port-check");

  return [...new Set(suggestions)]; // Remove duplicates
};
```

### **Health Check Validation Enhancement**

```typescript
const validateHealthcheck = (service: Service, result: ValidationResult) => {
  if (!service.healthcheck) {
    if (isCriticalService(service)) {
      result.warnings.push({
        service: service.name,
        issue: "Critical service missing health check",
        fix: "Add health check for better orchestration",
        autoFix: () => suggestHealthcheckTemplate(service.image),
      });
    }
    return;
  }

  // Validate health check command dependencies
  const requiredTools = extractToolsFromHealthcheck(service.healthcheck);
  const imageInfo = await getImageInfo(service.image);
  const missingTools = requiredTools.filter(
    (tool) => !imageInfo.availableTools.includes(tool)
  );

  if (missingTools.length > 0) {
    result.errors.push({
      service: service.name,
      issue: `Health check requires unavailable tools: ${missingTools.join(
        ", "
      )}`,
      fix: "Use different tools or install dependencies",
      suggestions: getAlternativeHealthchecks(service.image, missingTools),
    });
  }
};
```

### **Validation Pipeline**

```typescript
interface ValidationResult {
  errors: ValidationError[]; // Block deployment
  warnings: ValidationWarning[]; // Allow with confirmation
  suggestions: Suggestion[]; // Optional improvements
  autoFixes: AutoFix[]; // One-click fixes
}

const validateStack = async (
  composeData: ComposeData
): Promise<ValidationResult> => {
  const result = {
    errors: [],
    warnings: [],
    suggestions: [],
    autoFixes: [],
  };

  // Run all validation rules
  await Promise.all([
    validateImageCompatibility(composeData, result),
    validateNetworkConflicts(composeData, result),
    validatePortConflicts(composeData, result),
    validateSecurityBestPractices(composeData, result),
    validateResourceUsage(composeData, result),
  ]);

  return result;
};
```

### **Integration with Wizard**

```typescript
// Pre-deployment validation
const validation = await validateStack(wizardOutput);

if (validation.errors.length > 0) {
  // Show blocking errors
  return <ValidationErrorsModal errors={validation.errors} />;
}

if (validation.warnings.length > 0) {
  // Show warnings with option to proceed
  return (
    <ValidationWarningsModal
      warnings={validation.warnings}
      onProceed={() => deploy(wizardOutput)}
      onFix={applyAutoFixes}
    />
  );
}

// All good - deploy directly
await deploy(wizardOutput);
```

## 📚 References

- [Docker Compose File Reference](https://docs.docker.com/compose/compose-file/)
- [Docker Networking](https://docs.docker.com/network/)
- [Container Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [SurrealDB Documentation](https://surrealdb.com/docs)

---

**Note**: This list will be continuously updated as we discover new validation scenarios during development and real-world usage.
