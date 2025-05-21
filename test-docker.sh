#!/bin/bash
# Script to test Docker functionality

echo "Testing Docker installation..."

# Test basic Docker functionality
echo "Running 'hello-world' container to test basic functionality:"
docker run --rm hello-world

# Check Docker network connectivity
echo -e "\nTesting Docker network connectivity..."
echo "Trying to ping Docker Hub:"
ping -c 3 registry-1.docker.io

# Test Docker registry authentication
echo -e "\nTesting Docker registry authentication:"
echo "Trying to pull a small public image:"
docker pull alpine:latest

echo -e "\nDocker diagnostic information:"
docker info

echo -e "\nDocker version information:"
docker version

echo -e "\nIf the above tests completed without errors, Docker is working properly."
echo "If you see authentication errors, try logging in to Docker Hub:"
echo "docker login"
echo ""
echo "If you see connectivity errors, check your network and security settings as described in:"
echo "/Users/tinamarie/dev/SecondBrain/mac-security-configuration.md"