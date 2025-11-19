# Deployment Guide

This guide covers various deployment options for the Sambhav Security Lab.

> **Security Warning:** This application contains intentional vulnerabilities and should NEVER be deployed to production or exposed to the public internet. Use only in isolated, controlled lab environments.

## Table of Contents

- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Network Isolation](#network-isolation)
- [Security Considerations](#security-considerations)

---

## Local Development

### Prerequisites

- Node.js 16+ and npm
- Git
- 4GB RAM minimum
- 1GB disk space

### Setup

```bash
# Clone the repository
git clone https://github.com/amansky404/sambhav.git
cd sambhav/sambhav

# Install dependencies
npm install

# Run the application
npm start

# Run tests
npm test
```

The application will be available at `http://localhost:5000`

### Environment Variables

Create a `.env` file (optional):

```env
PORT=5000
NODE_ENV=development
```

---

## Docker Deployment

### Quick Start with Docker

```bash
# Build the Docker image
docker build -t sambhav-ctf .

# Run the container
docker run -d \
  --name sambhav-lab \
  -p 5000:5000 \
  --restart unless-stopped \
  sambhav-ctf

# View logs
docker logs -f sambhav-lab

# Stop the container
docker stop sambhav-lab

# Remove the container
docker rm sambhav-lab
```

### Using Docker Compose

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

### Docker Network Isolation

For better isolation, create a custom network:

```bash
# Create an isolated network
docker network create --driver bridge --subnet 172.20.0.0/16 sambhav-isolated

# Run with isolated network
docker run -d \
  --name sambhav-lab \
  --network sambhav-isolated \
  -p 127.0.0.1:5000:5000 \
  sambhav-ctf
```

---

## Cloud Deployment

### AWS EC2

**⚠️ Warning:** Only deploy in isolated VPC with no internet access

```bash
# Launch EC2 instance (Ubuntu 22.04)
# Security Group: Allow port 5000 only from your IP

# SSH into instance
ssh -i your-key.pem ubuntu@ec2-instance-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Clone and run
git clone https://github.com/amansky404/sambhav.git
cd sambhav/sambhav
sudo docker-compose up -d

# Access via: http://ec2-instance-ip:5000
```

**Security Group Configuration:**
```
Inbound Rules:
- Type: Custom TCP
- Port: 5000
- Source: Your IP only (e.g., 1.2.3.4/32)
```

### Google Cloud Platform (GCP)

```bash
# Create a VM instance (Isolated Network)
gcloud compute instances create sambhav-lab \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=sambhav-lab \
  --no-address  # No external IP

# SSH into instance
gcloud compute ssh sambhav-lab --zone=us-central1-a

# Install and run (same as AWS steps)
```

### Azure Virtual Machine

```bash
# Create resource group
az group create --name sambhav-rg --location eastus

# Create VM with no public IP
az vm create \
  --resource-group sambhav-rg \
  --name sambhav-lab \
  --image UbuntuLTS \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address "" \
  --vnet-name sambhav-vnet \
  --subnet sambhav-subnet

# Connect via Bastion or VPN
# Install and run (same as AWS steps)
```

### Kubernetes (For Training Environments)

**Warning:** Only for isolated training clusters

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sambhav-ctf
  namespace: security-lab
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sambhav-ctf
  template:
    metadata:
      labels:
        app: sambhav-ctf
    spec:
      containers:
      - name: sambhav
        image: sambhav-ctf:latest
        ports:
        - containerPort: 5000
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: sambhav-service
  namespace: security-lab
spec:
  type: ClusterIP  # Never use LoadBalancer
  selector:
    app: sambhav-ctf
  ports:
  - port: 5000
    targetPort: 5000
```

Deploy:
```bash
kubectl create namespace security-lab
kubectl apply -f deployment.yaml

# Access via port-forward only
kubectl port-forward -n security-lab svc/sambhav-service 5000:5000
```

---

## Network Isolation

### Using VirtualBox/VMware

1. **Create Isolated Network:**
   - VirtualBox: Create Host-Only network adapter
   - VMware: Create Custom (VMnet) network

2. **Deploy VM:**
   - Install Ubuntu Server
   - Configure with isolated network only
   - Install Docker and deploy application

3. **Access:**
   - Connect from host machine only
   - No internet access for VM

### Using Firewall Rules

**iptables (Linux):**
```bash
# Allow localhost only
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 5000 -s 127.0.0.1 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 5000 -j DROP

# Save rules
sudo iptables-save > /etc/iptables/rules.v4
```

**UFW (Ubuntu):**
```bash
# Enable firewall
sudo ufw enable

# Allow SSH (if remote)
sudo ufw allow from YOUR_IP to any port 22

# Allow app only from localhost
sudo ufw allow from 127.0.0.1 to any port 5000

# Deny all other traffic to port 5000
sudo ufw deny 5000
```

**Windows Firewall:**
```powershell
# Allow only localhost
New-NetFirewallRule -DisplayName "Sambhav Local Only" `
  -Direction Inbound `
  -LocalPort 5000 `
  -Protocol TCP `
  -RemoteAddress 127.0.0.1 `
  -Action Allow

# Block all other
New-NetFirewallRule -DisplayName "Sambhav Block External" `
  -Direction Inbound `
  -LocalPort 5000 `
  -Protocol TCP `
  -Action Block
```

---

## Security Considerations

### DO NOT

❌ Deploy to public cloud without strict network isolation  
❌ Expose port 5000 to the internet  
❌ Use in production environments  
❌ Store sensitive data in the application  
❌ Connect to production networks  
❌ Use with real credentials  

### DO

✅ Deploy in isolated lab networks only  
✅ Use VM snapshots for quick recovery  
✅ Implement network segmentation  
✅ Monitor access logs  
✅ Use VPN for remote access  
✅ Regularly backup lab environment  
✅ Document access controls  

### Network Segmentation Recommendations

```
┌─────────────────────────────────────┐
│   Isolated Lab Network              │
│   (No Internet Access)              │
│                                     │
│   ┌──────────────────┐             │
│   │  Sambhav CTF App │             │
│   │  172.20.0.10     │             │
│   └──────────────────┘             │
│            │                        │
│   ┌────────┴─────────┐             │
│   │  Lab Gateway     │             │
│   │  172.20.0.1      │             │
│   └──────────────────┘             │
│            │                        │
└────────────┼────────────────────────┘
             │
    ┌────────┴─────────┐
    │  Management PC   │
    │  VPN Access Only │
    └──────────────────┘
```

### Access Control Matrix

| Role | Access Level | Allowed Actions |
|------|--------------|-----------------|
| Instructor | Full | Deploy, monitor, reset |
| Student | Limited | Access app, capture flags |
| Admin | System | VM management, backups |

### Monitoring and Logging

```bash
# Monitor Docker logs
docker logs -f sambhav-lab

# Check resource usage
docker stats sambhav-lab

# Export logs
docker logs sambhav-lab > sambhav.log 2>&1
```

### Backup and Recovery

```bash
# Backup database
cp vulnerable_ctf.db vulnerable_ctf.db.backup

# Backup uploads
tar -czf uploads-backup.tar.gz uploads/

# Full container backup
docker commit sambhav-lab sambhav-backup:$(date +%Y%m%d)

# Restore from backup
docker run -d --name sambhav-lab sambhav-backup:20240101
```

### Lab Reset Procedures

```bash
# Stop and remove container
docker-compose down

# Remove database and uploads
rm -f vulnerable_ctf.db
rm -rf uploads/*

# Restart fresh
docker-compose up -d

# Verify clean state
curl http://localhost:5000/
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000  # Linux/Mac
netstat -ano | findstr :5000  # Windows

# Kill the process or use different port
PORT=5001 npm start
```

### Database Locked

```bash
# Stop application
docker-compose down

# Remove lock file
rm vulnerable_ctf.db-journal

# Restart
docker-compose up -d
```

### Container Won't Start

```bash
# Check logs
docker logs sambhav-lab

# Check disk space
df -h

# Rebuild image
docker-compose build --no-cache
docker-compose up -d
```

### Performance Issues

```bash
# Increase container resources
docker update sambhav-lab --memory="1g" --cpus="2"

# Or modify docker-compose.yml
services:
  sambhav-ctf:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
```

---

## Training Lab Setup

### Multi-User Lab Environment

For training multiple users simultaneously:

```bash
# Run multiple instances on different ports
for i in {1..10}; do
  docker run -d \
    --name sambhav-user-$i \
    -p $((5000 + $i)):5000 \
    sambhav-ctf
done

# Users access:
# User 1: http://lab-server:5001
# User 2: http://lab-server:5002
# etc.
```

### Automated Lab Reset

Create a cron job to reset labs daily:

```bash
# crontab -e
0 0 * * * /path/to/reset-labs.sh
```

`reset-labs.sh`:
```bash
#!/bin/bash
cd /path/to/sambhav/sambhav
docker-compose down
rm -f vulnerable_ctf.db
rm -rf uploads/*
docker-compose up -d
echo "Lab reset completed at $(date)" >> /var/log/sambhav-reset.log
```

---

## Support

For deployment issues:
- Check [GitHub Issues](https://github.com/amansky404/sambhav/issues)
- Review application logs
- Verify network isolation
- Ensure proper permissions

**Remember:** This is an intentionally vulnerable application. Never expose it to untrusted networks or the public internet.
