[CmdletBinding()]
param ()

$ErrorActionPreference = 'Stop'

$libraryRoot = Split-Path -Path $PSScriptRoot -Parent
$generatorProjectPath = Join-Path -Path $PSScriptRoot -ChildPath 'IkhoSchemaGenerator/IkhoSchemaGenerator.csproj'

if ($IsWindows) {
    $publishDirectory = Join-Path -Path $PSScriptRoot -ChildPath 'IkhoSchemaGenerator/bin/Release/net10.0/win-x64/publish'
    $generatorExecutablePath = Join-Path -Path $publishDirectory -ChildPath 'IkhoSchemaGenerator.exe'

    & dotnet publish $generatorProjectPath -c Release -r win-x64 -p:PublishSingleFile=true --self-contained false -o $publishDirectory | Out-Null

    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    if (Test-Path -Path $generatorExecutablePath) {
        Unblock-File -Path $generatorExecutablePath -ErrorAction SilentlyContinue
    }

    & $generatorExecutablePath $libraryRoot
}
else {
    & dotnet run --project $generatorProjectPath -- $libraryRoot
}

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host 'Schema generation completed successfully.'