# PowerShell script to set up automatic bun aliases
# Run this script to redirect npm/yarn/pnpm commands to bun

Write-Host "🚀 Setting up bun command aliases..." -ForegroundColor Green

# Create functions that redirect to bun
function npm {
    param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
    
    Write-Host "🔄 Redirecting npm to bun..." -ForegroundColor Yellow
    
    if ($Arguments.Length -eq 0) {
        Write-Host "Usage: npm <command>" -ForegroundColor Red
        return
    }
    
    switch ($Arguments[0]) {
        "install" { 
            if ($Arguments.Length -eq 1) {
                bun install
            } else {
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
            Write-Host "Running: bun $allArgs" -ForegroundColor Cyan
            Invoke-Expression "bun $allArgs"
        }
    }
}

function yarn {
    param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
    Write-Host "🔄 Redirecting yarn to bun..." -ForegroundColor Yellow
    
    if ($Arguments.Length -eq 0) {
        bun install
        return
    }
    
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

function pnpm {
    param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
    Write-Host "🔄 Redirecting pnpm to bun..." -ForegroundColor Yellow
    
    if ($Arguments.Length -eq 0) {
        bun install
        return
    }
    
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

Write-Host "✅ Bun aliases set up for this session!" -ForegroundColor Green
Write-Host "Now npm, yarn, and pnpm commands will automatically use bun!" -ForegroundColor Cyan
