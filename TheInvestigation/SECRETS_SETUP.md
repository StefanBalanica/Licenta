# Murder Mystery — Secrets Setup

Aplicația necesită câteva valori sensibile care NU sunt incluse în repository.

## Opțiunea 1: User Secrets (recomandat pentru development local)

```bash
cd TheInvestigation.Api

dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=murdermystery;Username=postgres;Password=postgres"
dotnet user-secrets set "JwtSettings:SecretKey" "un-secret-de-cel-putin-32-caractere-generat-random"
dotnet user-secrets set "GroqSettings:ApiKeys:0" "gsk_..."
dotnet user-secrets set "GroqSettings:ApiKeys:1" "gsk_..."
```

## Opțiunea 2: Variabile de mediu (recomandat pentru producție)

Variabilele de mediu suprascriu automat valorile din `appsettings.json`:

```
ConnectionStrings__DefaultConnection=Host=...
JwtSettings__SecretKey=...
GroqSettings__ApiKeys__0=gsk_...
```

## Generare secret JWT sigur

```bash
# PowerShell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))

# sau openssl
openssl rand -base64 64
```

> **IMPORTANT:** SecretKey-ul JWT trebuie să aibă **minim 32 de caractere** (recomandat 64+).
> Nu folosi chei API reale (OpenAI, Groq etc.) ca JWT secret.
