# En-Dash Authentication Implementation Plan

## Overview

En-Dash will implement **secure by default** authentication with deliberate friction to opt out. The approach prioritizes enterprise-grade security while providing escape hatches for advanced users with existing authentication infrastructure.

## 🎯 Philosophy: Guided Setup with Escape Hatches

- **Primary Path**: Authentik OIDC integration (recommended)
- **Advanced Path**: Passthrough authentication for proxy/VPN setups
- **Development Path**: No authentication (with warnings and auto-expiry)

## 🏗️ Backend Architecture

### Auth Setup Wizard

```python
# backend/app/auth/setup.py
class AuthSetupWizard:
    def check_auth_status(self):
        if not self.authentik_configured():
            return {
                "status": "setup_required",
                "message": "En-Dash requires authentication for security.",
                "recommended": "authentik",
                "advanced_options_available": True
            }
        return {"status": "configured", "provider": "authentik"}

    def generate_authentik_config(self, domain: str):
        return {
            "docker_compose": f"""
# Add this to your docker-compose.yml
authentik:
  image: ghcr.io/goauthentik/server:2024.2.2
  environment:
    AUTHENTIK_REDIS__HOST: redis
    AUTHENTIK_POSTGRESQL__HOST: postgresql
    AUTHENTIK_SECRET_KEY: {self.generate_secret()}
  ports:
    - "9000:9000"
""",
            "en_dash_config": f"""
# Add to your .env
AUTH_MODE=authentik
AUTHENTIK_ISSUER=https://auth.{domain}/application/o/en-dash/
AUTHENTIK_CLIENT_ID=<get-from-authentik-ui>
AUTHENTIK_CLIENT_SECRET=<get-from-authentik-ui>
"""
        }
```

### Advanced Configuration (Deliberate Friction)

```python
# backend/app/auth/advanced.py
class AdvancedAuthConfig:
    def __init__(self):
        self.warnings = [
            "⚠️  You are disabling recommended security features",
            "🔒  This setup is NOT recommended for remote access",
            "🎯  You will be responsible for authentication security",
            "📋  This requires advanced networking knowledge"
        ]

    def enable_passthrough_auth(self, confirmation_token: str):
        if not self.verify_advanced_user(confirmation_token):
            raise SecurityException("Advanced auth requires confirmation")

        return {
            "auth_mode": "passthrough",
            "required_headers": ["X-Forwarded-User", "X-Auth-Groups"],
            "setup_instructions": self.get_proxy_setup_guide()
        }

    def enable_development_mode(self, i_understand_risks: bool):
        if not i_understand_risks:
            raise SecurityException("Must acknowledge security risks")

        return {
            "auth_mode": "development",
            "warning": "🚨 DEVELOPMENT MODE - NO AUTHENTICATION ACTIVE",
            "auto_disable_in": "7 days"  # Force re-confirmation
        }
```

### Passthrough Authentication System

```python
# Simple but powerful
class PassthroughAuth:
    def __init__(self):
        self.trusted_headers = [
            "X-Forwarded-User",      # Traefik/nginx auth
            "X-Auth-Username",       # Generic proxy auth
            "X-Authentik-Username",  # If using Authentik proxy
            "X-Remote-User",         # Common standard
        ]

    async def get_user_from_headers(self, request: Request) -> User:
        for header in self.trusted_headers:
            if username := request.headers.get(header):
                return User(username=username, source="proxy")
        raise HTTPException(401, "No valid auth header")

# Usage
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/auth/"):
        return await call_next(request)  # Skip auth endpoints

    user = await get_user_from_headers(request)
    request.state.user = user
    return await call_next(request)
```

### Configuration System

```python
# backend/config.py
class AuthConfig:
    AUTH_MODE = os.getenv("AUTH_MODE", "setup_required")  # setup_required|authentik|passthrough|development

    # Authentik OIDC
    AUTHENTIK_ISSUER = os.getenv("AUTHENTIK_ISSUER")
    AUTHENTIK_CLIENT_ID = os.getenv("AUTHENTIK_CLIENT_ID")
    AUTHENTIK_CLIENT_SECRET = os.getenv("AUTHENTIK_CLIENT_SECRET")

    # Passthrough headers
    TRUSTED_PROXY_HEADERS = os.getenv("TRUSTED_HEADERS", "X-Forwarded-User").split(",")

    # Development mode (no auth)
    DEV_DEFAULT_USER = "admin"
    DEV_MODE_EXPIRES = os.getenv("DEV_MODE_EXPIRES")  # Auto-disable after date
```

### Permission Mapping

```python
# Map external groups to internal permissions
PERMISSION_MAPPING = {
    "authentik_groups": {
        "homelab-admins": ["admin", "docker.write", "system.write"],
        "homelab-users": ["viewer", "docker.read"],
        "family": ["viewer"]
    },
    "proxy_headers": {
        "X-User-Groups": "homelab-admins,family"  # Comma-separated
    }
}
```

