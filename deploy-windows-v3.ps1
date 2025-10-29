# LLMscope Documentation Deploy Script for Windows
# All files should already be in repo root - this script organizes them
# Run: powershell -ExecutionPolicy Bypass -File .\deploy-windows-v2.ps1

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "       LLMscope Documentation Deployment (Windows)" -ForegroundColor Cyan
Write-Host "              Files Already in Repo Root" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration - YOUR INFO
$GITHUB_USERNAME = "Blb3D"
$YOUR_EMAIL = "bbaker@blb3dprinting.com"
$YOUR_NAME = "Brandan Baker"

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "   GitHub: $GITHUB_USERNAME" -ForegroundColor White
Write-Host "   Email: $YOUR_EMAIL" -ForegroundColor White
Write-Host "   Name: $YOUR_NAME" -ForegroundColor White
Write-Host ""

# Step 1: Verify Files Exist in Root
Write-Host "Step 1: Checking files in root..." -ForegroundColor Yellow

$rootFiles = @(
    "README.md",
    "CHANGELOG.md",
    "VERSION",
    "LICENSE",
    "CONTRIBUTING.md",
    "ROADMAP_v5.md",
    "SCOPE_v5.md",
    "CASE_STUDY_Cognitive_Load_Spike_RevA.md"
)

