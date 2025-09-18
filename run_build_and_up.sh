#!/usr/bin/env bash
set -e
echo "Building Java services..."
for d in capture-service parser-service classifier-service gateway; do
  echo "Building \$d..."
  (cd \$d && mvn -q clean package -DskipTests)
done
echo "Bringing up docker-compose..."
docker-compose up --build
