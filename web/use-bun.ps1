# PowerShell script to redirect npm commands to bun
# Usage: Set-Alias npm ./use-bun.ps1

param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Arguments
)

Write-Host "🚀 Redirecting to bun command..." -ForegroundColor Yellow

# Map npm commands to bun equivalents
switch ($Arguments[0]) {
    "install" { 
        if ($Arguments.Length -eq 1) {
            bun install
        } else {
            $packages = $Arguments[1..($Arguments.Length-1)]
            bun add @packages
        }
    }
    "run" {
        if ($Arguments.Length -gt 1) {
            $script = $Arguments[1]
            bun run $script
        } else {
            Write-Host "Error: No script specified" -ForegroundColor Red
        }
    }
    "start" { bun run start }
    "dev" { bun run dev }
    "build" { bun run build }
    "test" { bun test }
    default {
        Write-Host "Unsupported npm command: $($Arguments[0])" -ForegroundColor Red
        Write-Host "Please use bun directly: bun $($Arguments -join ' ')" -ForegroundColor Yellow
    }
}
