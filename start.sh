#!/usr/bin/env bash
# ==============================================================================
# e-LMPC RADAR Unified Service Orchestrator
# Starts:
#   1. PostgreSQL Docker container (lmpc-postgres on :5432)
#   2. FastAPI Python Backend (uvicorn on :8000)
#   3. Next.js Frontend (Next.js server on :3000)
# ==============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}        e-LMPC RADAR: Statutory Packaging Compliance System (v2.0)            ${NC}"
echo -e "${BLUE}        SIH Problem Statement 26034 | Department of Consumer Affairs         ${NC}"
echo -e "${BLUE}==============================================================================${NC}"

# 1. Verify / Start PostgreSQL
echo -e "\n${YELLOW}[1/3] Checking PostgreSQL container (lmpc-postgres)...${NC}"
if docker ps --format '{{.Names}}' | grep -q "^lmpc-postgres$"; then
    echo -e "${GREEN}✓ PostgreSQL container 'lmpc-postgres' is active on port 5432.${NC}"
elif docker ps -a --format '{{.Names}}' | grep -q "^lmpc-postgres$"; then
    echo -e "${YELLOW}Starting existing stopped 'lmpc-postgres' container...${NC}"
    docker start lmpc-postgres >/dev/null
    echo -e "${GREEN}✓ PostgreSQL container started on port 5432.${NC}"
else
    echo -e "${YELLOW}Provisioning new PostgreSQL container 'lmpc-postgres'...${NC}"
    docker run -d --name lmpc-postgres \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_DB=lmpc_db \
        -p 5432:5432 postgres:15-alpine >/dev/null
    echo -e "${GREEN}✓ PostgreSQL container created and running on port 5432.${NC}"
fi

# Detect Local LAN IP for Mobile Access
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")

# Clean shutdown handler for child processes
cleanup() {
    echo -e "\n${YELLOW}[*] Gracefully stopping all services...${NC}"
    if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
        kill "${BACKEND_PID}" 2>/dev/null || true
    fi
    if [ -n "${FRONTEND_PID}" ] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
        kill "${FRONTEND_PID}" 2>/dev/null || true
    fi
    # Wait briefly for ports to release
    sleep 1
    echo -e "${GREEN}✓ All services stopped cleanly. Goodbye!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 2. Start FastAPI Backend (:8000)
echo -e "\n${YELLOW}[2/3] Starting Python FastAPI Backend Engine (:8000)...${NC}"
cd "${BACKEND_DIR}"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo -e "${GREEN}✓ FastAPI Backend started (PID: ${BACKEND_PID}).${NC}"

# Brief pause to let backend bind port
sleep 1.5

# 3. Start Next.js Frontend (:3000)
echo -e "\n${YELLOW}[3/3] Starting Next.js Mobile-First Frontend (:3000)...${NC}"
cd "${FRONTEND_DIR}"
npm run dev -- -H 0.0.0.0 -p 3000 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Next.js Frontend started (PID: ${FRONTEND_PID}).${NC}"

# Print Active Dashboard Banner
echo -e "\n${GREEN}==============================================================================${NC}"
echo -e "${GREEN}  ✓ ALL SERVICES ONLINE & OPERATIONAL!                                        ${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo -e "  💻 Web Console (Desktop):    ${BLUE}http://localhost:3000${NC}"
echo -e "  📱 Phone Access (Local Wi-Fi): ${BLUE}http://${LOCAL_IP}:3000${NC}"
echo -e "  ⚡ Backend API & Swagger:    ${BLUE}http://localhost:8000/docs${NC}"
echo -e "  🗄️ PostgreSQL Database:     ${BLUE}postgresql://postgres:postgres@localhost:5432/lmpc_db${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo -e "  Press ${RED}Ctrl+C${NC} anytime to stop all servers."
echo -e "${GREEN}==============================================================================${NC}\n"

# Wait for background processes
wait
