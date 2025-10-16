# Docker Container File Update Commands

## 1. Access Container Terminal
```bash
# Get a shell inside the running container
docker exec -it crawal_service /bin/bash

# Or use sh if bash is not available
docker exec -it crawal_service /bin/sh
```

## 2. Copy Files to Container
```bash
# Copy a single file
docker cp local-file.txt crawal_service:/path/in/container/

# Copy entire directory
docker cp ./local-directory/ crawal_service:/path/in/container/

# Copy from container to local
docker cp crawal_service:/path/in/container/file.txt ./local-file.txt
```

## 3. Update Container with New Image
```bash
# Stop current container
docker stop crawal_service

# Remove old container
docker rm crawal_service

# Run new container with proper port mapping
docker run -d \
  --name crawal_service \
  -p 8000:6379 \
  -p 11235:11235 \
  -p 11234:11234 \
  unclecode/crawl4ai:latest
```

## 4. Mount Local Directory (for development)
```bash
# Run container with local directory mounted
docker run -d \
  --name crawal_service \
  -p 8000:6379 \
  -p 11235:11235 \
  -p 11234:11234 \
  -v /path/to/your/local/code:/app/code \
  unclecode/crawl4ai:latest
```

## 5. Check Container Status
```bash
# List running containers
docker ps

# Check container logs
docker logs crawal_service

# Check container details
docker inspect crawal_service
```

## 6. Restart Services Inside Container
```bash
# Access container
docker exec -it crawal_service /bin/bash

# Restart specific services
supervisorctl restart gunicorn
supervisorctl restart redis
supervisorctl restart mcp_server

# Or restart all services
supervisorctl restart all
```
