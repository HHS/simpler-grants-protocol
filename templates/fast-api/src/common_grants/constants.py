"""
Constants shared across the CommonGrants API.

This file contains constants that should be customized for your specific implementation.
"""

import uuid

# CUSTOMIZE: Replace with your organization's domain for deterministic UUID generation
ORGANIZATION_DOMAIN = "example.com"

# Generate namespace UUID from your organization's domain
# This ensures consistent ID generation across your application
OPPORTUNITY_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_DNS, ORGANIZATION_DOMAIN)
