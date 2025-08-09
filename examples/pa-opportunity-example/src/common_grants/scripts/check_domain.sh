#!/bin/bash

if grep -q 'ORGANIZATION_DOMAIN = "example.com"' src/common_grants/constants.py; then
    echo "WARNING: ORGANIZATION_DOMAIN is set to 'example.com'"
    echo "   Please edit the value in src/common_grants/constants.py"
    exit 0
fi 
