# cleanup_project.ps1
# Organize LLMscope project files into proper structure
# RUN FROM PROJECT ROOT

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "LLMscope Project Cleanup Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Create archive directory structure
Write-Host "Creating archive directory structure..." -ForegroundColor Yellow

$archiveDirs = @(
    "./archive",
    "./archive/marketing",
    "./archive/financials",
    "./archive/business",
    "./archive/legal",
    "./archive/internal",
    "./archive/experiments",
    "./archive/backups"
)

foreach ($dir in $archiveDirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created: $dir" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Moving files to archive..." -ForegroundColor Yellow

# Marketing files
$marketingFiles = @(
    "*.pdf",
    "*.docx",
    "*.pptx",
    "*prospectus*",
    "*pitch*",
    "*presentation*"
)

foreach ($pattern in $marketingFiles) {
    Get-ChildItem -Path "." -Filter $pattern -File | ForEach-Object {
        Move-Item -Path $_.FullName -Destination "./archive/marketing/$($_.Name)" -Force
        Write-Host "Moved to marketing: $($_.Name)" -ForegroundColor Green
    }
}

# Financial files
$financialFiles = @(
    "*financial*",
    "*projection*",
    "*pricing*",
    "*cost*analysis*"
)

foreach ($pattern in $financialFiles) {
    Get-ChildItem -Path "." -Filter $pattern -File | ForEach-Object {
        Move-Item -Path $_.FullName -Destination "./archive/financials/$($_.Name)" -Force
        Write-Host "Moved to financials: $($_.Name)" -ForegroundColor Green
    }
}

# Legal/IP files
$legalFiles = @(
    "*legal*",
    "*ip*brief*",
    "*addendum*",
    "*letterhead*"
)

foreach ($pattern in $legalFiles) {
    Get-ChildItem -Path "." -Filter $pattern -File | ForEach-Object {
        Move-Item -Path $_.FullName -Destination "./archive/legal/$($_.Name)" -Force
        Write-Host "Moved to legal: $($_.Name)" -ForegroundColor Green
    }
}

# Backups & databases
$backupFiles = @(
    "*backup*",
    "*.db",
    "llmscope*.csv"
)

foreach ($pattern in $backupFiles) {
    Get-ChildItem -Path "." -Filter $pattern -File | ForEach-Object {
        Move-Item -Path $_.FullName -Destination "./archive/backups/$($_.Name)" -Force
        Write-Host "Moved to backups: $($_.Name)" -ForegroundColor Green
    }
}

# Experiments & old versions
$experimentFiles = @(
    "*_revA*",
    "*_revB*",
    "*_revC*",
    "*_revD*",
    "*_revE*",
    "*experiment*",
    "*test*spike*",
    "benchmark_suite*",
    "chatgpt_*",
    "compare_*",
    "Compare-*",
    "Write-*",
    "reset_*",
    "run_wrapper*",
    "push_to_github*",
    "release_nightly*",
    "phase5_*",
    "phase_5_*",
    "phase*_final*",
    "docker_rebuild*",
    "docker_verify*",
    "git_verify*",
    "finalize_*",
    "migrate_to_*",
    "manage_docs*"
)

foreach ($pattern in $experimentFiles) {
    Get-ChildItem -Path "." -Filter $pattern -File | ForEach-Object {
        Move-Item -Path $_.FullName -Destination "./archive/experiments/$($_.Name)" -Force
        Write-Host "Moved to experiments: $($_.Name)" -ForegroundColor Green
    }
}

# Business docs
$businessFiles = @(
    "SCOPE_*",
    "ROADMAP_*",
    "Phase*_*",
    "progress.md",
    "CASE_STUDY*",
    "LLMscope_Context*",
    "LLMscope_Onboarding*",
    "LLMscope_Research*",
    "LLMscope_Phase6*"
)

foreach ($pattern in $businessFiles) {
    Get-ChildItem -Path "." -Filter $pattern -File | ForEach-Object {
        Move-Item -Path $_.FullName -Destination "./archive/business/$($_.Name)" -Force
        Write-Host "Moved to business: $($_.Name)" -ForegroundColor Green
    }
}

# Cleanup misc files
$miscFiles = @(
    "*.png",
    "*.log",
    "*tree*",
    "*snapshot*",
    "*.bat",
    "dependency_table*",
    "service_dependency*",
    "LLMscope_IP_Brief*",
    "AddendumA*",
    "*.tsx",
    "*.css",
    "*.html",
    "*.js",
    "NelsonLegend*",
    "ViolationModal*",
    "useSpc*",
    "LatencyChart*",
    "setup.sh",
    "llmscope-*"
)

foreach ($pattern in $miscFiles) {
    Get-ChildItem -Path "." -Filter $pattern -File | ForEach-Object {
        Move-Item -Path $_.FullName -Destination "./archive/internal/$($_.Name)" -Force
        Write-Host "Moved to internal: $($_.Name)" -ForegroundColor Green
    }
}

# Clean up old folder structure if it exists
Write-Host ""
Write-Host "Cleaning up old directory structure..." -ForegroundColor Yellow

if (Test-Path "./Deployable") {
    # Move contents out
    Get-ChildItem -Path "./Deployable" -Recurse -File | ForEach-Object {
        $relativePath = $_.FullName.Replace("./Deployable", "")
        $targetDir = Split-Path -Parent "$relativePath"
        
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        
        Copy-Item -Path $_.FullName -Destination $relativePath -Force
        Write-Host "Extracted: $($_.Name)" -ForegroundColor Green
    }
    
    Remove-Item -Path "./Deployable" -Recurse -Force
    Write-Host "Removed old Deployable folder" -ForegroundColor Green
}

# Verify structure
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Archive created with subdirectories:" -ForegroundColor Yellow
Get-ChildItem -Path "./archive" -Directory | ForEach-Object {
    $count = (Get-ChildItem -Path $_.FullName -File).Count
    Write-Host "  - $($_.Name)/  ($count files)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review ./archive to make sure everything looks good" -ForegroundColor White
Write-Host "2. Run: git add . && git commit -m 'Phase 2: Clean project structure'" -ForegroundColor White
Write-Host "3. Create .gitignore with /archive/" -ForegroundColor White
Write-Host "4. Run: git rm --cached .env" -ForegroundColor White
Write-Host ""
Write-Host "Ready for production! Next: E2E tests" -ForegroundColor Green