#!/bin/bash

# DotPortion Realtime API Deployment Script
# This script deploys the realtime API to AWS Lambda

set -e

echo "🚀 Starting DotPortion Realtime API deployment..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Serverless Framework is installed
if ! command -v serverless &> /dev/null; then
    echo "❌ Serverless Framework is not installed. Please install it first: npm install -g serverless"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "serverless.yml" ]; then
    echo "❌ serverless.yml not found. Please run this script from the dotportion-realtime directory."
    exit 1
fi

# Get deployment stage from command line argument or default to dev
STAGE=${1:-dev}
echo "📋 Deploying to stage: $STAGE"

# Check if required environment variables are set
if [ -z "$AWS_PROFILE" ] && [ -z "$AWS_ACCESS_KEY_ID" ]; then
    echo "⚠️  Warning: AWS_PROFILE or AWS_ACCESS_KEY_ID not set. Make sure you have AWS credentials configured."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Deploy to AWS
echo "🌐 Deploying to AWS Lambda..."
serverless deploy --stage $STAGE --verbose

echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Deployment Summary:"
echo "   Stage: $STAGE"
echo "   Service: dotportion-realtime-api"
echo "   Region: ap-south-1"
echo ""
echo "🔗 Endpoints:"
echo "   HTTP API: Check the output above for the API Gateway URL"
echo "   WebSocket: Check the output above for the WebSocket URL"
echo ""
echo "📝 Next steps:"
echo "   1. Test the API endpoints"
echo "   2. Configure your frontend to use the new endpoints"
echo "   3. Set up monitoring and logging" 