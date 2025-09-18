# PowerShell Profile - Auto-redirect npm/yarn/pnpm to bun
# This file is loaded automatically when PowerShell starts

Write-Host "🚀 Loading bun aliases..." -ForegroundColor Green

# Redirect npm commands to bun
function npm {
    param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
    
    Write-Host "🔄 npm → bun" -ForegroundColor Yellow
    
    if ($Arguments.Length -eq 0) {
        Write-Host "Usage: npm <command>" -ForegroundColor Red
        return
    }
    
    switch ($Arguments[0]) {
        "install" { 
            if ($Arguments.Length -eq 1) { bun install }
            else { 
                $packages = $Arguments[1..($Arguments.Length-1)] -join " "
                Invoke-Expression "bun add $packages"
            }
        }
        "i" { bun install }
        "run" {
            if ($Arguments.Length -gt 1) {
                $script = $Arguments[1..($Arguments.Length-1)] -join " "
                Invoke-Expression "bun run $script"
            }
        }
        "start" { bun run start }
        "dev" { bun run dev }
        "build" { bun run build }
        "test" { bun test }
        "uninstall" { 
            if ($Arguments.Length -gt 1) {
                $packages = $Arguments[1..($Arguments.Length-1)] -join " "
                Invoke-Expression "bun remove $packages"
            }
        }
        default {
            $allArgs = $Arguments -join " "
            Invoke-Expression "bun $allArgs"
        }
    }
}

# Redirect yarn commands to bun
function yarn {
    param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
    Write-Host "🔄 yarn → bun" -ForegroundColor Yellow
    
    if ($Arguments.Length -eq 0) { bun install; return }
    
    switch ($Arguments[0]) {
        "install" { bun install }
        "add" { 
            $packages = $Arguments[1..($Arguments.Length-1)] -join " "
            Invoke-Expression "bun add $packages"
        }
        "remove" { 
            $packages = $Arguments[1..($Arguments.Length-1)] -join " "
            Invoke-Expression "bun remove $packages"
        }
        "dev" { bun run dev }
        "build" { bun run build }
        "start" { bun run start }
        "test" { bun test }
        default {
            $allArgs = $Arguments -join " "
            Invoke-Expression "bun $allArgs"
        }
    }
}

# Redirect pnpm commands to bun
function pnpm {
    param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
    Write-Host "🔄 pnpm → bun" -ForegroundColor Yellow
    
    if ($Arguments.Length -eq 0) { bun install; return }
    
    switch ($Arguments[0]) {
        "install" { bun install }
        "i" { bun install }
        "add" { 
            $packages = $Arguments[1..($Arguments.Length-1)] -join " "
            Invoke-Expression "bun add $packages"
        }
        "remove" { 
            $packages = $Arguments[1..($Arguments.Length-1)] -join " "
            Invoke-Expression "bun remove $packages"
        }
        "dev" { bun run dev }
        "build" { bun run build }
        "start" { bun run start }
        "test" { bun test }
        default {
            $allArgs = $Arguments -join " "
            Invoke-Expression "bun $allArgs"
        }
    }
}

Write-Host "✅ Bun aliases loaded! npm/yarn/pnpm → bun" -ForegroundColor Green
