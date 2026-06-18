#!/bin/bash

# Automated Backend Deployment Script
# This script will set up SSH and push the CORS fix

echo "🚀 Starting automated backend deployment..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Generate SSH key if it doesn't exist
if [ ! -f ~/.ssh/id_ed25519 ]; then
    echo -e "${YELLOW}🔑 Generating SSH key...${NC}"
    ssh-keygen -t ed25519 -C "deploy@bae4u.com" -f ~/.ssh/id_ed25519 -N ""
    eval "$(ssh-agent -s)"
    ssh-add ~/.ssh/id_ed25519
else
    echo -e "${GREEN}✅ SSH key already exists${NC}"
fi

# Step 2: Display the public key for GitHub
echo -e "${YELLOW}📋 Copy this SSH key and add it to GitHub:${NC}"
echo -e "${GREEN}https://github.com/settings/keys${NC}"
echo ""
echo "-----BEGIN SSH KEY-----"
cat ~/.ssh/id_ed25519.pub
echo "-----END SSH KEY-----"
echo ""

# Step 3: Instructions
echo -e "${YELLOW}📋 Steps to complete (one-time setup):${NC}"
echo "1. Click the green link above ↑"
echo "2. Click 'New SSH key'"
echo "3. Title: 'MacBook Deploy'"
echo "4. Paste the key shown above"
echo "5. Click 'Add SSH key'"
echo ""
echo -e "${YELLOW}After adding to GitHub, press ENTER to continue...${NC}"
read

# Step 4: Test SSH connection
echo -e "${YELLOW}🔗 Testing GitHub SSH connection...${NC}"
ssh -T git@github.com

if [ $? -eq 1 ]; then
    echo -e "${GREEN}✅ SSH connection successful!${NC}"
else
    echo -e "${RED}❌ SSH connection failed. Please check the key was added correctly.${NC}"
    exit 1
fi

# Step 5: Change remote to SSH
echo -e "${YELLOW}📝 Updating git remote to use SSH...${NC}"
cd /Users/jalajnagar/Bae4u/Bae4You/backend_repo
git remote set-url origin git@github.com:BlockX-AI/Bae4You.git

# Step 6: Push the CORS fix
echo -e "${YELLOW}🚀 Pushing CORS fix to GitHub...${NC}"
git push origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SUCCESS! CORS fix pushed to GitHub!${NC}"
    echo ""
    echo -e "${GREEN}🎉 Railway will auto-deploy now!${NC}"
    echo -e "Check status at: https://railway.app/dashboard"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Wait 2-3 minutes for Railway deployment"
    echo "2. Run: npm run migrate (in Railway shell)"
    echo "3. Test: curl https://baebackend-production.up.railway.app/health"
else
    echo -e "${RED}❌ Push failed. Please check the error above.${NC}"
    exit 1
fi
