# ===========================================
# DORA - Setup Local (Windows, sem Docker)
# Baixa versoes portaveis dos servicos
# ===========================================
param(
    [string]$InstallDir = "$PSScriptRoot\..\local-services"
)

$ErrorActionPreference = "Stop"

$versions = @{
    postgres      = "16.8-1"
    redis         = "7.4.2"
    elasticsearch = "8.17.0"
    qdrant        = "1.13.2"
    minio         = "latest"
}

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK($msg) { Write-Host "   [OK] $msg" -ForegroundColor Green }
function Write-Skip($msg) { Write-Host "   [SKIP] $msg" -ForegroundColor Yellow }

# -----------------------------------------------
# Create install directory
# -----------------------------------------------
$resolved = Resolve-Path -Path $InstallDir -ErrorAction SilentlyContinue
if ($resolved) {
    $InstallDir = $resolved.Path
} else {
    $InstallDir = (New-Item -ItemType Directory -Path $InstallDir -Force).FullName
}
Write-Step "Diretorio de instalacao: $InstallDir"

# -----------------------------------------------
# PostgreSQL (EDB zip)
# -----------------------------------------------
Write-Step "PostgreSQL $($versions.postgres)"
$pgDir = "$InstallDir\pgsql"
if (Test-Path "$pgDir\bin\pg_ctl.exe") {
    Write-Skip "PostgreSQL ja instalado em $pgDir"
} else {
    $pgZip = "$InstallDir\postgresql.zip"
    $pgUrl = "https://get.enterprisedb.com/postgresql/postgresql-$($versions.postgres)-windows-x64-binaries.zip"
    Write-Host "   Baixando de $pgUrl ..."
    Invoke-WebRequest -Uri $pgUrl -OutFile $pgZip -UseBasicParsing
    Write-Host "   Extraindo..."
    Expand-Archive -Path $pgZip -DestinationPath $InstallDir -Force
    Remove-Item $pgZip
    Write-OK "PostgreSQL extraido em $pgDir"
}

# Inicializar data dir se nao existir
$pgData = "$InstallDir\pgdata"
if (-not (Test-Path "$pgData\PG_VERSION")) {
    Write-Host "   Inicializando cluster PostgreSQL..."
    & "$pgDir\bin\initdb.exe" -D $pgData -U dora -E UTF8 --locale=C
    # Liberar conexao local com password
    Add-Content -Path "$pgData\pg_hba.conf" -Value "host all all 127.0.0.1/32 md5"
    Add-Content -Path "$pgData\pg_hba.conf" -Value "host all all ::1/128 md5"
    Write-OK "Cluster inicializado em $pgData"
}

# -----------------------------------------------
# Redis (Memurai ou redis-windows)
# -----------------------------------------------
Write-Step "Redis (via redis-windows fork)"
$redisDir = "$InstallDir\redis"
if (Test-Path "$redisDir\redis-server.exe") {
    Write-Skip "Redis ja instalado em $redisDir"
} else {
    New-Item -ItemType Directory -Path $redisDir -Force | Out-Null
    $redisUrl = "https://github.com/zkteco-home/redis-windows/releases/download/$($versions.redis)/redis-$($versions.redis)-windows-x64.zip"
    $redisZip = "$InstallDir\redis.zip"
    Write-Host "   Baixando de $redisUrl ..."
    Invoke-WebRequest -Uri $redisUrl -OutFile $redisZip -UseBasicParsing
    Expand-Archive -Path $redisZip -DestinationPath $redisDir -Force
    # Move files from inner folder if present
    $inner = Get-ChildItem $redisDir -Directory | Select-Object -First 1
    if ($inner -and (Test-Path "$($inner.FullName)\redis-server.exe")) {
        Move-Item "$($inner.FullName)\*" $redisDir -Force
        Remove-Item $inner.FullName -Recurse -Force
    }
    Remove-Item $redisZip -ErrorAction SilentlyContinue
    Write-OK "Redis extraido em $redisDir"
}

