#!/bin/bash
export SUPABASE_URL=http://127.0.0.1:8000
export SUPABASE_SERVICE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njc4ODA4NDIsImV4cCI6MjA4MzQ1Njg0Mn0.YtOIkJv3hhm449ca9MjhW9Aay5Eii37ziNYo3e8VOqY'
export NODE_PATH=/opt/globalbanka/node_modules
cd /opt/globalbanka
/usr/bin/node update-exchange-rate.js

# Clear Next.js fetch cache so new prices show immediately
rm -rf /opt/globalbanka/.next/standalone/.next/cache/fetch-cache/
/usr/bin/pm2 restart globalbanka --silent 2>/dev/null || true