$missingFiles = @()
foreach ($file in $rootFiles)
{
    if (Test-Path $file)
    {
        Write-Host "   [OK] Found $file" -ForegroundColor Green
    }
    else
    {
        Write-Host "   [MISSING] $file" -ForegroundColor Red
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0)
{
    Write-Host ""
    Write-Host "ERROR: Missing files in root!" -ForegroundColor Red
    Write-Host "Please download these files to repo root:" -ForegroundColor Yellow
    foreach ($file in $missingFiles)
    {
        Write-Host "   - $file" -ForegroundColor Yellow
    }
    exit 1
}

# Step 2: Create docs folder and move files
Write-Host ""
Write-Host "Step 2: Organizing files into docs folder..." -ForegroundColor Yellow

if (-not (Test-Path "docs"))
{
    New-Item -Path "docs" -ItemType Directory | Out-Null
    Write-Host "   [OK] Created docs folder" -ForegroundColor Green
}

$docsFiles = @(
    "ROADMAP_v5.md",
    "SCOPE_v5.md",
    "CASE_STUDY_Cognitive_Load_Spike_RevA.md"
)

foreach ($file in $docsFiles)
{
    if (Test-Path $file)
    {
        Move-Item $file -Destination "docs\" -Force
        Write-Host "   [OK] Moved $file to docs/" -ForegroundColor Green
    }
}

# Step 3: Setup Screenshots
Write-Host ""
Write-Host "Step 3: Setting up screenshots..." -ForegroundColor Yellow

New-Item -Path "docs\assets" -ItemType Directory -Force | Out-Null
Write-Host "   [OK] Created docs\assets\" -ForegroundColor Green

$screenshotMappings = @{
    "Screenshot_2025-10-24_162854" = "cognitive-load-spike.png"
    "3cd395f4-8fa4-4d6e-a086-f5c9070ca930" = "dashboard-full-view.png"
    "a0415ea5-69f0-430a-9805-72c4c6360db5" = "violation-modal.png"
}

$searchPaths = @(
    ".",
    "$env:USERPROFILE\Downloads",
    "$env:USERPROFILE\OneDrive\Desktop"
)

foreach ($searchPattern in $screenshotMappings.Keys)
{
    $targetName = $screenshotMappings[$searchPattern]
    $found = $false
    
    foreach ($searchPath in $searchPaths)
    {
        $files = Get-ChildItem -Path $searchPath -Filter "*$searchPattern*" -ErrorAction SilentlyContinue | Select-Object -First 1
        
        if ($files)
        {
            Copy-Item $files.FullName -Destination "docs\assets\$targetName" -Force
            Write-Host "   [OK] Copied $targetName" -ForegroundColor Green
            $found = $true
            break
        }
    }
    
    if (-not $found)
    {
        Write-Host "   [WARNING] Screenshot $targetName not found" -ForegroundColor Yellow
    }
}

# Step 4: Replace Placeholders
Write-Host ""
Write-Host "Step 4: Replacing placeholders..." -ForegroundColor Yellow

$filesToUpdate = @(
    "README.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "docs\ROADMAP_v5.md",
    "docs\SCOPE_v5.md",
    "docs\CASE_STUDY_Cognitive_Load_Spike_RevA.md"
)

foreach ($file in $filesToUpdate)
{
    if (Test-Path $file)
    {
        try
        {
            $content = Get-Content $file -Raw -Encoding UTF8
            
            $content = $content -replace 'yourusername', $GITHUB_USERNAME
            $content = $content -replace 'your-email@example\.com', $YOUR_EMAIL
            $content = $content -replace '\[Your Name\]', $YOUR_NAME
            
            # Remove Twitter mentions
            $content = $content -replace '\n.*Twitter:.*@yourhandle.*\n', "`n"
            $content = $content -replace '\n.*\*\*Twitter:\*\*.*@yourhandle.*\n', "`n"
            $content = $content -replace '- \*\*Twitter:\*\*.*@yourhandle.*\n', ''
            $content = $content -replace '@yourhandle', ''
            
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            [System.IO.File]::WriteAllText((Resolve-Path $file), $content, $utf8NoBom)
            
            Write-Host "   [OK] Updated $file" -ForegroundColor Green
        }
        catch
        {
            Write-Host "   [ERROR] Failed to update $file" -ForegroundColor Red
        }
    }
}

# Step 5: Clean Up Helper Files
Write-Host ""
Write-Host "Step 5: Cleaning up helper files..." -ForegroundColor Yellow

$helperFiles = @(
    "QUICK_DEPLOY.md",
    "READY_TO_PUSH.md",
    "PRE_PUSH_CHECKLIST.md",
    "IMPLEMENTATION_GUIDE.md",
    "ASSETS_README.md",
    "SUMMARY.md",
    "FILES_OVERVIEW.txt",
    "BLBZ3D_QUICKSTART.md",
    "validate-docs.sh"
)

foreach ($file in $helperFiles)
{
    if (Test-Path $file)
    {
        Remove-Item $file -Force
        Write-Host "   [OK] Removed $file" -ForegroundColor Green
    }
}

# Step 6: Validation
Write-Host ""
Write-Host "Step 6: Validating deployment..." -ForegroundColor Yellow

$remainingPlaceholders = Select-String -Path README.md,CONTRIBUTING.md,docs\*.md -Pattern "yourusername|your-email@example\.com|\[Your Name\]" -ErrorAction SilentlyContinue

if ($remainingPlaceholders)
{
    Write-Host "   [WARNING] Found placeholders still to replace:" -ForegroundColor Yellow
    foreach ($match in $remainingPlaceholders)
    {
        Write-Host "      - $($match.Filename): Line $($match.LineNumber)" -ForegroundColor Yellow
    }
}
else
{
    Write-Host "   [OK] All placeholders replaced!" -ForegroundColor Green
}

$requiredStructure = @{
    "Root" = @("README.md", "CHANGELOG.md", "VERSION", "LICENSE", "CONTRIBUTING.md")
    "docs\" = @("ROADMAP_v5.md", "SCOPE_v5.md", "CASE_STUDY_Cognitive_Load_Spike_RevA.md")
}

$allGood = $true
foreach ($location in $requiredStructure.Keys)
{
    foreach ($file in $requiredStructure[$location])
    {
        $path = Join-Path $location $file
        if (Test-Path $path)
        {
            Write-Host "   [OK] $path" -ForegroundColor Green
        }
        else
        {
            Write-Host "   [MISSING] $path" -ForegroundColor Red
            $allGood = $false
        }
    }
}

$screenshots = Get-ChildItem "docs\assets\*.png" -ErrorAction SilentlyContinue
if ($screenshots)
{
    Write-Host "   [OK] Found $($screenshots.Count) screenshot(s) in docs\assets\" -ForegroundColor Green
}
else
{
    Write-Host "   [WARNING] No screenshots in docs\assets\" -ForegroundColor Yellow
}

# Step 7: Git Status
Write-Host ""
Write-Host "Step 7: Git status..." -ForegroundColor Yellow

try
{
    $gitStatus = git status --porcelain 2>$null
    if ($LASTEXITCODE -eq 0)
    {
        if ($gitStatus)
        {
            Write-Host "   [OK] Changes detected, ready to commit" -ForegroundColor Green
            Write-Host ""
            Write-Host "   Files changed:" -ForegroundColor Cyan
            git status --short
        }
        else
        {
            Write-Host "   [WARNING] No changes detected" -ForegroundColor Yellow
        }
    }
    else
    {
        Write-Host "   [WARNING] Not in a git repository" -ForegroundColor Yellow
    }
}
catch
{
    Write-Host "   [WARNING] Git not available" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "                    DEPLOYMENT SUMMARY" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

if ($allGood -and -not $remainingPlaceholders)
{
    Write-Host "SUCCESS! All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your documentation is ready to push!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Review changes:" -ForegroundColor White
    Write-Host "      git status" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   2. Add all files:" -ForegroundColor White
    Write-Host "      git add ." -ForegroundColor Gray
    Write-Host ""
    Write-Host "   3. Commit with message:" -ForegroundColor White
    Write-Host "      git commit -m `"docs: Refactor documentation for v0.2.0`"" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   4. Push to GitHub:" -ForegroundColor White
    Write-Host "      git push origin main" -ForegroundColor Gray
    Write-Host ""
    Write-Host "After pushing, visit: https://github.com/$GITHUB_USERNAME/llmscope" -ForegroundColor Cyan
}
else
{
    Write-Host "Some issues found - please review above" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Cyan
    Write-Host "  - Manually add screenshots to docs\assets\" -ForegroundColor White
    Write-Host "  - Check all files were downloaded to repo root" -ForegroundColor White
    Write-Host "  - Review remaining placeholders listed above" -ForegroundColor White
}

Write-Host ""
Write-Host "Deployment script complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