# -----------------------------------------------
# Elasticsearch
# -----------------------------------------------
Write-Step "Elasticsearch $($versions.elasticsearch)"
$esDir = "$InstallDir\elasticsearch-$($versions.elasticsearch)"
if (Test-Path "$esDir\bin\elasticsearch.bat") {
    Write-Skip "Elasticsearch ja instalado em $esDir"
} else {
    $esZip = "$InstallDir\elasticsearch.zip"
    $esUrl = "https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-$($versions.elasticsearch)-windows-x86_64.zip"
    Write-Host "   Baixando de $esUrl ..."
    Invoke-WebRequest -Uri $esUrl -OutFile $esZip -UseBasicParsing
    Write-Host "   Extraindo (pode demorar)..."
    Expand-Archive -Path $esZip -DestinationPath $InstallDir -Force
    Remove-Item $esZip
    # Desabilitar seguranca para dev local
    $esYml = "$esDir\config\elasticsearch.yml"
    Add-Content -Path $esYml -Value "`nxpack.security.enabled: false"
    Add-Content -Path $esYml -Value "discovery.type: single-node"
    Add-Content -Path $esYml -Value "cluster.routing.allocation.disk.threshold_enabled: false"
    Write-OK "Elasticsearch extraido em $esDir"
}

# -----------------------------------------------
# Qdrant
# -----------------------------------------------
Write-Step "Qdrant $($versions.qdrant)"
$qdrantDir = "$InstallDir\qdrant"
if (Test-Path "$qdrantDir\qdrant.exe") {
    Write-Skip "Qdrant ja instalado em $qdrantDir"
} else {
    New-Item -ItemType Directory -Path $qdrantDir -Force | Out-Null
    $qdrantUrl = "https://github.com/qdrant/qdrant/releases/download/v$($versions.qdrant)/qdrant-x86_64-pc-windows-msvc.zip"
    $qdrantZip = "$InstallDir\qdrant.zip"
    Write-Host "   Baixando de $qdrantUrl ..."
    Invoke-WebRequest -Uri $qdrantUrl -OutFile $qdrantZip -UseBasicParsing
    Expand-Archive -Path $qdrantZip -DestinationPath $qdrantDir -Force
    Remove-Item $qdrantZip
    Write-OK "Qdrant extraido em $qdrantDir"
}

# -----------------------------------------------
# MinIO
# -----------------------------------------------
Write-Step "MinIO (latest)"
$minioDir = "$InstallDir\minio"
if (Test-Path "$minioDir\minio.exe") {
    Write-Skip "MinIO ja instalado em $minioDir"
} else {
    New-Item -ItemType Directory -Path $minioDir -Force | Out-Null
    $minioUrl = "https://dl.min.io/server/minio/release/windows-amd64/minio.exe"
    Write-Host "   Baixando de $minioUrl ..."
    Invoke-WebRequest -Uri $minioUrl -OutFile "$minioDir\minio.exe" -UseBasicParsing
    New-Item -ItemType Directory -Path "$minioDir\data" -Force | Out-Null
    Write-OK "MinIO salvo em $minioDir"
}

# -----------------------------------------------
# MinIO Client (mc)
# -----------------------------------------------
if (-not (Test-Path "$minioDir\mc.exe")) {
    $mcUrl = "https://dl.min.io/client/mc/release/windows-amd64/mc.exe"
    Write-Host "   Baixando MinIO Client..."
    Invoke-WebRequest -Uri $mcUrl -OutFile "$minioDir\mc.exe" -UseBasicParsing
    Write-OK "mc.exe salvo em $minioDir"
}

# -----------------------------------------------
# Resumo
# -----------------------------------------------
Write-Host "`n==========================================" -ForegroundColor Green
Write-Host " Setup concluido!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host " Agora rode:  npm run local:start"
Write-Host ""
Write-Host " Ou inicie manualmente:"
Write-Host "   PostgreSQL:     $pgDir\bin\pg_ctl start -D $pgData -l $InstallDir\pg.log"
Write-Host "   Redis:          $redisDir\redis-server"
Write-Host "   Elasticsearch:  $esDir\bin\elasticsearch.bat"
Write-Host "   Qdrant:         $qdrantDir\qdrant.exe"
Write-Host "   MinIO:          $minioDir\minio.exe server $minioDir\data --console-address :9001"
Write-Host ""
