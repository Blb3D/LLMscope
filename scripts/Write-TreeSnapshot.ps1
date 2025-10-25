param(
  [Parameter(Mandatory=$true)][string]$Root,
  [string]$OutFile = ".\tree_snapshot.txt",
  [string[]]$Exclude = @(".git","node_modules","dist","build","__pycache__","archive","data","Logs","reports"),
  [switch]$IncludeHash
)

function Should-Exclude([string]$rel,[string[]]$patterns){
  foreach($p in $patterns){ if($rel -like "*$p*"){return $true} } return $false
}

$rootPath = (Resolve-Path $Root).Path
$items = Get-ChildItem -Path $rootPath -Recurse -Force -ErrorAction SilentlyContinue
$lines = New-Object System.Collections.Generic.List[string]

foreach($it in $items){
  $rel = ($it.FullName.Substring($rootPath.Length)).TrimStart('\','/').Replace('\','/')
  if(-not $rel){ continue }
  if(Should-Exclude $rel $Exclude){ continue }
  if($it.PSIsContainer){
    $lines.Add("D  $rel")
  } else {
    if($IncludeHash){
      try { $h=(Get-FileHash $it.FullName -Algorithm SHA256).Hash } catch { $h="" }
      $lines.Add(("F  {0}  {1}  {2}" -f $rel,$it.Length,$h))
    } else {
      $lines.Add(("F  {0}  {1}" -f $rel,$it.Length))
    }
  }
}

$lines.Sort()
$parent = Split-Path -Parent $OutFile
if($parent -and -not (Test-Path $parent)){ New-Item -ItemType Directory -Path $parent | Out-Null }
$lines | Set-Content -Encoding UTF8 $OutFile
Write-Host "Tree snapshot written to $OutFile"
