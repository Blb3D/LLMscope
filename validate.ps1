# Check if files exist
$files = @(
    "README.md",
    "CHANGELOG.md",
    "VERSION",
    "docs\ROADMAP_v5.md",
    "docs\SCOPE_v5.md",
    "docs\CASE_STUDY_Cognitive_Load_Spike_RevA.md"
)

Write-Host "`n=== File Check ===" -ForegroundColor Cyan
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "[OK] $file" -ForegroundColor Green
    } else {
        Write-Host "[MISSING] $file" -ForegroundColor Red
    }
}

# Check for placeholders
Write-Host "`n=== Placeholder Check ===" -ForegroundColor Cyan
$placeholders = Select-String -Path README.md,docs\*.md -Pattern "yourusername|your-email@example.com" -ErrorAction SilentlyContinue

if ($placeholders) {
    Write-Host "Found placeholders - need to replace!" -ForegroundColor Yellow
    $placeholders | Format-Table -AutoSize
} else {
    Write-Host "[OK] No placeholders found" -ForegroundColor Green
}

# Check screenshots
Write-Host "`n=== Screenshot Check ===" -ForegroundColor Cyan
$screenshots = Get-ChildItem docs\assets\*.png -ErrorAction SilentlyContinue
if ($screenshots) {
    Write-Host "[OK] Found $($screenshots.Count) screenshots" -ForegroundColor Green
    $screenshots | ForEach-Object { Write-Host "  - $($_.Name)" }
} else {
    Write-Host "[MISSING] No screenshots in docs\assets\" -ForegroundColor Yellow
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan