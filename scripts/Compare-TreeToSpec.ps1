param(
  [Parameter(Mandatory=$true)][string]$Root,
  [Parameter(Mandatory=$true)][string]$SpecFile,
  # ExcludeChildrenOnly: ignore contents of these dirs, but still include the dir itself
  [string[]]$ExcludeChildrenOnly = @("archive","data"),
  [string[]]$Exclude = @(".git","node_modules","dist","build","__pycache__","Logs","reports"),
  [switch]$CaseSensitive
)

if (-not (Test-Path $Root))     { Write-Error "Root not found: $Root"; exit 1 }
if (-not (Test-Path $SpecFile)) { Write-Error "Spec file not found: $SpecFile"; exit 1 }

function Norm([string]$s) { ($s.Replace('\','/')).Trim() }

# Comparer (PS5-safe)
$comparer = [StringComparer]::InvariantCultureIgnoreCase
if ($CaseSensitive.IsPresent) { $comparer = [StringComparer]::CurrentCulture }

$rootPath = (Resolve-Path $Root).Path

# 1) Collect root-level files/dirs explicitly (ensures .gitignore is seen)
$rootItems = Get-ChildItem -Path $rootPath -Force -ErrorAction SilentlyContinue
$rootList = foreach ($it in $rootItems) {
  $name = $it.Name
  if ($Exclude -contains $name) { continue }
  if ($it.PSIsContainer) { "D  $name" } else { "F  $name" }
}

# 2) Recurse to collect deeper items, but ignore children of ExcludeChildrenOnly dirs
$recurseItems = Get-ChildItem -Path $rootPath -Recurse -Force -ErrorAction SilentlyContinue
$deepList = foreach ($it in $recurseItems) {
  $rel = $it.FullName.Substring($rootPath.Length).TrimStart('\','/').Replace('\','/')
  if (-not $rel) { continue }

  # If path begins with any ExcludeChildrenOnly dir + slash, skip it
  $skip = $false
  foreach ($d in $ExcludeChildrenOnly) {
    if ($rel -like "$d/*") { $skip = $true; break }
  }
  if ($skip) { continue }

  # Skip generic excludes anywhere in path
  foreach ($ex in $Exclude) { if ($rel -like "*$ex*") { $skip = $true; break } }
  if ($skip) { continue }

  if ($it.PSIsContainer) { "D  $rel" } else { "F  $rel" }
}

$actual = ($rootList + $deepList) | Sort-Object -Unique

# Read spec (allow lines like "D  path" / "F  path", bare path = file)
$spec = Get-Content -LiteralPath $SpecFile -ErrorAction Stop | ForEach-Object {
  $line = Norm $_
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  if ($line -match "^(D|F)\s{2}") { $line } else { "F  $line" }
} | Sort-Object -Unique

# Sets
$actualSet = New-Object System.Collections.Generic.HashSet[string]($comparer)
$specSet   = New-Object System.Collections.Generic.HashSet[string]($comparer)
foreach ($a in $actual) { [void]$actualSet.Add($a) }
foreach ($s in $spec)   { [void]$specSet.Add($s) }

# Differences
$missing = @() # in spec, not in actual
$extras  = @() # in actual, not in spec
foreach ($s in $spec)   { if (-not $actualSet.Contains($s)) { $missing += $s } }
foreach ($a in $actual) { if (-not $specSet.Contains($a))   { $extras  += $a } }

Write-Host "==== TREE vs SPEC ====" -ForegroundColor Green
Write-Host ("Missing (in spec, not in tree): {0}" -f $missing.Count)
if ($missing) { $missing | Format-Table -AutoSize }
Write-Host ("`nExtras (in tree, not in spec): {0}" -f $extras.Count)
if ($extras)  { $extras  | Format-Table -AutoSize }
