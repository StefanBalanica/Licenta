$ErrorActionPreference = 'Stop'

$base = 'http://localhost:5231'
$email = ('test' + [guid]::NewGuid().ToString('N').Substring(0, 8) + '@example.com')
$pass = 'Test1234!'

Write-Host "Using base: $base"
Write-Host "Using test user: $email"

# Register (ignore if already exists)
try {
  $regBody = @{
    email     = $email
    password  = $pass
    firstName = 'Test'
    lastName  = 'User'
  } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri ($base + '/api/auth/register') -ContentType 'application/json' -Body $regBody | Out-Null
} catch {
  # ignore
}

# Login
$loginBody = @{ email = $email; password = $pass } | ConvertTo-Json
$auth = Invoke-RestMethod -Method Post -Uri ($base + '/api/auth/login') -ContentType 'application/json' -Body $loginBody
$token = $auth.token
if (-not $token) { throw "No token returned from login." }
$h = @{ Authorization = ('Bearer ' + $token) }

# Load story fixture
$storyPath = 'D:/Github/Licenta/MurderMysteryCreator/Povestea.txt'
$story = Get-Content -Raw $storyPath
if (-not $story) { throw "Story file empty: $storyPath" }

# Create game from story
$gameBody = @{ story = $story } | ConvertTo-Json -Depth 10
$game = Invoke-RestMethod -Method Post -Uri ($base + '/api/games/from-story') -Headers $h -ContentType 'application/json' -Body $gameBody
$gameId = $game.gameId
if (-not $gameId) { throw "No gameId returned from /from-story." }

# Fetch devices
$devices = Invoke-RestMethod -Method Get -Uri ($base + "/api/games/$gameId/devices") -Headers $h

$results = @()
foreach ($d in $devices) {
  $deviceId = $d.deviceId
  $apps = Invoke-RestMethod -Method Get -Uri ($base + "/api/games/$gameId/devices/$deviceId/apps") -Headers $h
  $full = Invoke-RestMethod -Method Get -Uri ($base + "/api/games/$gameId/devices/$deviceId/full") -Headers $h

  $appTypes = @($apps | ForEach-Object { $_.appType })

  # Phone calls validation
  $phoneApp = $apps | Where-Object { $_.appType -eq 'Phone' } | Select-Object -First 1
  $callsCount = 0
  $callsMissingFields = @()
  $callsWithAudioPlaceholder = 0
  if ($phoneApp -and $phoneApp.appData -and $phoneApp.appData.calls) {
    $calls = @($phoneApp.appData.calls)
    $callsCount = $calls.Count
    foreach ($c in $calls) {
      foreach ($k in 'contact','date','time','duration','type','audioUrl','audioFileName') {
        if (-not ($c.PSObject.Properties.Name -contains $k)) { $callsMissingFields += $k }
      }
      $au = [string]($c.audioUrl)
      if ($au -and $au.StartsWith('upload-required://')) { $callsWithAudioPlaceholder++ }
    }
  }

  # Messages validation
  $messagesApp = $apps | Where-Object { $_.appType -eq 'Messages' } | Select-Object -First 1
  $conversationsCount = 0
  if ($messagesApp -and $messagesApp.appData -and $messagesApp.appData.conversations) {
    $conversationsCount = @($messagesApp.appData.conversations).Count
  }

  # Email validation
  $emailApp = $apps | Where-Object { $_.appType -eq 'Email' } | Select-Object -First 1
  $emailCount = 0
  if ($emailApp -and $emailApp.appData) {
    $emailCount =
      @($emailApp.appData.emails).Count +
      @($emailApp.appData.inbox).Count +
      @($emailApp.appData.sent).Count +
      @($emailApp.appData.drafts).Count
  }

  # Notes/Photos/Files counts
  $notesCount = 0
  $notesApp = $apps | Where-Object { $_.appType -eq 'Notes' } | Select-Object -First 1
  if ($notesApp -and $notesApp.appData -and $notesApp.appData.notes) { $notesCount = @($notesApp.appData.notes).Count }

  $photosCount = 0
  $photosApp = $apps | Where-Object { $_.appType -eq 'Photos' } | Select-Object -First 1
  if ($photosApp -and $photosApp.appData -and $photosApp.appData.photos) { $photosCount = @($photosApp.appData.photos).Count }

  $filesCount = 0
  $filesApp = $apps | Where-Object { $_.appType -eq 'Files' } | Select-Object -First 1
  if ($filesApp -and $filesApp.appData -and $filesApp.appData.items) { $filesCount = @($filesApp.appData.items).Count }

  $results += [pscustomobject]@{
    deviceId = $deviceId
    ownerName = $d.ownerName
    deviceType = $d.deviceType
    passcode = $d.passcode
    appTypes = $appTypes
    conversationsCount = $conversationsCount
    emailCount = $emailCount
    notesCount = $notesCount
    photosCount = $photosCount
    filesCount = $filesCount
    phoneCallsCount = $callsCount
    phoneCallsMissingFields = ($callsMissingFields | Sort-Object -Unique)
    phoneCallsWithAudioPlaceholder = $callsWithAudioPlaceholder
    fullAppsCount = @($full.apps).Count
  }
}

$out = [pscustomobject]@{
  base = $base
  storyFixture = $storyPath
  gameId = $gameId
  deviceCount = @($devices).Count
  devices = $results
}

$out | ConvertTo-Json -Depth 8

