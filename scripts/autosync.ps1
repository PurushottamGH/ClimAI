# ClimAI Auto-Sync Engine
# This script watches for file changes and automatically pushes to GitHub/Render/Vercel.

$path = Get-Location
$filter = "*.*" # Watch all files
$includeSubdirectories = $true

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $path
$watcher.Filter = $filter
$watcher.IncludeSubdirectories = $includeSubdirectories
$watcher.EnableRaisingEvents = $true

Write-Host "🚀 ClimAI Auto-Sync is ACTIVE!" -ForegroundColor Cyan
Write-Host "Watching for changes in: $path" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop the sync engine."

$global:lastChange = Get-Date
$debounceTime = 5 # Seconds to wait after a change before pushing

$action = {
    $currentDate = Get-Date
    $timeSinceLast = ($currentDate - $global:lastChange).TotalSeconds
    
    # Simple debouncing to avoid recursive git loops or spamming commits
    if ($timeSinceLast -gt $debounceTime) {
        $global:lastChange = $currentDate
        $fileName = $Event.SourceEventArgs.Name
        
        # Skip internal git and cache files
        if ($fileName -match "\.git" -or $fileName -match "__pycache__" -or $fileName -match "climai\.log") {
            return
        }

        Write-Host "`n⚡ Change detected in: $fileName" -ForegroundColor Yellow
        Write-Host "Staging and pushing updates..." -ForegroundColor Gray
        
        try {
            git add .
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            git commit -m "auto-sync: updates detected at $timestamp"
            git push origin main
            Write-Host "✅ LIVE SYNC COMPLETE! GitHub, Render, and Vercel are updating." -ForegroundColor Green
        } catch {
            Write-Host "❌ Sync failed. Please check your internet connection or git status." -ForegroundColor Red
        }
    }
}

$onChanged = Register-ObjectEvent $watcher "Changed" -Action $action
$onCreated = Register-ObjectEvent $watcher "Created" -Action $action
$onDeleted = Register-ObjectEvent $watcher "Deleted" -Action $action
$onRenamed = Register-ObjectEvent $watcher "Renamed" -Action $action

while ($true) {
    Start-Sleep -Seconds 1
}
