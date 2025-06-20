# Institutional Setup Guide

This guide helps IT departments and research groups set up the Medical Ontology MCP Server for their institution.

## Overview

The Medical Ontology MCP Server can be deployed in various configurations to meet institutional needs:

1. **Department Server** - Shared server for a research department
2. **HPC Cluster** - High-performance computing environment
3. **Cloud Platform** - AWS, Azure, or Google Cloud
4. **Container Platform** - Kubernetes or OpenShift

## Prerequisites

- Linux server (Ubuntu 20.04+ or RHEL 8+ recommended)
- 16GB RAM minimum (32GB+ for production)
- 50GB storage for ontology data and indices
- Network access for users
- Valid licenses for medical ontologies (UMLS, LOINC, etc.)

## Option 1: Department Server Setup

### Step 1: System Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3.9 python3.9-venv python3-pip git nginx

# Create service user
sudo useradd -r -s /bin/false mcp-service

# Create application directory
sudo mkdir -p /opt/medical-ontology-mcp
sudo chown mcp-service:mcp-service /opt/medical-ontology-mcp
```

### Step 2: Install Application

```bash
# Clone repository
cd /opt
sudo -u mcp-service git clone https://github.com/yourinstitution/medical-ontology-mcp.git

# Create virtual environment
cd medical-ontology-mcp
sudo -u mcp-service python3.9 -m venv venv

# Install dependencies
sudo -u mcp-service ./venv/bin/pip install -r requirements.txt
```

### Step 3: Configure Data Access

```bash
# Create data directory
sudo mkdir -p /data/medical-ontologies
sudo chown mcp-service:mcp-service /data/medical-ontologies