## 🎨 Frontend Implementation

### Setup Wizard UI Flow

```typescript
// Step 1: Security Check
const AuthSetupWizard = () => {
  const [step, setStep] = useState("security-check");

  return (
    <Box maxW="2xl" mx="auto" p="8">
      {step === "security-check" && (
        <SecurityIntroStep onProceed={() => setStep("choose-method")} />
      )}

      {step === "choose-method" && (
        <AuthMethodStep
          onSelectAuthentik={() => setStep("authentik-setup")}
          onSelectAdvanced={() => setStep("advanced-warning")}
        />
      )}

      {step === "advanced-warning" && (
        <AdvancedWarningStep
          onConfirm={() => setStep("advanced-config")}
          onGoBack={() => setStep("choose-method")}
        />
      )}
    </Box>
  );
};
```

### Authentik Setup Guide Component

```typescript
const AuthentikSetupGuide = () => {
  const [domain, setDomain] = useState("");
  const [step, setStep] = useState(1);

  return (
    <Stack gap="6">
      <Heading>Set up Authentik (Recommended)</Heading>

      <Alert.Root colorPalette="blue">
        <Alert.Icon />
        <Alert.Title>Why Authentik?</Alert.Title>
        <Alert.Description>
          • Enterprise-grade security for your homelab • Multi-factor
          authentication built-in • Manage access for family/team members •
          Single sign-on across all services
        </Alert.Description>
      </Alert.Root>

      <Tabs.Root value={step.toString()}>
        <Tabs.List>
          <Tabs.Trigger value="1">Install Authentik</Tabs.Trigger>
          <Tabs.Trigger value="2">Configure Provider</Tabs.Trigger>
          <Tabs.Trigger value="3">Connect En-Dash</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="1">
          <AuthentikInstallStep domain={domain} setDomain={setDomain} />
        </Tabs.Content>

        <Tabs.Content value="2">
          <AuthentikConfigStep domain={domain} />
        </Tabs.Content>

        <Tabs.Content value="3">
          <EnDashConnectionStep />
        </Tabs.Content>
      </Tabs.Root>
    </Stack>
  );
};
```

### Advanced Config: Friction by Design

```typescript
const AdvancedAuthConfig = () => {
  const [confirmations, setConfirmations] = useState({
    understandRisks: false,
    readDocumentation: false,
    acceptResponsibility: false,
  });

  const [advancedToken, setAdvancedToken] = useState("");

  const allConfirmed = Object.values(confirmations).every(Boolean);

  return (
    <Stack gap="6">
      <Alert.Root colorPalette="red">
        <Alert.Icon />
        <Alert.Title>⚠️ Advanced Configuration</Alert.Title>
        <Alert.Description>
          You are about to disable recommended security features. This is only
          for advanced users with existing authentication infrastructure.
        </Alert.Description>
      </Alert.Root>

      <Stack gap="4">
        <Checkbox
          checked={confirmations.understandRisks}
          onChange={(e) =>
            setConfirmations((prev) => ({
              ...prev,
              understandRisks: e.target.checked,
            }))
          }
        >
          I understand this setup is NOT recommended for remote access
        </Checkbox>

        <Checkbox
          checked={confirmations.readDocumentation}
          onChange={(e) =>
            setConfirmations((prev) => ({
              ...prev,
              readDocumentation: e.target.checked,
            }))
          }
        >
          I have read the advanced authentication documentation
        </Checkbox>

        <Checkbox
          checked={confirmations.acceptResponsibility}
          onChange={(e) =>
            setConfirmations((prev) => ({
              ...prev,
              acceptResponsibility: e.target.checked,
            }))
          }
        >
          I accept full responsibility for authentication security
        </Checkbox>
      </Stack>

      {allConfirmed && (
        <Stack gap="4">
          <Text>Enter confirmation token (check server logs):</Text>
          <Input
            value={advancedToken}
            onChange={(e) => setAdvancedToken(e.target.value)}
            placeholder="Advanced user confirmation token"
          />
          <Button
            colorPalette="red"
            disabled={!advancedToken}
            onClick={() => enableAdvancedAuth(advancedToken)}
          >
            Enable Advanced Authentication
          </Button>
        </Stack>
      )}
    </Stack>
  );
};
```

## 🎯 Authentik OIDC Integration

