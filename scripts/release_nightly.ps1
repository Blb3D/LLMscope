param(
  [string]$MainBranch = "main",
  [string]$Remote = "origin",
  [string]$VersionFile = "VERSION",
  [string]$ChangelogPath = "docs/CHANGELOG.md",
  [switch]$DryRun
)
function Exec($cmd){ $o=& cmd /c $cmd; if($LASTEXITCODE -ne 0){ throw "Command failed ($LASTEXITCODE): $cmd`n$o"} $o }
if(-not (Test-Path .git)){ throw "Run from repo root" }
if(-not (Test-Path $VersionFile)){ throw "VERSION file not found" }
$version=(Get-Content -Raw $VersionFile).Trim()
if($version -notmatch '^\d+\.\d+\.\d+$'){ throw "VERSION must be like 0.6.0 (got '$version')" }
$branch=(Exec "git rev-parse --abbrev-ref HEAD").Trim()
if($branch -ne $MainBranch){ throw "Checkout $MainBranch first (currently $branch)" }
Exec "git fetch $Remote --tags"
Exec "git pull --ff-only $Remote $MainBranch"
$today=(Get-Date).ToString("yyyyMMdd")
$baseTag="v$version-nightly.$today"
$tag=$baseTag
if((Exec "git tag -l $tag").Trim()){ $tag="$baseTag-$(Get-Date -Format HHmm)" }
$lastTag=(Exec "git describe --tags --abbrev=0 2>nul") 2>$null; $lastTag=$lastTag.Trim()
$log= if($lastTag){ Exec "git log --pretty=format:'* %h %s (%an)' $lastTag..HEAD" } else { Exec "git log --pretty=format:'* %h %s (%an)'" }
$header="## $tag  -  $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
$section= if($log){ "$header`r`n$log`r`n" } else { "$header`r`n(no changes since last tag)`r`n" }
if(-not (Test-Path $ChangelogPath)){ New-Item -ItemType Directory -Force -Path (Split-Path $ChangelogPath) | Out-Null; Set-Content -Encoding UTF8 $ChangelogPath "# Changelog`r`n`r`n$section" } else { Add-Content -Encoding UTF8 $ChangelogPath "`r`n$section" }
Exec "git add -A"
$changes=(Exec "git diff --cached --name-only").Trim()
if($changes){ $msg="chore: nightly snapshot $today"; if($DryRun){ Write-Host "[DRY RUN] $msg" } else { Exec "git commit -m `"$msg`"" } } else { Write-Host "No staged changes; tagging current HEAD." }
if($DryRun){ Write-Host "[DRY RUN] tag $tag" } else { Exec "git tag -a $tag -m `"Nightly build for $version ($today)`""; Exec "git push $Remote $MainBranch"; Exec "git push $Remote --tags" }
Write-Host "Nightly release complete: $tag" -ForegroundColor Green