# Copy ontology files (adjust paths as needed)
sudo cp -r /path/to/ontology/files/* /data/medical-ontologies/

# Update configuration
sudo -u mcp-service cp config/config.example.yaml config/config.yaml
sudo -u mcp-service nano config/config.yaml
```

### Step 4: Create Systemd Service

```bash
# Create service file
sudo tee /etc/systemd/system/medical-mcp.service << EOF
[Unit]
Description=Medical Ontology MCP Server
After=network.target

[Service]
Type=simple
User=mcp-service
Group=mcp-service
WorkingDirectory=/opt/medical-ontology-mcp
Environment="PATH=/opt/medical-ontology-mcp/venv/bin"
ExecStart=/opt/medical-ontology-mcp/venv/bin/python src/server.py
Restart=always
RestartSec=10
StandardOutput=append:/var/log/medical-mcp/server.log
StandardError=append:/var/log/medical-mcp/error.log

[Install]
WantedBy=multi-user.target
EOF

# Create log directory
sudo mkdir -p /var/log/medical-mcp
sudo chown mcp-service:mcp-service /var/log/medical-mcp

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable medical-mcp
sudo systemctl start medical-mcp
```

### Step 5: Configure Nginx Reverse Proxy

```bash
# Create nginx configuration
sudo tee /etc/nginx/sites-available/medical-mcp << 'EOF'
server {
    listen 80;
    server_name mcp.department.university.edu;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mcp.department.university.edu;
    
    # SSL configuration
    ssl_certificate /etc/ssl/certs/department.crt;
    ssl_certificate_key /etc/ssl/private/department.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Proxy settings
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running requests
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8080/health;
        access_log off;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/medical-mcp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Option 2: HPC Cluster Setup

### SLURM Job Script

```bash
#!/bin/bash
#SBATCH --job-name=medical-mcp
#SBATCH --partition=compute
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=8
#SBATCH --mem=32G
#SBATCH --time=24:00:00
#SBATCH --output=medical-mcp-%j.out
#SBATCH --error=medical-mcp-%j.err

# Load modules
module load python/3.9
module load singularity/3.8

# Set variables
export MCP_PORT=8080
export MCP_DATA_PATH=/shared/medical-ontologies

# Run with Singularity
singularity run \
    --bind /shared/medical-ontologies:/data:ro \
    --bind $PWD/config:/config \
    medical-mcp.sif
```

### Building Singularity Container

```bash
# Create Singularity definition file
cat > medical-mcp.def << 'EOF'
Bootstrap: docker
From: python:3.9-slim

%files
    . /app

%environment
    export PATH=/app/venv/bin:$PATH
    export PYTHONPATH=/app

%post
    cd /app
    python -m venv venv
    ./venv/bin/pip install -r requirements.txt

%runscript
    cd /app
    exec python src/server.py
EOF

# Build container
sudo singularity build medical-mcp.sif medical-mcp.def
```

## Option 3: Cloud Deployment

### AWS EC2 with Auto Scaling

```yaml
# cloudformation-template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Medical Ontology MCP Server

Parameters:
  InstanceType:
    Type: String
    Default: t3.xlarge
    Description: EC2 instance type
  
  DataBucketName:
    Type: String
    Description: S3 bucket containing ontology data

Resources:
  # Launch Template
  LaunchTemplate:
    Type: AWS::EC2::LaunchTemplate
    Properties:
      LaunchTemplateName: medical-mcp-template
      LaunchTemplateData:
        ImageId: ami-0c55b159cbfafe1f0  # Ubuntu 20.04
        InstanceType: !Ref InstanceType
        IamInstanceProfile:
          Arn: !GetAtt InstanceProfile.Arn
        SecurityGroupIds:
          - !Ref SecurityGroup
        UserData:
          Fn::Base64: !Sub |
            #!/bin/bash
            apt update && apt install -y docker.io awscli
            
            # Download ontology data from S3
            aws s3 sync s3://${DataBucketName}/ontologies /data
            
            # Run Docker container
            docker run -d \
              -p 80:8080 \
              -v /data:/data:ro \
              -e MCP_DATA_PATH=/data \
              --restart always \
              medical-mcp:latest
  
  # Auto Scaling Group
  AutoScalingGroup:
    Type: AWS::AutoScaling::AutoScalingGroup
    Properties:
      LaunchTemplate:
        LaunchTemplateId: !Ref LaunchTemplate
        Version: !GetAtt LaunchTemplate.LatestVersionNumber
      MinSize: 1
      MaxSize: 5
      DesiredCapacity: 2
      TargetGroupARNs:
        - !Ref TargetGroup
      HealthCheckType: ELB
      HealthCheckGracePeriod: 300
  
  # Application Load Balancer
  LoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Type: application
      Subnets:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2
      SecurityGroups:
        - !Ref SecurityGroup
  
  # Target Group
  TargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Port: 80
      Protocol: HTTP
      HealthCheckPath: /health
      TargetType: instance
      VpcId: !Ref VPC
```

### Azure Container Instances

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "containerGroupName": {
      "type": "string",
      "defaultValue": "medical-mcp-group"
    },
    "storageAccountName": {
      "type": "string",
      "metadata": {
        "description": "Storage account containing ontology data"
      }
    }
  },
  "resources": [
    {
      "type": "Microsoft.ContainerInstance/containerGroups",
      "apiVersion": "2021-03-01",
      "name": "[parameters('containerGroupName')]",
      "location": "[resourceGroup().location]",
      "properties": {
        "containers": [
          {
            "name": "medical-mcp",
            "properties": {
              "image": "medical-mcp:latest",
              "ports": [
                {
                  "port": 8080,
                  "protocol": "TCP"
                }
              ],
              "resources": {
                "requests": {
                  "cpu": 4,
                  "memoryInGB": 16
                }
              },
              "volumeMounts": [
                {
                  "name": "ontology-data",
                  "mountPath": "/data",
                  "readOnly": true
                }
              ]
            }
          }
        ],
        "osType": "Linux",
        "ipAddress": {
          "type": "Public",
          "ports": [
            {
              "protocol": "TCP",
              "port": 8080
            }
          ],
          "dnsNameLabel": "medical-mcp"
        },
        "volumes": [
          {
            "name": "ontology-data",
            "azureFile": {
              "shareName": "ontologies",
              "storageAccountName": "[parameters('storageAccountName')]",
              "storageAccountKey": "[listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName')), '2019-06-01').keys[0].value]"
            }
          }
        ]
      }
    }
  ]
}
```

## Option 4: Kubernetes Deployment

### Kubernetes Manifests

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: medical-ontology

---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: medical-mcp-config
  namespace: medical-ontology
data:
  config.yaml: |
    server:
      host: "0.0.0.0"
      port: 8080
      log_level: "INFO"
    data_source:
      type: "local"
      local:
        path: "/data"

---
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: medical-mcp
  namespace: medical-ontology
spec:
  replicas: 3
  selector:
    matchLabels:
      app: medical-mcp
  template:
    metadata:
      labels:
        app: medical-mcp
    spec:
      containers:
      - name: medical-mcp
        image: medical-mcp:latest
        ports:
        - containerPort: 8080
        env:
        - name: MCP_CONFIG_PATH
          value: /config/config.yaml
        volumeMounts:
        - name: config
          mountPath: /config
        - name: data
          mountPath: /data
          readOnly: true
        resources:
          requests:
            memory: "8Gi"
            cpu: "2"
          limits:
            memory: "16Gi"
            cpu: "4"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: medical-mcp-config
      - name: data
        persistentVolumeClaim:
          claimName: ontology-data-pvc

---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: medical-mcp-service
  namespace: medical-ontology
spec:
  selector:
    app: medical-mcp
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer

---
# pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ontology-data-pvc
  namespace: medical-ontology
spec:
  accessModes:
  - ReadOnlyMany
  resources:
    requests:
      storage: 100Gi
  storageClassName: standard
```

### Deploy to Kubernetes

```bash
# Create namespace and deploy
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f pvc.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# Check status
kubectl -n medical-ontology get pods
kubectl -n medical-ontology get svc

# View logs
kubectl -n medical-ontology logs -f deployment/medical-mcp
```

## Security Considerations

### Authentication Options

1. **LDAP/AD Integration**
```python
# Add to config.yaml
auth:
  type: "ldap"
  ldap:
    server: "ldap://ad.institution.edu"
    base_dn: "ou=users,dc=institution,dc=edu"
    user_filter: "(uid={username})"
```

2. **OAuth2/SAML**
```yaml
auth:
  type: "oauth2"
  oauth2:
    provider: "institutional_sso"
    client_id: "medical-mcp"
    client_secret: "${OAUTH_CLIENT_SECRET}"
    authorize_url: "https://sso.institution.edu/authorize"
    token_url: "https://sso.institution.edu/token"
```

### Network Security

```bash
# Firewall rules (UFW example)
sudo ufw allow from 10.0.0.0/8 to any port 8080  # Internal network only
sudo ufw allow 443/tcp  # HTTPS
sudo ufw deny 8080/tcp  # Block direct access
```

### Data Encryption

```bash
# Encrypt data at rest
sudo cryptsetup luksFormat /dev/sdb1
sudo cryptsetup open /dev/sdb1 medical-data
sudo mkfs.ext4 /dev/mapper/medical-data
sudo mount /dev/mapper/medical-data /data/medical-ontologies
```

## Monitoring and Maintenance

### Prometheus Metrics

```yaml
# prometheus-config.yaml
scrape_configs:
  - job_name: 'medical-mcp'
    static_configs:
      - targets: ['medical-mcp:8080']
    metrics_path: '/metrics'
```

### Log Aggregation

```bash
# Filebeat configuration
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/medical-mcp/*.log
  fields:
    service: medical-mcp
    environment: production

output.elasticsearch:
  hosts: ["elasticsearch.institution.edu:9200"]
  index: "medical-mcp-%{+yyyy.MM.dd}"
```

### Backup Strategy

```bash
#!/bin/bash
# backup-ontologies.sh

# Variables
BACKUP_DIR="/backup/medical-ontologies"
DATA_DIR="/data/medical-ontologies"
DATE=$(date +%Y%m%d)

# Create backup
tar -czf "${BACKUP_DIR}/ontologies-${DATE}.tar.gz" -C "${DATA_DIR}" .

# Keep only last 30 days
find "${BACKUP_DIR}" -name "ontologies-*.tar.gz" -mtime +30 -delete

# Sync to remote storage
aws s3 sync "${BACKUP_DIR}" s3://backup-bucket/medical-ontologies/
```

## Support and Troubleshooting

### Common Issues

1. **Memory Issues**
   - Increase heap size: `export JAVA_OPTS="-Xmx16g"`
   - Enable swap if needed

2. **Performance Tuning**
   - Adjust worker processes in config
   - Enable caching (Redis recommended)
   - Use SSD storage for indices

3. **Network Timeouts**
   - Increase proxy timeouts
   - Check firewall rules
   - Verify DNS resolution

### Getting Help

- Internal: Contact Research IT at research-it@institution.edu
- GitHub Issues: https://github.com/yourinstitution/medical-ontology-mcp/issues
- Documentation: https://docs.institution.edu/medical-mcp