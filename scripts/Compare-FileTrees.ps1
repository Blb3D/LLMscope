param(
  [Parameter(Mandatory=$true)][string]$Source,
  [Parameter(Mandatory=$true)][string]$Target,
  [string[]]$Exclude=@(".git","node_modules","dist","build","__pycache__","archive","data","Logs","reports"),
  [ValidateSet("SHA256","SHA1","MD5")][string]$HashAlgorithm="SHA256",
  [string]$CsvOut=""
)

function Normalize-Path([string]$root,[string]$full){
  (Resolve-Path $full).Path.Substring((Resolve-Path $root).Path.Length).TrimStart('\','/').Replace('\','/')
}
function Should-Exclude([string]$rel,[string[]]$patterns){
  foreach($p in $patterns){ if($rel -like "*$p*"){return $true} } return $false
}
function Index-Tree([string]$root,[string[]]$exclude,[string]$algo){
  $files=Get-ChildItem -Path $root -Recurse -File -Force -ErrorAction SilentlyContinue
  $index=@{}; $byHash=@{}
  foreach($f in $files){
    $rel=Normalize-Path $root $f.FullName
    if(Should-Exclude $rel $exclude){ continue }
    try{$h=(Get-FileHash $f.FullName -Algorithm $algo).Hash}catch{$h=""}
    $entry=[pscustomobject]@{RelPath=$rel; Size=$f.Length; MTime=$f.LastWriteTimeUtc; Hash=$h}
    $index[$entry.RelPath]=$entry
    if($h){ if(-not $byHash.ContainsKey($h)){ $byHash[$h]=@() }; $byHash[$h]+=$entry.RelPath }
  }
  return @{ ByPath=$index; ByHash=$byHash }
}

if(-not (Test-Path $Source)){ Write-Error "Source not found: $Source"; exit 1 }
if(-not (Test-Path $Target)){ Write-Error "Target not found: $Target"; exit 1 }

Write-Host "Indexing source ..." -ForegroundColor Cyan
$src=Index-Tree $Source $Exclude $HashAlgorithm
Write-Host "Indexing target ..." -ForegroundColor Cyan
$dst=Index-Tree $Target $Exclude $HashAlgorithm

$added=@(); $removed=@(); $changed=@(); $moved=@()
$allPaths=($src.ByPath.Keys + $dst.ByPath.Keys) | Sort-Object -Unique
foreach($p in $allPaths){
  $a=$src.ByPath[$p]; $b=$dst.ByPath[$p]
  if($a -and -not $b){ $removed+=$a; continue }
  if(-not $a -and $b){ $added+=$b; continue }
  if($a -and $b -and ($a.Hash -ne $b.Hash -or $a.Size -ne $b.Size)){
    $changed+= [pscustomobject]@{RelPath=$p; SrcHash=$a.Hash; DstHash=$b.Hash; SrcSize=$a.Size; DstSize=$b.Size}
  }
}
foreach($h in $src.ByHash.Keys){
  if(-not $dst.ByHash.ContainsKey($h)){ continue }
  foreach($sp in $src.ByHash[$h]){
    if($dst.ByHash[$h] -notcontains $sp){
      $moved+= [pscustomobject]@{Hash=$h; From=$sp; To=($dst.ByHash[$h] | Select-Object -First 1)}
    }
  }
}

Write-Host "`n==== SUMMARY ====" -ForegroundColor Green
Write-Host ("Added   : {0}" -f $added.Count)
Write-Host ("Removed : {0}" -f $removed.Count)
Write-Host ("Changed : {0}" -f $changed.Count)
Write-Host ("Moved   : {0}" -f $moved.Count)
if($added.Count){   Write-Host "`nAdded:"   -ForegroundColor Yellow; $added|Select RelPath,Size|Format-Table -AutoSize }
if($removed.Count){ Write-Host "`nRemoved:" -ForegroundColor Yellow; $removed|Select RelPath,Size|Format-Table -AutoSize }
if($changed.Count){ Write-Host "`nChanged (hash/size differ):" -ForegroundColor Yellow; $changed|Format-Table -AutoSize }
if($moved.Count){   Write-Host "`nMoved/Renamed:" -ForegroundColor Yellow; $moved|Format-Table -AutoSize }

if($CsvOut){
  $rows=@()
  $rows+=$added   |%{ [pscustomobject]@{Status="ADDED";   Path=$_.RelPath; Hash=$_.Hash; Size=$_.Size } }
  $rows+=$removed |%{ [pscustomobject]@{Status="REMOVED"; Path=$_.RelPath; Hash=$_.Hash; Size=$_.Size } }
  $rows+=$changed |%{ [pscustomobject]@{Status="CHANGED"; Path=$_.RelPath; SrcHash=$_.SrcHash; DstHash=$_.DstHash; SrcSize=$_.SrcSize; DstSize=$_.DstSize } }
  $rows+=$moved   |%{ [pscustomobject]@{Status="MOVED";   Path=$_.To; From=$_.From; Hash=$_.Hash } }
  $rows | Export-Csv -NoTypeInformation -Path $CsvOut -Encoding UTF8
  Write-Host "CSV written to $CsvOut" -ForegroundColor Cyan
}
