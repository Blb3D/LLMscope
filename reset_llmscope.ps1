# ===============================================
# reset_llmscope.ps1 (Rev H)
# BLB3D Labs — LLMscope Phase 5 Developer Utility
# ===============================================

function Wait-ForKey {
    Write-Host ''
    Write-Host 'Press any key to continue...'
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
}

# create logs folder if missing
$logDir = Join-Path $PSScriptRoot 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir 'reset_log.txt'

# helper for timestamped logging
function Write-Log($msg) {
    $stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    "$stamp  $msg" | Tee-Object -FilePath $logFile -Append
}

try {
    Write-Host ''
    Write-Host 'LLMscope Environment Reset Utility'
    Write-Host '-----------------------------------'
    Write-Host '1. Clear database and restart containers (fast reset)'
    Write-Host '2. Rebuild images and restart (medium reset)'
    Write-Host '3. Full system prune and rebuild (complete reset)'
    Write-Host '4. Smoke Test (2-sample simulated benchmark)'
    Write-Host ''
    $choice = Read-Host 'Enter your choice (1-4)'

    $dbPath = Join-Path $PSScriptRoot 'data\llmscope.db'

    switch ($choice) {
        1 {
            Write-Log 'Option 1 selected: clear DB and restart containers.'
            docker-compose down
            if (Test-Path $dbPath) {
                Remove-Item -Force $dbPath
                Write-Log 'Deleted llmscope.db (test data cleared).'
            } else {
                Write-Log 'No existing database found.'
            }
            docker-compose up -d
            Write-Log 'Quick reset complete.'
            Write-Host 'Quick reset complete.  Open http://localhost:3000 to verify charts are empty.'
        }

        2 {
            Write-Log 'Option 2 selected: rebuild images and restart.'
            docker-compose down
            if (Test-Path $dbPath) {
                Remove-Item -Force $dbPath
                Write-Log 'Deleted llmscope.db.'
            }
            docker-compose up -d --build
            Write-Log 'Rebuild complete.'
            Write-Host 'Rebuild complete.'
        }

        3 {
            Write-Log 'Option 3 selected: full system prune and rebuild.'
            docker-compose down
            if (Test-Path $dbPath) {
                Remove-Item -Force $dbPath
                Write-Log 'Deleted llmscope.db.'
            }
            docker system prune -a -f
            docker-compose up -d --build
            Write-Host 'Waiting 10 seconds for containers to initialize...'
            Start-Sleep -Seconds 10
            Write-Log 'Everything rebuilt from scratch.'
            Write-Host 'Everything rebuilt from scratch.'
        }

        4 {
            Write-Log 'Option 4 selected: smoke test started.'
            docker-compose up -d
            Start-Sleep -Seconds 5
            $bench = Join-Path $PSScriptRoot 'benchmark_suite_revB.py'
            if (Test-Path $bench) {
                try {
                    python $bench --mode simulated --samples 2 --api-key dev-123
                    Write-Log 'Smoke test executed successfully.'
                    Write-Host 'Smoke test complete — check dashboard for new entries.'
                }
                catch {
                    Write-Log "Smoke test failed: $($_.Exception.Message)"
                    Write-Host 'Benchmark script error:'
                    Write-Host $_.Exception.Message
                }
            }
            else {
                Write-Log 'benchmark_suite_revB.py not found.'
                Write-Host 'benchmark_suite_revB.py not found in current directory.'
            }
        }

        Default {
            Write-Log 'Invalid choice.'
            Write-Host 'Invalid choice. Exiting...'
        }
    }

}
catch {
    Write-Log "Script error: $($_.Exception.Message)"
    Write-Host ''
    Write-Host 'An error occurred:'
    Write-Host $_.Exception.Message
}
finally {
    Wait-ForKey
}
