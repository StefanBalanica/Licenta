$files = Get-ChildItem "murder-mystery-client\src\app" -Recurse -Include "*.ts"

foreach ($f in $files) {
  $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
  $content = [System.Text.Encoding]::UTF8.GetString($bytes)
  $orig = $content

  $content = $content.Replace("Äƒ", "ă")
  $content = $content.Replace("Ä‚", "Ă")
  $content = $content.Replace("È™", "ș")
  $content = $content.Replace("Èš", "Ț")
  $content = $content.Replace("È›", "ț")
  $content = $content.Replace("Èˆ", "Ș")
  $content = $content.Replace("Ã®", "î")
  $content = $content.Replace("ÃŽ", "Î")
  $content = $content.Replace("Ã¢", "â")
  $content = $content.Replace("Ã‚", "Â")
  $content = $content.Replace("Arnapoi", "Înapoi")
  $content = $content.Replace("AZnapoi", "Înapoi")
  $content = $content.Replace("AZnregistreaz", "Înregistrează")
  $content = $content.Replace("AZncearc", "Încearcă")
  $content = $content.Replace("Arnregistrat", "înregistrat")
  $content = $content.Replace("ETi", "și")
  $content = $content.Replace("uETor", "ușor")
  $content = $content.Replace("neobiETnuite", "neobișnuite")
  $content = $content.Replace("FoloseETte", "Folosește")
  $content = $content.Replace("ArE", "îț")
  $content = $content.Replace("cA«teva", "câteva")
  $content = $content.Replace("cuvA«nt", "cuvânt")
  $content = $content.Replace("cuvA©nt", "cuvânt")
  $content = $content.Replace("SecvenE>e", "Secvențe")
  $content = $content.Replace("RepetiE>iile", "Repetițiile")
  $content = $content.Replace("recenE>i", "recenți")
  $content = $content.Replace("E>ei", "ței")
  $content = $content.Replace("E>e", "țe")
  $content = $content.Replace("E>i", "ți")
  $content = $content.Replace("E>", "ț")

  if ($content -ne $orig) {
    [System.IO.File]::WriteAllText($f.FullName, $content, (New-Object System.Text.UTF8Encoding $false))
    Write-Host "Fixed: $($f.Name)"
  }
}
Write-Host "All done"