```python
# backend/app/auth/authentik.py
from authlib.integrations.fastapi_oauth2 import OAuth2AuthorizationCodeBearer
from authlib.integrations.httpx_oauth import OAuth2

class AuthentikOAuth2:
    def __init__(self, issuer: str, client_id: str, client_secret: str):
        self.oauth2 = OAuth2(
            name="authentik",
            server_metadata_url=f"{issuer}/.well-known/openid-configuration",
            client_id=client_id,
            client_secret=client_secret,
        )

    async def get_current_user(self, token: str = Depends(OAuth2AuthorizationCodeBearer)):
        user_info = await self.oauth2.parse_id_token(token)
        return User(
            id=user_info["sub"],
            username=user_info["preferred_username"],
            email=user_info["email"],
            groups=user_info.get("groups", []),
            permissions=self.map_groups_to_permissions(user_info.get("groups", []))
        )

# Usage in routes
@router.get("/protected")
async def protected_endpoint(user: User = Depends(get_current_user)):
    return {"message": f"Hello {user.username}!"}
```

## 🔐 Security Features

### Permission System

```python
# Fine-grained permissions
PERMISSIONS = {
    'system.stats.read': 'View system metrics',
    'docker.containers.read': 'View containers',
    'docker.containers.start': 'Start containers',
    'docker.containers.stop': 'Stop containers',
    'system.services.restart': 'Restart services',
    'terminal.access': 'Terminal access',
    'system.updates': 'Install updates',
}

# Middleware for dangerous operations
@router.post("/containers/{id}/stop")
@requires_permission("docker.containers.stop")
async def stop_container(current_user: User = Depends(get_current_user)):
    # Only authenticated users with permission can stop containers
    pass
```

### Security Levels

```python
class SecurityMiddleware:
    SAFE_ENDPOINTS = ['/api/stats', '/api/health']  # No auth required
    READ_ENDPOINTS = ['/api/containers', '/api/stacks']  # Viewer role
    WRITE_ENDPOINTS = ['/api/containers/*/start']  # Operator role
    ADMIN_ENDPOINTS = ['/api/system/services/*']  # Admin only
```

### Audit & Monitoring

```python
# Log everything for security
@audit_log
async def restart_service(service_name: str, user: User):
    logger.security(f"User {user.username} restarted service {service_name}")
```

## 🌐 Remote Access Considerations

### Network Security

- **Reverse proxy** (nginx) with SSL termination
- **VPN access** for sensitive operations
- **Rate limiting** to prevent abuse
- **IP allowlisting** for admin functions

### System Security

```python
# Sandboxed command execution
@require_role("admin")
async def execute_command(command: str, user: User):
    # Validate command against allowlist
    # Run in restricted environment
    # Log everything
    if not is_safe_command(command):
        raise SecurityException("Command not allowed")
```

## 🎯 Implementation Benefits

**Authentik Integration:**

- 🏠 **Homelab-native** - Designed for self-hosted setups
- 🔗 **Single sign-on** - One login for all services
- 👥 **Family-friendly** - Easy user management
- 📱 **Mobile app** - Authentik mobile for MFA

**Passthrough Token:**

- 🚀 **Performance** - Zero auth overhead
- 🛡️ **Security** - Auth handled at network edge
- 🔧 **Flexibility** - Works with any proxy/VPN setup
- 📊 **Simplified** - No auth state to manage

**Secure by Default:**

- 🔒 **Secure by default** - Authentik setup is the primary path
- ⚡ **Guided experience** - Step-by-step setup wizard
- 🛑 **Deliberate friction** - Advanced users have to prove they know what they're doing
- 📚 **Educational** - Users learn WHY security matters
- 🔧 **Flexible** - Still supports advanced setups for power users

## 📋 Implementation Checklist

### Phase 1: Core Auth Infrastructure

- [ ] Create auth setup wizard backend
- [ ] Implement Authentik OIDC integration
- [ ] Build passthrough auth system
- [ ] Create permission system
- [ ] Add security middleware

### Phase 2: Frontend Setup Wizard

- [ ] Create setup wizard UI components
- [ ] Build Authentik setup guide
- [ ] Implement advanced config warning system
- [ ] Add confirmation flows with friction
- [ ] Create auth status monitoring

### Phase 3: Security Hardening

- [ ] Add audit logging
- [ ] Implement rate limiting
- [ ] Create command allowlisting
- [ ] Add session management
- [ ] Build security monitoring dashboard

### Phase 4: Documentation & Testing

- [ ] Write setup documentation
- [ ] Create security best practices guide
- [ ] Build automated security tests
- [ ] Add integration tests for all auth methods
- [ ] Create troubleshooting guides

## 🔄 Future Enhancements

- **Additional OIDC Providers**: Google, Microsoft, GitHub
- **Hardware Token Support**: FIDO2/WebAuthn
- **API Key Management**: For programmatic access
- **Session Recording**: For audit compliance
- **Automated Security Scanning**: Vulnerability detection

---

This implementation provides enterprise-grade security while maintaining the flexibility that advanced homelab users require. The guided setup ensures most users follow secure practices, while the escape hatches allow for specialized configurations when needed.
