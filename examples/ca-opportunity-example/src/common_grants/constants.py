"""Constants shared across the CommonGrants CA API example."""

import uuid

# California Grants Portal domain
ORGANIZATION_DOMAIN = "data.ca.gov"

# Generate namespace UUID from the CA Grants Portal domain
# This ensures consistent ID generation across the application
CA_OPPORTUNITY_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_DNS, ORGANIZATION_DOMAIN)
