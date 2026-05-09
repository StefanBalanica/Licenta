$files = Get-ChildItem "murder-mystery-client\src\app" -Recurse -Include "*.ts"

foreach ($f in $files) {
  $text = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
  $orig = $text

  # ── Step 1: Fix corrupted multi-byte sequences (UTF-8 read as Windows-1252) ──
  # ellipsis â€¦  (U+2026 -> E2 80 A6 -> read as Win1252: â € ¦)
  $text = $text.Replace([string][char]0xE2 + [string][char]0x20AC + [string][char]0xA6, "...")
  # en-dash â€" (E2 80 93)
  $text = $text.Replace([string][char]0xE2 + [string][char]0x20AC + [string][char]0x93, "-")
  # right single quote â€™ (E2 80 99)
  $text = $text.Replace([string][char]0xE2 + [string][char]0x20AC + [string][char]0x99, "'")
  # left double quote â€œ (E2 80 9C)
  $text = $text.Replace([string][char]0xE2 + [string][char]0x20AC + [string][char]0x9C, '"')
  # right double quote â€ (E2 80 9D)
  $text = $text.Replace([string][char]0xE2 + [string][char]0x20AC + [string][char]0x9D, '"')

  # ── Step 2: Fix remaining double-encoded Romanian chars ──
  $text = $text.Replace([string][char]0xC4 + [string][char]0x192, "a")   # Äƒ -> a (was ă)
  $text = $text.Replace([string][char]0xC4 + [string][char]0x201A, "A")  # Ä‚ -> A (was Ă)
  $text = $text.Replace([string][char]0xC8 + [string][char]0x2122, "s")  # È™ -> s (was ș)
  $text = $text.Replace([string][char]0xC8 + [string][char]0x203A, "T")  # Èš -> T (was Ț)
  $text = $text.Replace([string][char]0xC8 + [string][char]0x203E, "t")  # È› -> t (was ț)
  $text = $text.Replace([string][char]0xC8 + [string][char]0x2C6,  "S")  # Èˆ -> S (was Ș)
  $text = $text.Replace([string][char]0xC3 + [string][char]0xAE,   "i")  # Ã® -> i (was î)
  $text = $text.Replace([string][char]0xC3 + [string][char]0x17D,  "I")  # ÃŽ -> I (was Î)
  $text = $text.Replace([string][char]0xC3 + [string][char]0xA2,   "a")  # Ã¢ -> a (was â)
  $text = $text.Replace([string][char]0xC3 + [string][char]0x82,   "A")  # Ã‚ -> A (was Â)

  # ── Step 3: Replace all Romanian diacritics with ASCII equivalents ──
  $text = $text.Replace([string][char]0x103, "a")  # ă
  $text = $text.Replace([string][char]0x102, "A")  # Ă
  $text = $text.Replace([string][char]0x219, "s")  # ș (s-comma)
  $text = $text.Replace([string][char]0x21B, "t")  # ț (t-comma)
  $text = $text.Replace([string][char]0x218, "S")  # Ș
  $text = $text.Replace([string][char]0x21A, "T")  # Ț
  $text = $text.Replace([string][char]0x15F, "s")  # ş (s-cedilla)
  $text = $text.Replace([string][char]0x15E, "S")  # Ş
  $text = $text.Replace([string][char]0x163, "t")  # ţ (t-cedilla)
  $text = $text.Replace([string][char]0x162, "T")  # Ţ
  $text = $text.Replace([string][char]0xEE,  "i")  # î
  $text = $text.Replace([string][char]0xCE,  "I")  # Î
  $text = $text.Replace([string][char]0xE2,  "a")  # â
  $text = $text.Replace([string][char]0xC2,  "A")  # Â
  $text = $text.Replace([string][char]0xE3,  "a")  # ã (stray)

  # ── Step 4: Fix known garbled ASCII-only patterns ──
  $text = $text.Replace("AZnapoi",        "Inapoi")
  $text = $text.Replace("AZnregistreaz",  "Inregistreaza")
  $text = $text.Replace("AZncearc",       "Incearca")
  $text = $text.Replace("Arnregistrat",   "inregistrat")
  $text = $text.Replace("uETor",          "usor")
  $text = $text.Replace("neobiETnuite",   "neobisnuite")
  $text = $text.Replace("FoloseETte",     "Foloseste")
  $text = $text.Replace("ETi",            "si")
  $text = $text.Replace("SecvenE>e",      "Secvente")
  $text = $text.Replace("RepetiE>iile",   "Repetitiile")
  $text = $text.Replace("recenE>i",       "recenti")
  $text = $text.Replace("E>ei",           "tei")
  $text = $text.Replace("E>e",            "te")
  $text = $text.Replace("E>i",            "ti")
  $text = $text.Replace("E>",             "t")

  if ($text -ne $orig) {
    [System.IO.File]::WriteAllText($f.FullName, $text, (New-Object System.Text.UTF8Encoding $false))
    Write-Host "Fixed: $($f.Name)"
  }
}
Write-Host "DONE"
