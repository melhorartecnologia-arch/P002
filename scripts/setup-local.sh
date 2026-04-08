#!/bin/bash
# ===========================================
# DORA - Setup Local (Linux/macOS, sem Docker)
# Instala dependências via gerenciador de pacotes
# ===========================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOCAL_DIR="${ROOT_DIR}/local-services"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m'

step() { echo -e "\n${CYAN}>> $1${NC}"; }
ok() { echo -e "   ${GREEN}[OK] $1${NC}"; }
skip() { echo -e "   ${YELLOW}[SKIP] $1${NC}"; }

OS="$(uname -s)"
mkdir -p "$LOCAL_DIR"

# -----------------------------------------------
# Detect package manager
# -----------------------------------------------
if [ "$OS" = "Darwin" ]; then
    PM="brew"
    if ! command -v brew &>/dev/null; then
        echo "Homebrew não encontrado. Instale: https://brew.sh"
        exit 1
    fi
elif command -v apt-get &>/dev/null; then
    PM="apt"
elif command -v dnf &>/dev/null; then
    PM="dnf"
elif command -v pacman &>/dev/null; then
    PM="pacman"
else
    echo "Gerenciador de pacotes não reconhecido. Instale manualmente:"
    echo "  PostgreSQL 16, Redis 7, Elasticsearch 8.x, Qdrant, MinIO"
    exit 1
fi

# -----------------------------------------------
# PostgreSQL
# -----------------------------------------------
step "PostgreSQL 16"
if command -v psql &>/dev/null; then
    skip "PostgreSQL já instalado: $(psql --version)"
else
    case $PM in
        brew) brew install postgresql@16 ;;
        apt)  sudo apt-get install -y postgresql postgresql-contrib ;;
        dnf)  sudo dnf install -y postgresql-server postgresql-contrib ;;
        pacman) sudo pacman -S --noconfirm postgresql ;;
    esac
    ok "PostgreSQL instalado"
fi

# -----------------------------------------------
# Redis
# -----------------------------------------------
step "Redis 7"
if command -v redis-server &>/dev/null; then
    skip "Redis já instalado: $(redis-server --version | head -1)"
else
    case $PM in
        brew) brew install redis ;;
        apt)  sudo apt-get install -y redis-server ;;
        dnf)  sudo dnf install -y redis ;;
        pacman) sudo pacman -S --noconfirm redis ;;
    esac
    ok "Redis instalado"
fi

# -----------------------------------------------
# Elasticsearch 8.17
# -----------------------------------------------
step "Elasticsearch 8.17"
ES_VER="8.17.0"
ES_DIR="${LOCAL_DIR}/elasticsearch-${ES_VER}"
if [ -f "${ES_DIR}/bin/elasticsearch" ]; then
    skip "Elasticsearch já instalado em ${ES_DIR}"
else
    if [ "$OS" = "Darwin" ]; then
        ARCH="$(uname -m)"
        if [ "$ARCH" = "arm64" ]; then
            ES_URL="https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-${ES_VER}-darwin-aarch64.tar.gz"
        else
            ES_URL="https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-${ES_VER}-darwin-x86_64.tar.gz"
        fi
    else
        ES_URL="https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-${ES_VER}-linux-x86_64.tar.gz"
    fi
    echo "   Baixando Elasticsearch..."
    curl -L "$ES_URL" -o "${LOCAL_DIR}/es.tar.gz"
    tar xzf "${LOCAL_DIR}/es.tar.gz" -C "${LOCAL_DIR}"
    rm "${LOCAL_DIR}/es.tar.gz"
    # Disable security for local dev
    echo -e "\nxpack.security.enabled: false\ndiscovery.type: single-node" >> "${ES_DIR}/config/elasticsearch.yml"
    ok "Elasticsearch extraído em ${ES_DIR}"
fi

# -----------------------------------------------
# Qdrant
# -----------------------------------------------
step "Qdrant"
QDRANT_DIR="${LOCAL_DIR}/qdrant"
if [ -f "${QDRANT_DIR}/qdrant" ]; then
    skip "Qdrant já instalado em ${QDRANT_DIR}"
else
    mkdir -p "$QDRANT_DIR"
    QDRANT_VER="1.13.2"
    if [ "$OS" = "Darwin" ]; then
        ARCH="$(uname -m)"
        if [ "$ARCH" = "arm64" ]; then
            QDRANT_URL="https://github.com/qdrant/qdrant/releases/download/v${QDRANT_VER}/qdrant-aarch64-apple-darwin.tar.gz"
        else
            QDRANT_URL="https://github.com/qdrant/qdrant/releases/download/v${QDRANT_VER}/qdrant-x86_64-apple-darwin.tar.gz"
        fi
    else
        QDRANT_URL="https://github.com/qdrant/qdrant/releases/download/v${QDRANT_VER}/qdrant-x86_64-unknown-linux-musl.tar.gz"
    fi
    echo "   Baixando Qdrant..."
    curl -L "$QDRANT_URL" -o "${LOCAL_DIR}/qdrant.tar.gz"
    tar xzf "${LOCAL_DIR}/qdrant.tar.gz" -C "$QDRANT_DIR"
    rm "${LOCAL_DIR}/qdrant.tar.gz"
    ok "Qdrant extraído em ${QDRANT_DIR}"
fi

# -----------------------------------------------
# MinIO
# -----------------------------------------------
step "MinIO"
MINIO_DIR="${LOCAL_DIR}/minio"
if [ -f "${MINIO_DIR}/minio" ]; then
    skip "MinIO já instalado em ${MINIO_DIR}"
else
    mkdir -p "${MINIO_DIR}/data"
    if [ "$OS" = "Darwin" ]; then
        ARCH="$(uname -m)"
        if [ "$ARCH" = "arm64" ]; then
            MINIO_URL="https://dl.min.io/server/minio/release/darwin-arm64/minio"
        else
            MINIO_URL="https://dl.min.io/server/minio/release/darwin-amd64/minio"
        fi
    else
        MINIO_URL="https://dl.min.io/server/minio/release/linux-amd64/minio"
    fi
    echo "   Baixando MinIO..."
    curl -L "$MINIO_URL" -o "${MINIO_DIR}/minio"
    chmod +x "${MINIO_DIR}/minio"

    # mc client
    MC_URL="${MINIO_URL/server\/minio/client\/mc}"
    MC_URL="${MC_URL/minio$/mc}"
    curl -L "$MC_URL" -o "${MINIO_DIR}/mc"
    chmod +x "${MINIO_DIR}/mc"

    ok "MinIO salvo em ${MINIO_DIR}"
fi

# -----------------------------------------------
# Summary
# -----------------------------------------------
echo -e "\n${GREEN}==========================================${NC}"
echo -e "${GREEN} Setup concluído!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo " Agora rode:  npm run local:start"
echo ""
