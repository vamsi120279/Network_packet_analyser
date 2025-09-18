# Network Packet Analysis (Full Stack)

This scaffold creates a small microservices stack for packet capture, parsing, classification, storage and a React UI.

Services:
- gateway (API + storage) : http://localhost:8080
- capture-service (captures live or handles uploaded PCAPs) : http://localhost:8081
- parser-service (parses raw packet bytes) : http://localhost:8082
- classifier-service (labels packets) : http://localhost:8083
- ui (React + Tailwind) : http://localhost:5173

Database: Postgres on port 5432.

## Quick start

1. Ensure you have Java 17, Maven, Node.js, Docker & Docker Compose installed.
2. Build Java services:
   - cd capture-service && mvn -q package
   - cd ../parser-service && mvn -q package
   - cd ../classifier-service && mvn -q package
   - cd ../gateway && mvn -q package
3. Start with Docker Compose:
   - docker-compose up --build
4. Open UI: http://localhost:5173

Note: Live capture inside Docker requires special privileges (host networking and NET_RAW/NET_ADMIN capabilities).
