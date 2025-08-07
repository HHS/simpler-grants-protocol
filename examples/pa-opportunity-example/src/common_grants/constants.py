"""Constants shared across the CommonGrants PA API example."""

import uuid

# Pennsylvania Grants API domain
PA_GRANTS_DOMAIN = "egrants-apibeta.azurewebsites.net"

# Generate namespace UUID from the PA Grants API domain
# This ensures consistent ID generation across the application
PA_OPPORTUNITY_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_DNS, PA_GRANTS_DOMAIN)
